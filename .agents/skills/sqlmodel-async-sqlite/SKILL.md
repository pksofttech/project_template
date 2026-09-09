---
name: sqlmodel-async-sqlite
description: >-
  Use this skill when working with SQLModel, SQLAlchemy 2.0 Async, aiosqlite, database sessions,
  SQLite PRAGMAs, concurrent transactions, or GMT+7 ISO8601 datetime handling (ISODateTime).
---

# SQLModel & Async SQLite Guidelines (PKS V5)

This skill provides architectural standards and best practices for database management in the **PK Management LPR Auto (V5)** codebase.

---

## 🔑 Key Principles

### 1. Database Connection & Engine Configuration
- Engine is created via `create_async_engine` using `sqlite+aiosqlite:///...`
- **PRAGMAs Applied on Connection**:
  - `PRAGMA journal_mode=WAL;` (Write-Ahead Logging for high concurrency)
  - `PRAGMA synchronous=NORMAL;`
  - `PRAGMA foreign_keys=ON;`
  - `PRAGMA busy_timeout=30000;` (Wait up to 30 seconds before throwing `database is locked`)
  - `PRAGMA cache_size=-20000;` (20MB cache)
  - `PRAGMA temp_store=MEMORY;`

### 2. Timezone-Aware GMT+7 Datetime Handling
- **DO NOT** use naive `datetime.now()` or `datetime.utcnow()`.
- Always use `time_now()` from [`app/stdio.py`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/app/stdio.py) which returns `Asia/Bangkok` timezone-aware datetime objects.
- Store datetimes in SQLModel models using `ISODateTime` custom type decorator or ISO 8601 string format (`...T... +07:00`).
- Parse incoming user/API datetime strings using `parse_datetime_bkk(val)`.

```python
from app.stdio import time_now, parse_datetime_bkk
from app.core.models import ISODateTime
from sqlmodel import Field, SQLModel
from datetime import datetime

class ParkingTransaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    license_plate: str
    entry_time: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
```

---

## 🛡️ Session & Concurrency Management

### 1. Using FastAPI Session Dependency
Always use `get_db` from `app.core.database`:

```python
from app.core.dependencies import AsyncDbDep

@router.get("/items")
async def list_items(db: AsyncDbDep):
    result = await db.exec(select(Sample_Item))
    return result.all()
```

### 2. Handling Writes & Commits
- Always wrap write operations in `async with db.begin():` or explicitly `await db.commit()` and `await db.refresh(obj)`.
- Wrap database operations in `try...except SQLAlchemyError` blocks to roll back transactions safely:

```python
try:
    db.add(new_record)
    await db.commit()
    await db.refresh(new_record)
except SQLAlchemyError as err:
    await db.rollback()
    print_error(f"Failed to insert record: {err}")
    raise HTTPException(status_code=500, detail="Database transaction failed")
```

---

## ⚡ Query Optimization Rules
1. **Async Execution**: Always use `await db.exec(select(...))` instead of the deprecated `db.execute(...)`. `await db.exec()` is the native SQLModel async method that directly returns model instances (`.all()`, `.first()`, `.one()`) without needing `.scalars()`.
2. **Indexing**: Add `index=True` on frequently queried fields like `code`, `name`, `status`, `created_at`.
3. **Avoid DB Lock**: Do not perform long-running network calls inside an active database transaction. Complete external requests first, then open the database session to update status.
