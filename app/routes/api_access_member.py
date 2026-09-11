import base64
import json
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Member,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.module.face_service import face_service
from app.stdio import parse_datetime_bkk, time_now

router = APIRouter(
    prefix="/api/access/member",
    tags=["Access Members & Cardholders"],
)


class MemberCreate(BaseModel):
    member_code: str = Field(..., description="Unique member code, e.g. MEM-001")
    first_name: str = Field(..., description="First Name")
    last_name: str = Field(default="", description="Last Name")
    department: str = Field(default="General")
    phone: str = Field(default="")
    email: str = Field(default="")
    picture_url: str = Field(default="")
    access_group_id: int | None = None
    status: str = Field(default="active")
    expire_date: datetime | str | None = None


class MemberUpdate(BaseModel):
    member_code: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    phone: str | None = None
    email: str | None = None
    picture_url: str | None = None
    access_group_id: int | None = None
    status: str | None = None
    expire_date: datetime | str | None = None


@router.get("/datatable", summary="DataTables Server-side Endpoint for Members")
async def get_members_datatable(req_para: Request, db: AsyncDbDep):
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
            Access_Member.member_code.ilike(f"%{search}%"),
            Access_Member.first_name.ilike(f"%{search}%"),
            Access_Member.last_name.ilike(f"%{search}%"),
            Access_Member.department.ilike(f"%{search}%"),
            Access_Member.phone.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Member)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Member.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Member)
    if order_expr is None:
        order_expr = Access_Member.id.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_members_list",
            sheet_title="Cardholders",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/list/all", summary="Get all members for selection")
async def get_all_members_list(db: AsyncDbDep):
    """Fetch list of all active members."""
    stmt = select(Access_Member).order_by(Access_Member.id.asc())
    members = (await db.exec(stmt)).all()
    return {"success": True, "data": members}


@router.get("/{member_id}", summary="Get member details")
async def get_member(member_id: int, db: AsyncDbDep):
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"success": True, "data": member}


@router.post("/", summary="Create new member / cardholder")
async def create_member(data: MemberCreate, db: AsyncDbDep):
    existing = (await db.exec(select(Access_Member).where(Access_Member.member_code == data.member_code))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Member code '{data.member_code}' already exists")

    payload_dict = data.model_dump()
    if isinstance(payload_dict.get("expire_date"), str):
        payload_dict["expire_date"] = parse_datetime_bkk(payload_dict["expire_date"])

    new_member = Access_Member(**payload_dict)
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    return {"success": True, "data": new_member, "message": "Cardholder created successfully"}


@router.put("/{member_id}", summary="Update member / cardholder")
async def update_member(member_id: int, data: MemberUpdate, db: AsyncDbDep):
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    update_data = data.model_dump(exclude_unset=True)
    if "member_code" in update_data and update_data["member_code"] and update_data["member_code"] != member.member_code:
        existing = (
            await db.exec(
                select(Access_Member).where(
                    Access_Member.member_code == update_data["member_code"], Access_Member.id != member_id
                )
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Member code '{update_data['member_code']}' already exists")

    if "expire_date" in update_data and isinstance(update_data["expire_date"], str):
        update_data["expire_date"] = parse_datetime_bkk(update_data["expire_date"])

    for k, v in update_data.items():
        setattr(member, k, v)

    member.updated_at = time_now()
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return {"success": True, "data": member, "message": "Cardholder updated successfully"}


@router.delete("/{member_id}", summary="Delete member")
async def delete_member(member_id: int, db: AsyncDbDep):
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    await db.commit()
    return {"success": True, "message": f"Cardholder '{member.first_name} {member.last_name}' deleted successfully"}


@router.post("/{member_id}/enroll-face", summary="Enroll or update member face biometrics")
async def enroll_member_face_endpoint(
    member_id: int,
    request: Request,
    db: AsyncDbDep,
):
    """Enroll a face photo & 512-dim embedding for cardholder."""
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    content_type = request.headers.get("content-type", "")
    image_bytes = None
    simulate_code = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        upload_file = form.get("image")
        simulate_code = form.get("simulate_code")
        if upload_file and hasattr(upload_file, "read"):
            image_bytes = await upload_file.read()
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        simulate_code = body.get("simulate_code")
        image_base64 = body.get("image_base64")
        if image_base64:
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            try:
                image_bytes = base64.b64decode(image_base64)
            except Exception:
                image_bytes = None

    now = time_now()
    os.makedirs("static/uploads/members", exist_ok=True)

    # Save photo if image bytes provided
    if image_bytes and len(image_bytes) > 0:
        filename = f"member_{member_id}_{int(now.timestamp())}_{uuid.uuid4().hex[:6]}.jpg"
        filepath = os.path.join("static/uploads/members", filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        member.picture_url = f"/static/uploads/members/{filename}"

    # Extract or generate 512-dim embedding
    target_code = simulate_code or member.member_code
    target_embedding, meta = face_service.extract_embedding(
        image_bytes=image_bytes,
        simulate_member_code=target_code,
        noise_level=0.0,
    )

    if target_embedding is not None:
        member.face_embedding = json.dumps([round(float(x), 6) for x in target_embedding])
    else:
        member.face_embedding = face_service.enroll_mock_embedding(target_code)

    member.face_registered_at = now
    member.face_tag = f"{face_service.engine_mode.title()}-ArcFace-512"
    member.updated_at = now

    db.add(member)
    await db.commit()
    await db.refresh(member)

    # Sync in-memory cache
    all_members = (await db.exec(select(Access_Member))).all()
    face_service.sync_cache(all_members)

    return {
        "success": True,
        "message": f"Face biometrics enrolled successfully for {member.first_name}",
        "data": {
            "id": member.id,
            "member_code": member.member_code,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "picture_url": member.picture_url,
            "face_tag": member.face_tag,
            "face_registered_at": member.face_registered_at,
            "engine_mode": face_service.engine_mode,
        },
    }


@router.delete("/{member_id}/remove-face", summary="Delete member face biometrics")
async def remove_member_face_endpoint(member_id: int, db: AsyncDbDep):
    """Remove enrolled face biometric credential from cardholder."""
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.face_embedding = None
    member.face_registered_at = None
    member.face_tag = None
    member.updated_at = time_now()

    db.add(member)
    await db.commit()
    await db.refresh(member)

    # Sync in-memory cache
    all_members = (await db.exec(select(Access_Member))).all()
    face_service.sync_cache(all_members)

    return {
        "success": True,
        "message": f"Face biometric credential removed for {member.first_name}",
    }

