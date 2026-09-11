"""API Endpoints for Access Doors, Turnstiles, and Barrier Gates Management."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Door,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import time_now

router = APIRouter(
    prefix="/api/access/door",
    tags=["Access Doors & Barrier Gates"],
)


class DoorCreate(BaseModel):
    code: str = Field(..., description="Unique door code, e.g. DOOR-01")
    name: str = Field(..., description="Descriptive name")
    zone: str = Field(default="Main Building")
    door_type: str = Field(default="DOOR")  # DOOR, BARRIER_GATE, TURNSTILE, SLIDING_DOOR
    ip_address: str = Field(default="127.0.0.1")
    controller_type: str = Field(default="REST_WEBHOOK")
    direction: str = Field(default="IN")  # IN, OUT, BOTH
    relay_time_sec: int = Field(default=5)
    status: str = Field(default="ONLINE")  # ONLINE, OFFLINE, DISABLED
    description: str | None = None


class DoorUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    zone: str | None = None
    door_type: str | None = None
    ip_address: str | None = None
    controller_type: str | None = None
    direction: str | None = None
    relay_time_sec: int | None = None
    status: str | None = None
    description: str | None = None


@router.get("/datatable", summary="DataTables Server-side Endpoint for Doors")
async def get_doors_datatable(req_para: Request, db: AsyncDbDep):
    """Server-side DataTables pagination, search, ordering, and Excel export."""
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    # 1. Search Condition
    search_cond = literal(True)
    if search:
        search_cond = or_(
            Access_Door.code.ilike(f"%{search}%"),
            Access_Door.name.ilike(f"%{search}%"),
            Access_Door.zone.ilike(f"%{search}%"),
            Access_Door.door_type.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Door)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Door.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Door)
    if order_expr is None:
        order_expr = Access_Door.id.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_doors_list",
            sheet_title="Access Doors",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/list/all", summary="Get all doors for dropdowns")
async def get_all_doors_list(db: AsyncDbDep):
    """Fetch list of all active doors and gates."""
    stmt = select(Access_Door).order_by(Access_Door.id.asc())
    doors = (await db.exec(stmt)).all()
    return {"success": True, "data": doors}


@router.get("/{door_id}", summary="Get door details by ID")
async def get_door(door_id: int, db: AsyncDbDep):
    door = await db.get(Access_Door, door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")
    return {"success": True, "data": door}


@router.post("/", summary="Create new door / gate")
async def create_door(data: DoorCreate, db: AsyncDbDep):
    # Check duplicate code
    existing = (await db.exec(select(Access_Door).where(Access_Door.code == data.code))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Door code '{data.code}' already exists")

    new_door = Access_Door(**data.model_dump())
    db.add(new_door)
    await db.commit()
    await db.refresh(new_door)
    return {"success": True, "data": new_door, "message": "Door created successfully"}


@router.put("/{door_id}", summary="Update door / gate")
async def update_door(door_id: int, data: DoorUpdate, db: AsyncDbDep):
    door = await db.get(Access_Door, door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")

    update_data = data.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] and update_data["code"] != door.code:
        existing = (
            await db.exec(select(Access_Door).where(Access_Door.code == update_data["code"], Access_Door.id != door_id))
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Door code '{update_data['code']}' already exists")

    for k, v in update_data.items():
        setattr(door, k, v)

    door.updated_at = time_now()
    db.add(door)
    await db.commit()
    await db.refresh(door)
    return {"success": True, "data": door, "message": "Door updated successfully"}


@router.delete("/{door_id}", summary="Delete door / gate")
async def delete_door(door_id: int, db: AsyncDbDep):
    door = await db.get(Access_Door, door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")

    await db.delete(door)
    await db.commit()
    return {"success": True, "message": f"Door '{door.name}' deleted successfully"}
