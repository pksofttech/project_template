"""API Endpoints for Access Devices (Readers, Terminals, Keypads, Face Kiosks)."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Device,
    Access_Door,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import time_now

router = APIRouter(
    prefix="/api/access/device",
    tags=["Access Devices (Readers & Terminals)"],
)


class DeviceCreate(BaseModel):
    code: str = Field(..., description="Unique device code, e.g. DEV-RDR-01")
    name: str = Field(..., description="Descriptive device name")
    door_id: int = Field(..., description="Associated Door / Barrier Gate ID")
    device_category: str = Field(default="READER")  # READER, TERMINAL, CONTROLLER, CAMERA_AI, KIOSK
    direction: str = Field(default="IN")  # IN, OUT, BOTH
    supported_factors: str = Field(default='["CARD"]')  # JSON list
    ip_address: str | None = None
    mac_address: str | None = None
    device_token: str | None = None
    brand: str | None = None
    model_name: str | None = None
    status: str = Field(default="ONLINE")  # ONLINE, OFFLINE, MAINTENANCE, DISABLED
    description: str | None = None


class DeviceUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    door_id: int | None = None
    device_category: str | None = None
    direction: str | None = None
    supported_factors: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    device_token: str | None = None
    brand: str | None = None
    model_name: str | None = None
    status: str | None = None
    description: str | None = None


@router.get("/datatable", summary="DataTables Server-side Endpoint for Access Devices")
async def get_devices_datatable(req_para: Request, db: AsyncDbDep):
    """Server-side DataTables pagination, search, ordering, and Excel export for Access Devices."""
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    # 1. Search Condition
    search_cond = literal(True)
    if search:
        search_cond = or_(
            Access_Device.code.ilike(f"%{search}%"),
            Access_Device.name.ilike(f"%{search}%"),
            Access_Device.device_category.ilike(f"%{search}%"),
            Access_Device.ip_address.ilike(f"%{search}%"),
            Access_Device.brand.ilike(f"%{search}%"),
            Access_Door.name.ilike(f"%{search}%"),
            Access_Door.code.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Device)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Device.__table__.c]
    base_stmt = (
        select(
            *select_stmt,
            Access_Door.name.label("door_name"),
            Access_Door.code.label("door_code"),
        )
        .outerjoin(Access_Door, Access_Device.door_id == Access_Door.id)
        .where(search_cond)
    )

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Device)
    if order_expr is None:
        order_expr = Access_Device.id.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_devices_list",
            sheet_title="Access Devices",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/list", summary="List Devices for Dropdowns")
async def list_devices(db: AsyncDbDep, door_id: int | None = None):
    """Retrieve lightweight list of devices, optionally filtered by door_id."""
    stmt = select(Access_Device)
    if door_id is not None:
        stmt = stmt.where(Access_Device.door_id == door_id)
    devices = (await db.exec(stmt.order_by(Access_Device.name))).all()
    return [
        {
            "id": d.id,
            "code": d.code,
            "name": d.name,
            "door_id": d.door_id,
            "category": d.device_category,
            "direction": d.direction,
            "status": d.status,
        }
        for d in devices
    ]


@router.get("/{device_id}", summary="Get Single Device Details")
async def get_device(device_id: int, db: AsyncDbDep):
    """Retrieve details for a specific device by ID."""
    device = await db.get(Access_Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    door = await db.get(Access_Door, device.door_id)
    data = device.model_dump()
    data["door_name"] = door.name if door else "-"
    data["door_code"] = door.code if door else "-"
    return data


@router.post("/", summary="Create Access Device")
async def create_device(payload: DeviceCreate, db: AsyncDbDep):
    """Register a new Access Device associated with a physical Door or Gate."""
    # Validate door exists
    door = await db.get(Access_Door, payload.door_id)
    if not door:
        raise HTTPException(status_code=400, detail=f"Target Door ID {payload.door_id} does not exist")

    # Check unique code
    existing = (await db.exec(select(Access_Device).where(Access_Device.code == payload.code.strip()))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Device code '{payload.code}' already exists")

    new_device = Access_Device(
        code=payload.code.strip(),
        name=payload.name.strip(),
        door_id=payload.door_id,
        device_category=payload.device_category,
        direction=payload.direction,
        supported_factors=payload.supported_factors or '["CARD"]',
        ip_address=payload.ip_address.strip() if payload.ip_address else None,
        mac_address=payload.mac_address.strip() if payload.mac_address else None,
        device_token=payload.device_token.strip() if payload.device_token else None,
        brand=payload.brand.strip() if payload.brand else None,
        model_name=payload.model_name.strip() if payload.model_name else None,
        status=payload.status,
        last_heartbeat=time_now(),
        description=payload.description,
    )
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)
    return {"success": True, "message": f"Device '{new_device.name}' created successfully", "device": new_device}


@router.put("/{device_id}", summary="Update Access Device")
async def update_device(device_id: int, payload: DeviceUpdate, db: AsyncDbDep):
    """Update properties of an existing Access Device."""
    device = await db.get(Access_Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    if payload.door_id is not None:
        door = await db.get(Access_Door, payload.door_id)
        if not door:
            raise HTTPException(status_code=400, detail=f"Target Door ID {payload.door_id} does not exist")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    device.updated_at = time_now()
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return {"success": True, "message": f"Device '{device.name}' updated successfully", "device": device}


@router.delete("/{device_id}", summary="Delete Access Device")
async def delete_device(device_id: int, db: AsyncDbDep):
    """Remove an Access Device from the system."""
    device = await db.get(Access_Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")

    await db.delete(device)
    await db.commit()
    return {"success": True, "message": f"Device '{device.name}' deleted successfully"}


@router.post("/{device_id}/ping", summary="Device Heartbeat Ping")
async def device_heartbeat_ping(device_id: int, db: AsyncDbDep):
    """Hardware heartbeat endpoint to mark device ONLINE and update last_heartbeat timestamp."""
    device = await db.get(Access_Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.last_heartbeat = time_now()
    device.status = "ONLINE"
    db.add(device)
    await db.commit()
    return {"success": True, "status": "ONLINE", "server_time": time_now().isoformat()}
