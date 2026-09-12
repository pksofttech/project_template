"""API Endpoints for Access Cards (RFID/Keycards) Management."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Card,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import parse_datetime_bkk, time_now

router = APIRouter(
    prefix="/api/access/card",
    tags=["Access Cards & RFID Tokens"],
)


class CardCreate(BaseModel):
    card_number: str = Field(..., description="Unique card number, e.g. 1001234567")
    card_type: str = Field(default="RFID_125K")  # RFID_125K, MIFARE, UHF, QR_CODE, PIN
    facility_code: str | None = None
    member_id: int | None = None
    pin_code: str | None = None
    status: str = Field(default="active")  # active, blocked, lost, expired
    issue_date: datetime | str | None = None
    expire_date: datetime | str | None = None
    remark: str | None = None


class CardUpdate(BaseModel):
    card_number: str | None = None
    card_type: str | None = None
    facility_code: str | None = None
    member_id: int | None = None
    pin_code: str | None = None
    status: str | None = None
    issue_date: datetime | str | None = None
    expire_date: datetime | str | None = None
    remark: str | None = None


@router.get("/datatable", summary="DataTables Server-side Endpoint for Cards")
async def get_cards_datatable(req_para: Request, db: AsyncDbDep):
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
            Access_Card.card_number.ilike(f"%{search}%"),
            Access_Card.card_type.ilike(f"%{search}%"),
            Access_Card.status.ilike(f"%{search}%"),
            Access_Card.remark.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Card)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Card.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Card)
    if order_expr is None:
        order_expr = Access_Card.id.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_cards_list",
            sheet_title="Access Cards",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/{card_id}", summary="Get card details")
async def get_card(card_id: int, db: AsyncDbDep):
    card = await db.get(Access_Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Access card not found")
    return {"success": True, "data": card}


@router.post("/", summary="Create new access card")
async def create_card(data: CardCreate, db: AsyncDbDep):
    existing = (await db.exec(select(Access_Card).where(Access_Card.card_number == data.card_number))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Card number '{data.card_number}' already exists")

    payload_dict = data.model_dump()
    if isinstance(payload_dict.get("issue_date"), str):
        payload_dict["issue_date"] = parse_datetime_bkk(payload_dict["issue_date"])
    if isinstance(payload_dict.get("expire_date"), str):
        payload_dict["expire_date"] = parse_datetime_bkk(payload_dict["expire_date"])

    new_card = Access_Card(**payload_dict)
    db.add(new_card)
    await db.commit()
    await db.refresh(new_card)
    return {"success": True, "data": new_card, "message": "Card registered successfully"}


@router.put("/{card_id}", summary="Update access card")
async def update_card(card_id: int, data: CardUpdate, db: AsyncDbDep):
    card = await db.get(Access_Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Access card not found")

    update_data = data.model_dump(exclude_unset=True)
    if "card_number" in update_data and update_data["card_number"] and update_data["card_number"] != card.card_number:
        existing = (
            await db.exec(
                select(Access_Card).where(
                    Access_Card.card_number == update_data["card_number"], Access_Card.id != card_id
                )
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Card number '{update_data['card_number']}' already exists")

    if "issue_date" in update_data and isinstance(update_data["issue_date"], str):
        update_data["issue_date"] = parse_datetime_bkk(update_data["issue_date"])
    if "expire_date" in update_data and isinstance(update_data["expire_date"], str):
        update_data["expire_date"] = parse_datetime_bkk(update_data["expire_date"])

    for k, v in update_data.items():
        setattr(card, k, v)

    card.updated_at = time_now()
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return {"success": True, "data": card, "message": "Card updated successfully"}


@router.delete("/{card_id}", summary="Delete access card")
async def delete_card(card_id: int, db: AsyncDbDep):
    card = await db.get(Access_Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Access card not found")

    await db.delete(card)
    await db.commit()
    return {"success": True, "message": f"Card '{card.card_number}' deleted successfully"}
