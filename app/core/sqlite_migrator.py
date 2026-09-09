"""
SQLite Auto-Migration Engine (Refactored Version 2)
- Safe for Production
- Works with sqlite3.Connection only
- Handles ADD COLUMN
- Handles DROP COLUMN via table rebuild
"""

import os
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.schema import CreateTable

from app.stdio import print_debug, print_error, print_success

# --------------------------------------------------------
# CONFIG
# --------------------------------------------------------

MIGRATION_BACKUP_DIR = "./database/migration_backup"
os.makedirs(MIGRATION_BACKUP_DIR, exist_ok=True)


# --------------------------------------------------------
# MAIN ENTRY
# --------------------------------------------------------


async def sync_table_indexes_async(conn: AsyncConnection, table):
    """
    Ensure all indexes defined in SQLModel table metadata exist in SQLite (async).
    """
    table_name = table.name
    for index in table.indexes:
        index_name = index.name
        if not index_name:
            cols_name = "_".join(c.name for c in index.columns)
            index_name = f"ix_{table_name}_{cols_name}"
        columns_sql = ", ".join(f'"{c.name}"' for c in index.columns)
        unique_sql = "UNIQUE " if index.unique else ""
        sql = f'CREATE {unique_sql}INDEX IF NOT EXISTS "{index_name}" ON "{table_name}" ({columns_sql});'
        try:
            await conn.execute(text(sql))
        except Exception as err:  # noqa: BLE001
            print_error(f"      ❌ Failed to ensure index {index_name} on {table_name}: {err}")


async def sqlite_auto_migrate_async(conn: AsyncConnection, table):
    """sqlite_auto_migrate_async with index synchronization"""
    table_name = table.name

    model_columns = set(table.columns.keys())
    existing_columns = await get_existing_columns_async(conn, table_name)

    add_cols = model_columns - existing_columns
    drop_cols = existing_columns - model_columns

    if add_cols or drop_cols:
        print_debug(f"🔧 Migrating table: {table_name}")
        print_debug(f"   ➕ Missing Columns: {add_cols}")
        print_debug(f"   ➖ Extra Columns:   {drop_cols}")

        # ADD COLUMNS
        if add_cols:
            await add_missing_columns_async(conn, table_name, table, add_cols)

        # DROP COLUMNS
        if drop_cols:
            await rebuild_table_to_match_model(conn, table)
    else:
        print_debug(f"   ✔️ {table_name}: Columns up-to-date.")

    # Synchronize table indexes
    await sync_table_indexes_async(conn, table)


async def rebuild_table_to_match_model(conn: AsyncConnection, table):
    """rebuild_table_to_match_model"""
    table_name = table.name
    tmp = f"{table_name}__new"

    existing_cols = await get_existing_columns_async(conn, table_name)
    model_cols = list(table.columns.keys())
    copy_cols = [c for c in model_cols if c in existing_cols]

    await conn.execute(text("PRAGMA foreign_keys=OFF;"))

    # 1) ลบทิ้ง tmp ก่อน กันรอบก่อนค้าง
    await conn.execute(text(f'DROP TABLE IF EXISTS "{tmp}";'))

    # 2) สร้าง DDL ของตารางใหม่ แล้ว “เปลี่ยนชื่อ” ให้เป็น tmp
    ddl = str(CreateTable(table).compile(conn.sync_engine))
    ddl = ddl.replace(f'CREATE TABLE "{table_name}"', f'CREATE TABLE "{tmp}"', 1)
    ddl = ddl.replace(
        f"CREATE TABLE {table_name}", f'CREATE TABLE "{tmp}"', 1
    )  # เผื่อไม่มี quote

    await conn.execute(text(ddl))

    # 3) copy data เฉพาะคอลัมน์ที่มีจริง โดยใส่ COALESCE เผื่อคอลัมน์ NOT NULL ที่ข้อมูลเดิมเป็น NULL
    if copy_cols:
        select_exprs = []
        for c in copy_cols:
            col_obj = table.columns.get(c)
            if col_obj is not None and not col_obj.nullable and not col_obj.primary_key:
                fallback = ""
                if col_obj.default is not None:
                    try:
                        d_val = col_obj.default.arg
                        if callable(d_val):
                            d_val = d_val()
                        default_str = format_sqlite_default(d_val)
                        if default_str.startswith(" DEFAULT "):
                            fallback = default_str[9:].strip()
                    except Exception:
                        fallback = ""

                if not fallback:
                    if any(t in str(col_obj.type).upper() for t in ["INT", "REAL", "FLOAT", "NUMERIC"]):
                        fallback = "1" if "id" in c.lower() else "0"
                    elif any(k in c.lower() for k in ["date", "time"]) or "TIME" in str(col_obj.type).upper():
                        from app.stdio import time_now
                        fallback = f"'{time_now().isoformat()}'"
                    elif any(t in str(col_obj.type).upper() for t in ["BOOL", "BOOLEAN"]):
                        fallback = "1"
                    else:
                        fallback = "''"

                # Check if old table has a legacy column name (e.g. created_at for createDate)
                if c == "createDate" and "created_at" in existing_cols:
                    select_exprs.append(f'COALESCE("{c}", "created_at", {fallback}) AS "{c}"')
                else:
                    select_exprs.append(f'COALESCE("{c}", {fallback}) AS "{c}"')
            else:
                select_exprs.append(f'"{c}"')

        cols_csv = ", ".join([f'"{c}"' for c in copy_cols])
        select_csv = ", ".join(select_exprs)
        await conn.execute(
            text(
                f'INSERT INTO "{tmp}" ({cols_csv}) SELECT {select_csv} FROM "{table_name}";'
            )
        )

    # 4) สลับ
    await conn.execute(text(f'DROP TABLE "{table_name}";'))
    await conn.execute(text(f'ALTER TABLE "{tmp}" RENAME TO "{table_name}";'))

    await conn.execute(text("PRAGMA foreign_keys=ON;"))


