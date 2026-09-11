"""API Endpoints for Access Zones, Presence Tracking, and Occupancy Management."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Door,
    Access_Member,
    Access_Zone,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import time_now

router = APIRouter(
    prefix="/api/access/zone",
    tags=["Access Zones & Presence Tracking"],
)


class ZoneCreate(BaseModel):
    code: str = Field(..., description="Unique zone identifier, e.g. ZONE-01")
    name: str = Field(..., description="Zone / Area Name")
    zone_type: str = Field(default="INTERNAL", description="OUTSIDE, INTERNAL, HIGH_SECURITY, MUSTER_POINT")
    parent_zone_id: int | None = Field(default=None)
    max_occupancy: int = Field(default=0, description="Max allowed people (0 = unlimited)")
    antipassback_enabled: bool = Field(default=False)
    antipassback_timeout_min: int = Field(default=30)
    status: str = Field(default="active")
    description: str | None = None


class ZoneUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    zone_type: str | None = None
    parent_zone_id: int | None = None
    max_occupancy: int | None = None
    antipassback_enabled: bool | None = None
    antipassback_timeout_min: int | None = None
    status: str | None = None
    description: str | None = None


class ResetApbRequest(BaseModel):
    member_id: int | None = Field(default=None, description="Specific member ID, or None for all")
    target_zone_id: int | None = Field(default=None, description="Target zone to set (defaults to outside)")


@router.get("/datatable", summary="DataTables Server-side Endpoint for Zones")
async def get_zones_datatable(req_para: Request, db: AsyncDbDep):
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
            Access_Zone.code.ilike(f"%{search}%"),
            Access_Zone.name.ilike(f"%{search}%"),
            Access_Zone.zone_type.ilike(f"%{search}%"),
            Access_Zone.description.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Zone)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Zone.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Zone)
    if order_expr is None:
        order_expr = Access_Zone.id.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_zones_list",
            sheet_title="Access Zones",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/list/all", summary="Get all zones for selection dropdowns")
async def get_all_zones(db: AsyncDbDep):
    """Retrieve lightweight list of zones for dropdowns and associations."""
    stmt = select(Access_Zone).order_by(Access_Zone.name)
    zones = (await db.exec(stmt)).all()
    return [
        {
            "id": z.id,
            "code": z.code,
            "name": z.name,
            "zone_type": z.zone_type,
            "max_occupancy": z.max_occupancy,
            "antipassback_enabled": z.antipassback_enabled,
        }
        for z in zones
    ]


@router.get("/presence/summary", summary="Real-time Zone Occupancy & Presence Summary")
async def get_zone_presence_summary(db: AsyncDbDep):
    """
    Get live presence statistics: total inside, count per zone, occupancy capacity,
    and member lists per security zone.
    """
    # 1. Fetch all zones
    zones = (await db.exec(select(Access_Zone).order_by(Access_Zone.id))).all()

    # 2. Fetch all members with their current zone info
    members_stmt = select(Access_Member).where(Access_Member.status == "active")
    members = (await db.exec(members_stmt)).all()

    # Map members by zone
    zone_members_map: dict[int | None, list[dict]] = {}
    total_inside = 0
    total_outside = 0

    for m in members:
        if m.is_inside:
            total_inside += 1
        else:
            total_outside += 1

        zid = m.current_zone_id
        if zid not in zone_members_map:
            zone_members_map[zid] = []

        zone_members_map[zid].append(
            {
                "id": m.id,
                "member_code": m.member_code,
                "name": f"{m.first_name} {m.last_name}".strip(),
                "department": m.department,
                "phone": m.phone,
                "picture_url": m.picture_url,
                "last_access_time": m.last_access_time.strftime("%Y-%m-%d %H:%M:%S") if m.last_access_time else None,
                "last_direction": m.last_direction,
                "is_inside": m.is_inside,
            }
        )

    # 3. Build summary per zone
    zone_stats = []
    for z in zones:
        inside_list = zone_members_map.get(z.id, [])
        curr_count = len(inside_list)
        max_occ = z.max_occupancy or 0
        pct = round((curr_count / max_occ * 100), 1) if max_occ > 0 else 0
        is_full = (max_occ > 0 and curr_count >= max_occ)

        zone_stats.append(
            {
                "id": z.id,
                "code": z.code,
                "name": z.name,
                "zone_type": z.zone_type,
                "max_occupancy": max_occ,
                "current_occupancy": curr_count,
                "occupancy_pct": min(pct, 100.0),
                "is_full": is_full,
                "antipassback_enabled": z.antipassback_enabled,
                "status": z.status,
                "members": inside_list,
            }
        )

    return {
        "success": True,
        "kpi": {
            "total_registered": len(members),
            "total_inside": total_inside,
            "total_outside": total_outside,
            "total_zones": len(zones),
        },
        "zones": zone_stats,
    }


@router.get("/presence/muster_roll_call", summary="Emergency Evacuation Muster Roll Call Report")
async def get_muster_roll_call(db: AsyncDbDep, req_para: Request):
    """
    Emergency Evacuation Roll Call: lists all personnel currently tracked as inside
    the facility, grouped by last known zone. Supports Excel export for safety marshals.
    """
    params = dict(req_para.query_params)
    zones = {z.id: z.name for z in (await db.exec(select(Access_Zone))).all()}

    stmt = (
        select(Access_Member)
        .where(Access_Member.is_inside == True)  # noqa: E712
        .order_by(Access_Member.current_zone_id, Access_Member.first_name)
    )
    inside_members = (await db.exec(stmt)).all()

    roll_call_data = [
        {
            "member_code": m.member_code,
            "full_name": f"{m.first_name} {m.last_name}".strip(),
            "department": m.department,
            "phone": m.phone or "-",
            "zone_location": zones.get(m.current_zone_id, "Unknown Zone"),
            "last_access_time": m.last_access_time.strftime("%Y-%m-%d %H:%M:%S") if m.last_access_time else "-",
            "evacuation_status": "PENDING_VERIFICATION",
        }
        for m in inside_members
    ]

    if params.get("export"):
        return await export_excel_response(
            roll_call_data,
            filename_prefix="emergency_muster_roll_call",
            sheet_title="Emergency Evacuation List",
            export_type=params.get("export", "excel"),
        )

    return {
        "success": True,
        "total_inside": len(inside_members),
        "data": roll_call_data,
    }


@router.get("/{id}/members", summary="Get members in a specific zone")
async def get_zone_members(id: int, db: AsyncDbDep):
    """List all personnel currently residing inside the specified zone."""
    zone = await db.get(Access_Zone, id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    stmt = (
        select(Access_Member)
        .where(Access_Member.current_zone_id == id)
        .order_by(Access_Member.first_name)
    )
    members = (await db.exec(stmt)).all()

    return {
        "zone_id": zone.id,
        "zone_name": zone.name,
        "total": len(members),
        "members": [
            {
                "id": m.id,
                "member_code": m.member_code,
                "name": f"{m.first_name} {m.last_name}".strip(),
                "department": m.department,
                "phone": m.phone,
                "last_access_time": m.last_access_time.strftime("%Y-%m-%d %H:%M:%S") if m.last_access_time else None,
            }
            for m in members
        ],
    }


@router.post("/presence/reset_apb", summary="Reset Anti-Passback Status")
async def reset_apb_status(payload: ResetApbRequest, db: AsyncDbDep):
    """
    Operator tool to reset Anti-Passback state for a single cardholder or all cardholders.
    Moves them to an outside zone or clears their inside state.
    """
    outside_zone = (
        await db.exec(select(Access_Zone).where(Access_Zone.zone_type == "OUTSIDE"))
    ).first()
    target_zone_id = payload.target_zone_id or (outside_zone.id if outside_zone else None)

    if payload.member_id:
        member = await db.get(Access_Member, payload.member_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        member.current_zone_id = target_zone_id
        member.is_inside = False
        member.last_direction = "OUT"
        member.last_access_time = time_now()
        db.add(member)
        count = 1
    else:
        stmt = select(Access_Member)
        all_members = (await db.exec(stmt)).all()
        for m in all_members:
            m.current_zone_id = target_zone_id
            m.is_inside = False
            m.last_direction = "OUT"
            m.last_access_time = time_now()
            db.add(m)
        count = len(all_members)

    await db.commit()
    return {"success": True, "message": f"Reset APB status for {count} member(s)"}


@router.post("", summary="Create Access Zone")
async def create_zone(payload: ZoneCreate, db: AsyncDbDep):
    """Create a new access zone or security area."""
    existing = (await db.exec(select(Access_Zone).where(Access_Zone.code == payload.code))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Zone code '{payload.code}' already exists")

    zone = Access_Zone(**payload.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return {"success": True, "id": zone.id, "message": "Zone created successfully"}


@router.put("/{id}", summary="Update Access Zone")
async def update_zone(id: int, payload: ZoneUpdate, db: AsyncDbDep):
    """Update existing access zone details."""
    zone = await db.get(Access_Zone, id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(zone, field, val)

    zone.updated_at = time_now()
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return {"success": True, "id": zone.id, "message": "Zone updated successfully"}


@router.delete("/{id}", summary="Delete Access Zone")
async def delete_zone(id: int, db: AsyncDbDep):
    """Delete an access zone if no doors or members are tied to it."""
    zone = await db.get(Access_Zone, id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Check if doors are tied to this zone
    doors_stmt = select(Access_Door).where(
        or_(Access_Door.from_zone_id == id, Access_Door.to_zone_id == id)
    )
    door_refs = (await db.exec(doors_stmt)).first()
    if door_refs:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete zone '{zone.name}': Connected to door '{door_refs.name}'",
        )

    await db.delete(zone)
    await db.commit()
    return {"success": True, "message": "Zone deleted successfully"}
