"""API Endpoints for Access Permission Groups and Time Schedules."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Group,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import time_now

router = APIRouter(
    prefix="/api/access/group",
    tags=["Access Permission Groups"],
)


class GroupCreate(BaseModel):
    code: str = Field(..., description="Unique group code, e.g. GRP-STAFF")
    name: str = Field(..., description="Group descriptive name")
    time_start: str = Field(default="00:00", description="Allowed start time HH:MM")
    time_end: str = Field(default="23:59", description="Allowed end time HH:MM")
    allowed_days: str = Field(default="MON,TUE,WED,THU,FRI,SAT,SUN", description="Comma-separated active days")
    doors_allowed: str = Field(default="*", description="JSON string list of door IDs or '*' for all")
    status: str = Field(default="active")
    description: str | None = None


class GroupUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    time_start: str | None = None
    time_end: str | None = None
    allowed_days: str | None = None
    doors_allowed: str | None = None
    status: str | None = None
    description: str | None = None


@router.get("/datatable", summary="DataTables Server-side Endpoint for Access Groups")
async def get_groups_datatable(req_para: Request, db: AsyncDbDep):
    """DataTables server-side pagination, search, ordering, and Excel export."""
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    # 1. Search Condition
    search_cond = literal(True)
    if search:
        search_cond = or_(
            Access_Group.code.ilike(f"%{search}%"),
            Access_Group.name.ilike(f"%{search}%"),
            Access_Group.description.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Group)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Group.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Group)
    if order_expr is None:
        order_expr = Access_Group.id.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_groups_list",
            sheet_title="Access Groups",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/list/all", summary="Get all access groups for selection")
async def get_all_groups_list(db: AsyncDbDep):
    """Fetch list of all access groups for assignment."""
    stmt = select(Access_Group).order_by(Access_Group.id.asc())
    groups = (await db.exec(stmt)).all()
    return {"success": True, "data": groups}


@router.get("/{group_id}", summary="Get access group details")
async def get_group(group_id: int, db: AsyncDbDep):
    grp = await db.get(Access_Group, group_id)
    if not grp:
        raise HTTPException(status_code=404, detail="Access group not found")
    return {"success": True, "data": grp}


@router.post("/", summary="Create new access group")
async def create_group(data: GroupCreate, db: AsyncDbDep):
    existing = (await db.exec(select(Access_Group).where(Access_Group.code == data.code))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Access group code '{data.code}' already exists")

    new_grp = Access_Group(**data.model_dump())
    db.add(new_grp)
    await db.commit()
    await db.refresh(new_grp)
    return {"success": True, "data": new_grp, "message": "Access group created successfully"}


@router.put("/{group_id}", summary="Update access group")
async def update_group(group_id: int, data: GroupUpdate, db: AsyncDbDep):
    grp = await db.get(Access_Group, group_id)
    if not grp:
        raise HTTPException(status_code=404, detail="Access group not found")

    update_data = data.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] and update_data["code"] != grp.code:
        existing = (
            await db.exec(
                select(Access_Group).where(Access_Group.code == update_data["code"], Access_Group.id != group_id)
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Access group code '{update_data['code']}' already exists")

    for k, v in update_data.items():
        setattr(grp, k, v)

    grp.updated_at = time_now()
    db.add(grp)
    await db.commit()
    await db.refresh(grp)
    return {"success": True, "data": grp, "message": "Access group updated successfully"}


@router.delete("/{group_id}", summary="Delete access group")
async def delete_group(group_id: int, db: AsyncDbDep):
    grp = await db.get(Access_Group, group_id)
    if not grp:
        raise HTTPException(status_code=404, detail="Access group not found")

    await db.delete(grp)
    await db.commit()
    return {"success": True, "message": f"Access group '{grp.name}' deleted successfully"}