# --------------------------------------------------------
# READ EXISTING COLUMNS
# --------------------------------------------------------


async def get_existing_columns_async(
    conn: AsyncConnection, table_name: str
) -> set[str]:
    """
    Return set of column names in SQLite table (async).
    """
    try:
        result = await conn.execute(text(f'PRAGMA table_info("{table_name}")'))
        rows = result.fetchall()
        return {row[1] for row in rows}  # row[1] = column name
    except Exception as err:  # noqa: BLE001
        print_error(f"❌ Failed to read schema for {table_name}: {err}")
        return set()


# --------------------------------------------------------
# ADD MISSING COLUMNS
# --------------------------------------------------------


def normalize_sqlite_type(t: str) -> str:
    """Convert SQLAlchemy type → SQLite-safe type."""
    t = t.upper().strip()

    # Remove VARCHAR(255) → VARCHAR
    if "(" in t:
        t = t.split("(")[0]

    mapping = {
        "VARCHAR": "TEXT",
        "STRING": "TEXT",
        "TEXT": "TEXT",
        "BOOLEAN": "INTEGER",  # SQLite has no BOOLEAN
        "BOOL": "INTEGER",
        "INTEGER": "INTEGER",
        "INT": "INTEGER",
        "BIGINT": "INTEGER",
        "FLOAT": "REAL",
        "REAL": "REAL",
        "DECIMAL": "REAL",
        "NUMERIC": "REAL",
    }

    return mapping.get(t, "TEXT")  # default fallback type


def format_sqlite_default(value):
    """Convert Python default value into valid SQLite DEFAULT clause."""
    if value is None:
        return ""

    if callable(value):
        try:
            value = value()
        except Exception:
            return ""

    if hasattr(value, "isoformat"):
        return f" DEFAULT '{value.isoformat()}'"

    # Boolean → 0/1
    if isinstance(value, bool):
        return f" DEFAULT {1 if value else 0}"

    # String → quoted
    if isinstance(value, str):
        return f" DEFAULT '{value}'"

    # Number → raw
    if isinstance(value, (int, float)):
        return f" DEFAULT {value}"

    # Fallback: skip default
    return ""


async def add_missing_columns_async(
    conn: AsyncConnection, table_name: str, table, columns: Iterable[str]
):
    """
    Add missing SQLite columns with safe type normalization (async).
    """
    print_debug("   ➕ Adding missing columns...")

    for col in columns:
        col_obj = table.columns.get(col)

        # 1) Normalize type
        raw_type = str(col_obj.type)
        col_type = normalize_sqlite_type(raw_type)

        # 2) Normalize default
        default = ""
        if col_obj.default is not None:
            try:
                default_val = col_obj.default.arg
                default = format_sqlite_default(
                    default_val
                )  # ต้องคืนค่าเป็น " DEFAULT ..."
            except Exception:
                default = ""
        if not default and not col_obj.nullable:
            if any(t in col_type for t in ["INT", "REAL", "FLOAT", "NUMERIC"]):
                default = " DEFAULT 1" if "id" in col.lower() else " DEFAULT 0"
            elif any(k in col.lower() for k in ["date", "time"]):
                from app.stdio import time_now
                default = f" DEFAULT '{time_now().isoformat()}'"
            else:
                default = " DEFAULT ''"

        # 3) Build SQL (quote identifiers)
        sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{col}" {col_type}{default}'

        try:
            await conn.execute(text(sql))
            print_success(f"      ✔ Added column: {col} ({col_type})")
        except Exception as err:  # noqa: BLE001
            print_error(f"      ❌ Failed to add column {col}: {err}")


# --------------------------------------------------------
# REBUILD CREATE TABLE STATEMENT
# --------------------------------------------------------
