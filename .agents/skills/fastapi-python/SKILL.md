---
name: fastapi-python
description: >-
  Expert in FastAPI Python development for PKS V5 with best practices for APIs, async operations,
  dependencies (AsyncDbDep, JWTDep), DataTables server-side pagination, and SQLModel schemas.
metadata:
  version: 0.115.x
  python_version: 3.12+
---

# FastAPI Python Standards & Architecture (PKS V5)

This skill outlines the architectural standards, dependencies, route conventions, and best practices for developing backend APIs in **PK Management LPR Auto (V5)**.

---

## 🏛️ Centralized Dependency Injection (`app.core.dependencies`)

Always use annotated type dependencies from [`app/core/dependencies.py`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/app/core/dependencies.py):

```python
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.core.dependencies import AsyncDbDep, JWTDep, SystemUserDep, MemberUserDep
from app.core.models import System_Users, Member_User

router = APIRouter(
    prefix="/api/v1/resource-name",
    tags=["Resource Name"],
)
```

| Dependency | Type | Description |
| :--- | :--- | :--- |
| `AsyncDbDep` | `AsyncSession` | Injected async database session with automatic connection release. |
| `JWTDep` | `int` | Authenticated user ID extracted from Bearer JWT token. |
| `SystemUserDep` | `System_Users` | Current logged-in administrative system user model instance. |
| `MemberUserDep` | `Member_User` | Current logged-in portal member user model instance. |

---

## 📊 DataTables Server-Side Pagination & Excel Export

All administrative DataTables endpoints must implement server-side search, multi-column filtering, ordering, and Excel/CSV export via [`app/core/utility.py`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/app/core/utility.py):

```python
from sqlmodel import func, literal, or_, select
from app.core.models import (
    Sys_Resource,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select

@router.get("/datatable", summary="DataTables Server-side Endpoint")
async def get_datatable(req_para: Request, db: AsyncDbDep):
    """DataTables server-side pagination, search, and ordering."""
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    # 1. Search Condition
    search_cond = literal(True)
    if search:
        search_cond = or_(
            Sys_Resource.code.ilike(f"%{search}%"),
            Sys_Resource.name.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"])
    base_stmt = select(*select_stmt).where(search_cond)
    
    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"])

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    recordsTotal = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    recordsFiltered = recordsTotal

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="resource_list",
            sheet_title="Resource Data",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": recordsTotal,
        "recordsFiltered": recordsFiltered,
        "data": rows,
    }
```

---

## 🛠️ CRUD Operations & Pydantic v2 Standards

### 1. Schema Definitions (Pydantic v2)
- Use standard Python type hints (`str | None = None`).
- Use `.model_dump(exclude_unset=True)` for partial updates:

```python
from pydantic import BaseModel

class ResourceCreate(BaseModel):
    code: str
    name_en: str
    name_th: str | None = None
    is_active: bool = True

class ResourceUpdate(BaseModel):
    code: str | None = None
    name_en: str | None = None
    name_th: str | None = None
    is_active: bool | None = None
```

### 2. Standard CRUD Handlers

```python
@router.get("/{item_id}", summary="ดึงข้อมูลรายตัว")
async def get_item(item_id: int, db: AsyncDbDep):
    item = await db.get(Sys_Resource, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"success": True, "data": item}

@router.post("/", summary="เพิ่มข้อมูลใหม่")
async def create_item(data: ResourceCreate, db: AsyncDbDep):
    # Check duplicate
    stmt = select(Sys_Resource).where(Sys_Resource.code == data.code)
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Resource code already exists")

    new_item = Sys_Resource(**data.model_dump())
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return {"success": True, "data": new_item}

@router.put("/{item_id}", summary="แก้ไขข้อมูล")
async def update_item(item_id: int, data: ResourceUpdate, db: AsyncDbDep):
    item = await db.get(Sys_Resource, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = data.model_dump(exclude_unset=True)
    
    # Check duplicate if code is modified
    if "code" in update_data and update_data["code"] and update_data["code"] != item.code:
        stmt = select(Sys_Resource).where(
            Sys_Resource.code == update_data["code"],
            Sys_Resource.id != item_id,
        )
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Resource code already exists")

    for key, value in update_data.items():
        setattr(item, key, value)

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"success": True, "data": item}

@router.delete("/{item_id}", summary="ลบข้อมูล")
async def delete_item(item_id: int, db: AsyncDbDep):
    item = await db.get(Sys_Resource, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Resource not found")

    await db.delete(item)
    await db.commit()
    return {"success": True, "message": "Resource deleted successfully"}
```

---

## 🕒 Stdio & Asia/Bangkok Timezone (`app.stdio`)

Always use custom loggers and timezone functions from [`app/stdio.py`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/app/stdio.py):

```python
from app.stdio import (
    print_debug,
    print_error,
    print_info,
    print_success,
    print_warning,
    time_now,
)

# Current Asia/Bangkok datetime ISO string
current_time = time_now()  # 'YYYY-MM-DDTHH:MM:SS+07:00'

print_success("Operation completed successfully")
print_error(f"Failed to process: {err}")
```

---

## ⚡ Error Handling & Transactions
1. **Safe Rollback**: Always wrap raw database modifications in `try...except` and call `await db.rollback()` before logging or re-raising errors.
2. **Explicit HTTP Status Codes**:
   - `400 Bad Request`: Validation errors, duplicate codes, invalid parameter formats.
   - `401 Unauthorized`: Missing or invalid JWT token / session cookie.
   - `403 Forbidden`: Insufficient role or access permissions.
   - `404 Not Found`: Record does not exist in database.
   - `500 Internal Server Error`: Unexpected unhandled exceptions.
