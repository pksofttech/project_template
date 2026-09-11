"""API Endpoints for Access Members (Cardholders) Management."""

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
