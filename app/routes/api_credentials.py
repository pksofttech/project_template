"""API Endpoints for Multi-Credential Management (RFID, Mobile BLE/NFC, Fingerprint, Face, PIN)."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.auth import get_password_hash
from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Card,
    Access_Member,
    Member_Face_Credential,
    Member_Fingerprint,
    Member_Mobile_Credential,
    Member_Pin_Credential,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import get_datatable_select
from app.stdio import time_now

router = APIRouter(
    prefix="/api/access/credentials",
    tags=["Access Credentials & Modalities"],
)


# =========================================================================
# 👤 MEMBER ALL-CREDENTIALS OVERVIEW
# =========================================================================


@router.get("/member/{member_id}", summary="Get all credentials assigned to a member")
async def get_member_credentials(member_id: int, db: AsyncDbDep):
    """Retrieve all credentials (RFID, Mobile, Fingerprint, Face, PIN) belonging to a member."""
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # 1. RFID Cards
    rfid_cards = (await db.exec(select(Access_Card).where(Access_Card.member_id == member_id))).all()

    # 2. Mobile Credentials (BLE / NFC)
    mobile_creds = (
        await db.exec(select(Member_Mobile_Credential).where(Member_Mobile_Credential.member_id == member_id))
    ).all()

    # 3. Fingerprint Biometrics
    fingerprints = (await db.exec(select(Member_Fingerprint).where(Member_Fingerprint.member_id == member_id))).all()
    fp_list = [
        {
            "id": fp.id,
            "member_id": fp.member_id,
            "finger_index": fp.finger_index,
            "finger_name": fp.finger_name,
            "algorithm_version": fp.algorithm_version,
            "quality_score": fp.quality_score,
            "status": fp.status,
            "created_at": fp.created_at,
            "updated_at": fp.updated_at,
        }
        for fp in fingerprints
    ]

    # 4. Face Credentials
    faces = (await db.exec(select(Member_Face_Credential).where(Member_Face_Credential.member_id == member_id))).all()
    face_list = [
        {
            "id": f.id,
            "member_id": f.member_id,
            "model_name": f.model_name,
            "pose_angle": f.pose_angle,
            "photo_url": f.photo_url,
            "liveness_score": f.liveness_score,
            "status": f.status,
            "created_at": f.created_at,
            "updated_at": f.updated_at,
        }
        for f in faces
    ]

    # 5. PIN Credentials (Sanitized: hide hash)
    pins = (await db.exec(select(Member_Pin_Credential).where(Member_Pin_Credential.member_id == member_id))).all()
    pin_list = [
        {
            "id": p.id,
            "member_id": p.member_id,
            "pin_type": p.pin_type,
            "failed_attempts": p.failed_attempts,
            "locked_until": p.locked_until,
            "status": p.status,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p in pins
    ]

    return {
        "success": True,
        "member": {
            "id": member.id,
            "member_code": member.member_code,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "status": member.status,
            "picture_url": member.picture_url,
        },
        "credentials": {
            "rfid_cards": rfid_cards,
            "mobile_credentials": mobile_creds,
            "fingerprints": fp_list,
            "face_credentials": face_list,
            "pin_credentials": pin_list,
        },
        "counts": {
            "rfid": len(rfid_cards),
            "mobile": len(mobile_creds),
            "fingerprint": len(fp_list),
            "face": len(face_list),
            "pin": len(pin_list),
        },
    }


# =========================================================================
# 📱 MOBILE CREDENTIALS (BLE / NFC / HCE)
# =========================================================================


class MobileCredCreate(BaseModel):
    member_id: int
    virtual_card_number: str = Field(..., description="Virtual Card Number")
    device_uuid: str = Field(..., description="Device UUID / App Key")
    comm_tech: str = Field(default="BLE")  # BLE, NFC, DYNAMIC_QR
    os_platform: str = Field(default="Android")  # iOS, Android
    device_model: str | None = None
    app_version: str | None = None
    public_key: str | None = None
    status: str = Field(default="active")


class MobileCredUpdate(BaseModel):
    virtual_card_number: str | None = None
    device_uuid: str | None = None
    comm_tech: str | None = None
    os_platform: str | None = None
    device_model: str | None = None
    app_version: str | None = None
    status: str | None = None


@router.get("/mobile/datatable", summary="DataTables for Mobile Credentials")
async def get_mobile_datatable(req_para: Request, db: AsyncDbDep):
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    search_cond = literal(True)
    if search:
        search_cond = or_(
            Member_Mobile_Credential.virtual_card_number.ilike(f"%{search}%"),
            Member_Mobile_Credential.device_uuid.ilike(f"%{search}%"),
            Member_Mobile_Credential.comm_tech.ilike(f"%{search}%"),
            Member_Mobile_Credential.os_platform.ilike(f"%{search}%"),
            Member_Mobile_Credential.status.ilike(f"%{search}%"),
        )

    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Member_Mobile_Credential)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Member_Mobile_Credential.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Member_Mobile_Credential)
    if order_expr is None:
        order_expr = Member_Mobile_Credential.id.desc()

    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_total,
        "data": rows,
    }


@router.post("/mobile", summary="Create Mobile Credential")
async def create_mobile_credential(data: MobileCredCreate, db: AsyncDbDep):
    member = await db.get(Access_Member, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    existing = (
        await db.exec(
            select(Member_Mobile_Credential).where(
                or_(
                    Member_Mobile_Credential.virtual_card_number == data.virtual_card_number,
                    Member_Mobile_Credential.device_uuid == data.device_uuid,
                )
            )
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Virtual card number or Device UUID already registered",
        )

    cred = Member_Mobile_Credential(**data.model_dump())
    cred.last_sync_time = time_now()
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return {
        "success": True,
        "data": cred,
        "message": "Mobile credential paired successfully",
    }


@router.put("/mobile/{cred_id}", summary="Update Mobile Credential")
async def update_mobile_credential(cred_id: int, data: MobileCredUpdate, db: AsyncDbDep):
    cred = await db.get(Member_Mobile_Credential, cred_id)
    if not cred:
        raise HTTPException(status_code=404, detail="Mobile credential not found")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(cred, k, v)
    cred.updated_at = time_now()
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return {
        "success": True,
        "data": cred,
        "message": "Mobile credential updated successfully",
    }


@router.delete("/mobile/{cred_id}", summary="Delete Mobile Credential")
async def delete_mobile_credential(cred_id: int, db: AsyncDbDep):
    cred = await db.get(Member_Mobile_Credential, cred_id)
    if not cred:
        raise HTTPException(status_code=404, detail="Mobile credential not found")

    await db.delete(cred)
    await db.commit()
    return {"success": True, "message": "Mobile credential revoked successfully"}


# =========================================================================
# 👆 FINGERPRINT BIOMETRICS
# =========================================================================


class FingerprintCreate(BaseModel):
    member_id: int
    finger_index: int = Field(default=1, ge=1, le=10)
    finger_name: str = Field(default="Right Index")
    template_data: str = Field(..., description="ISO 19794-2 Base64 Minutiae Template")
    algorithm_version: str = Field(default="ISO_19794_2")
    quality_score: int = Field(default=80, ge=1, le=100)
    status: str = Field(default="active")


@router.get("/fingerprint/datatable", summary="DataTables for Fingerprints")
async def get_fingerprint_datatable(req_para: Request, db: AsyncDbDep):
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    search_cond = literal(True)
    if search:
        search_cond = or_(
            Member_Fingerprint.finger_name.ilike(f"%{search}%"),
            Member_Fingerprint.algorithm_version.ilike(f"%{search}%"),
            Member_Fingerprint.status.ilike(f"%{search}%"),
        )

    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Member_Fingerprint)
    if not select_stmt:
        select_stmt = [
            Member_Fingerprint.id.label("id"),
            Member_Fingerprint.member_id.label("member_id"),
            Member_Fingerprint.finger_index.label("finger_index"),
            Member_Fingerprint.finger_name.label("finger_name"),
            Member_Fingerprint.algorithm_version.label("algorithm_version"),
            Member_Fingerprint.quality_score.label("quality_score"),
            Member_Fingerprint.status.label("status"),
            Member_Fingerprint.created_at.label("created_at"),
            Member_Fingerprint.updated_at.label("updated_at"),
        ]
    base_stmt = select(*select_stmt).where(search_cond)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Member_Fingerprint)
    if order_expr is None:
        order_expr = Member_Fingerprint.id.desc()

    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_total,
        "data": rows,
    }


@router.post("/fingerprint", summary="Enroll Fingerprint")
async def create_fingerprint(data: FingerprintCreate, db: AsyncDbDep):
    member = await db.get(Access_Member, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    fp = Member_Fingerprint(**data.model_dump())
    db.add(fp)
    await db.commit()
    await db.refresh(fp)
    return {
        "success": True,
        "data": {
            "id": fp.id,
            "member_id": fp.member_id,
            "finger_index": fp.finger_index,
            "finger_name": fp.finger_name,
            "quality_score": fp.quality_score,
            "status": fp.status,
        },
        "message": "Fingerprint enrolled successfully",
    }


@router.delete("/fingerprint/{fp_id}", summary="Delete Fingerprint")
async def delete_fingerprint(fp_id: int, db: AsyncDbDep):
    fp = await db.get(Member_Fingerprint, fp_id)
    if not fp:
        raise HTTPException(status_code=404, detail="Fingerprint not found")

    await db.delete(fp)
    await db.commit()
    return {"success": True, "message": "Fingerprint template deleted successfully"}


# =========================================================================
# 👤 FACIAL RECOGNITION CREDENTIALS
# =========================================================================


class FaceCredCreate(BaseModel):
    member_id: int
    embedding_vector: str = Field(..., description="512-dim ArcFace Float Array JSON")
    model_name: str = Field(default="InsightFace-buffalo_s")
    pose_angle: str = Field(default="FRONT")
    photo_url: str | None = None
    liveness_score: float | None = 1.0
    status: str = Field(default="active")


@router.post("/face", summary="Enroll Face Credential Vector")
async def create_face_credential(data: FaceCredCreate, db: AsyncDbDep):
    member = await db.get(Access_Member, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    face = Member_Face_Credential(**data.model_dump())
    db.add(face)
    await db.commit()
    await db.refresh(face)
    return {
        "success": True,
        "data": {
            "id": face.id,
            "member_id": face.member_id,
            "model_name": face.model_name,
            "pose_angle": face.pose_angle,
            "photo_url": face.photo_url,
            "status": face.status,
        },
        "message": "Face credential vector enrolled successfully",
    }


@router.get("/face/datatable", summary="DataTables for Face Credentials")
async def get_face_datatable(req_para: Request, db: AsyncDbDep):
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    search_cond = literal(True)
    if search:
        search_cond = or_(
            Member_Face_Credential.model_name.ilike(f"%{search}%"),
            Member_Face_Credential.pose_angle.ilike(f"%{search}%"),
            Member_Face_Credential.status.ilike(f"%{search}%"),
        )

    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Member_Face_Credential)
    if not select_stmt:
        select_stmt = [
            Member_Face_Credential.id.label("id"),
            Member_Face_Credential.member_id.label("member_id"),
            Member_Face_Credential.model_name.label("model_name"),
            Member_Face_Credential.pose_angle.label("pose_angle"),
            Member_Face_Credential.photo_url.label("photo_url"),
            Member_Face_Credential.liveness_score.label("liveness_score"),
            Member_Face_Credential.status.label("status"),
            Member_Face_Credential.created_at.label("created_at"),
            Member_Face_Credential.updated_at.label("updated_at"),
        ]
    base_stmt = select(*select_stmt).where(search_cond)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Member_Face_Credential)
    if order_expr is None:
        order_expr = Member_Face_Credential.id.desc()

    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_total,
        "data": rows,
    }


@router.delete("/face/{face_id}", summary="Delete Face Credential")
async def delete_face_credential(face_id: int, db: AsyncDbDep):
    face = await db.get(Member_Face_Credential, face_id)
    if not face:
        raise HTTPException(status_code=404, detail="Face credential not found")

    await db.delete(face)
    await db.commit()
    return {"success": True, "message": "Face credential vector removed"}


# =========================================================================
# 🔢 PIN CODE CREDENTIALS
# =========================================================================


class PinCreate(BaseModel):
    member_id: int
    pin_code: str = Field(..., min_length=4, max_length=12, description="Plaintext PIN to hash")
    pin_type: str = Field(default="STANDARD")  # STANDARD, DURESS
    status: str = Field(default="active")


class PinUpdate(BaseModel):
    pin_code: str | None = Field(default=None, min_length=4, max_length=12)
    pin_type: str | None = None
    status: str | None = None


@router.get("/pin/datatable", summary="DataTables for PIN Credentials")
async def get_pin_datatable(req_para: Request, db: AsyncDbDep):
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    search_cond = literal(True)
    if search:
        search_cond = or_(
            Member_Pin_Credential.pin_type.ilike(f"%{search}%"),
            Member_Pin_Credential.status.ilike(f"%{search}%"),
        )

    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Member_Pin_Credential)
    if not select_stmt:
        select_stmt = [
            Member_Pin_Credential.id.label("id"),
            Member_Pin_Credential.member_id.label("member_id"),
            Member_Pin_Credential.pin_type.label("pin_type"),
            Member_Pin_Credential.failed_attempts.label("failed_attempts"),
            Member_Pin_Credential.locked_until.label("locked_until"),
            Member_Pin_Credential.status.label("status"),
            Member_Pin_Credential.created_at.label("created_at"),
            Member_Pin_Credential.updated_at.label("updated_at"),
        ]
    base_stmt = select(*select_stmt).where(search_cond)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Member_Pin_Credential)
    if order_expr is None:
        order_expr = Member_Pin_Credential.id.desc()

    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_total,
        "data": rows,
    }


@router.post("/pin", summary="Set or Create Member PIN")
async def create_pin_credential(data: PinCreate, db: AsyncDbDep):
    member = await db.get(Access_Member, data.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    hashed = get_password_hash(data.pin_code)
    pin_obj = Member_Pin_Credential(
        member_id=data.member_id,
        pin_hash=hashed,
        pin_type=data.pin_type.upper(),
        status=data.status,
    )
    db.add(pin_obj)
    await db.commit()
    await db.refresh(pin_obj)
    return {
        "success": True,
        "data": {
            "id": pin_obj.id,
            "member_id": pin_obj.member_id,
            "pin_type": pin_obj.pin_type,
            "status": pin_obj.status,
        },
        "message": "PIN credential securely registered",
    }


@router.put("/pin/{pin_id}", summary="Update PIN Credential")
async def update_pin_credential(pin_id: int, data: PinUpdate, db: AsyncDbDep):
    pin_obj = await db.get(Member_Pin_Credential, pin_id)
    if not pin_obj:
        raise HTTPException(status_code=404, detail="PIN credential not found")

    if data.pin_code:
        pin_obj.pin_hash = get_password_hash(data.pin_code)
        pin_obj.failed_attempts = 0
        pin_obj.locked_until = None
    if data.pin_type:
        pin_obj.pin_type = data.pin_type.upper()
    if data.status:
        pin_obj.status = data.status

    pin_obj.updated_at = time_now()
    db.add(pin_obj)
    await db.commit()
    await db.refresh(pin_obj)
    return {
        "success": True,
        "data": {
            "id": pin_obj.id,
            "member_id": pin_obj.member_id,
            "pin_type": pin_obj.pin_type,
            "status": pin_obj.status,
        },
        "message": "PIN credential updated successfully",
    }


@router.delete("/pin/{pin_id}", summary="Delete PIN Credential")
async def delete_pin_credential(pin_id: int, db: AsyncDbDep):
    pin_obj = await db.get(Member_Pin_Credential, pin_id)
    if not pin_obj:
        raise HTTPException(status_code=404, detail="PIN credential not found")

    await db.delete(pin_obj)
    await db.commit()
    return {"success": True, "message": "PIN credential revoked successfully"}
