"""Database Engine and Session Configuration."""

import asyncio
import json
import os
from collections.abc import AsyncGenerator
from typing import Any, Literal

from sqlalchemy import event, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.models import App_Configurations
from app.stdio import print_debug, print_error, print_success

# --------------------------------------------------------
# 🗂️ DATABASE DIRECTORY & URL
# --------------------------------------------------------
DB_DIR = os.getenv("DB_DIR", "./database")
os.makedirs(DB_DIR, exist_ok=True)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DB_DIR}/database.db")

# --------------------------------------------------------
# ⚙️ CREATE ASYNC ENGINE
# --------------------------------------------------------
_DB_TIMEOUT = 30
async_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    connect_args={
        "check_same_thread": False,
        "timeout": _DB_TIMEOUT,
    },
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True,
)


# SQLite PRAGMAS on first connect
@event.listens_for(async_engine.sync_engine, "connect")
def _set_sqlite_pragmas(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL;")
    cur.execute("PRAGMA synchronous=NORMAL;")
    cur.execute("PRAGMA foreign_keys=ON;")
    cur.execute(f"PRAGMA busy_timeout={_DB_TIMEOUT * 1000};")
    cur.execute("PRAGMA cache_size=-20000;")  # 20MB cache
    cur.execute("PRAGMA temp_store=MEMORY;")
    cur.execute("PRAGMA mmap_size=268435456;")
    cur.close()


async def init_sqlite_pragmas():
    """Apply PRAGMA settings on application startup."""
    try:
        async with async_engine.begin() as conn:
            await conn.execute(text("PRAGMA journal_mode=WAL;"))
            await conn.execute(text("PRAGMA synchronous=NORMAL;"))
            await conn.execute(text("PRAGMA foreign_keys=ON;"))
            await conn.execute(text(f"PRAGMA busy_timeout={_DB_TIMEOUT * 1000};"))
            await conn.execute(text("PRAGMA cache_size=-20000;"))
            await conn.execute(text("PRAGMA temp_store=MEMORY;"))
            await conn.execute(text("PRAGMA mmap_size=268435456;"))
            print_debug("🛠️ SQLite PRAGMA initialized with WAL & performance tuning.")
    except SQLAlchemyError as err:
        print_error(f"❌ Failed to apply SQLite PRAGMAs: {err}")


# --------------------------------------------------------
# 🧩 ASYNC SESSION FACTORY
# --------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing request-scoped async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def with_new_session(coro, *args, **kwargs):
    """Execute coroutine with a dedicated new session."""
    async with AsyncSessionLocal() as session:
        try:
            return await coro(session, *args, **kwargs)
        except Exception:
            await session.rollback()
            raise


# --------------------------------------------------------
# 🧠 MEMORY CACHE SYSTEM FOR CONFIGURATIONS
# --------------------------------------------------------
_CONFIG_CACHE: dict[str, Any] = {}
_CONFIG_DICT_CACHE: dict[str, Any] = {}


async def get_configurations(db: AsyncSession, key: str, as_type: Literal["str", "dict"] = "str") -> Any:
    """Get system configuration with memory cache optimization."""
    if as_type == "dict":
        if key in _CONFIG_DICT_CACHE:
            return _CONFIG_DICT_CACHE[key]
    elif key in _CONFIG_CACHE:
        return _CONFIG_CACHE[key]

    sql = select(App_Configurations.value).where(App_Configurations.key == key)
    value = (await db.exec(sql)).first() or ""
    _CONFIG_CACHE[key] = value

    if as_type == "dict":
        if not value:
            parsed = {}
        else:
            try:
                parsed = json.loads(value)
            except (TypeError, ValueError, json.JSONDecodeError):
                print_error(f"❌ Invalid JSON for config key '{key}'")
                parsed = {}
        _CONFIG_DICT_CACHE[key] = parsed
        return parsed

    return value


async def set_configurations(db: AsyncSession, key: str, value: Any) -> bool:
    """Save or update system configuration in DB and update cache."""
    try:
        if isinstance(value, (dict, list)):
            val_str = json.dumps(value, ensure_ascii=False)
        else:
            val_str = str(value)

        sql = select(App_Configurations).where(App_Configurations.key == key)
        record = (await db.exec(sql)).first()

        if record:
            record.value = val_str
        else:
            record = App_Configurations(key=key, value=val_str)
            db.add(record)

        await db.commit()
        _CONFIG_CACHE[key] = val_str
        if isinstance(value, (dict, list)):
            _CONFIG_DICT_CACHE[key] = value
        elif key in _CONFIG_DICT_CACHE:
            del _CONFIG_DICT_CACHE[key]

        print_success(f"✅ Set & cached config key '{key}'")
        return True
    except SQLAlchemyError as err:
        await db.rollback()
        print_error(f"❌ Failed to set config '{key}': {err}")
        return False
