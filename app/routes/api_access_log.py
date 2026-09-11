"""API Endpoints for Access Event Logs, Audit Trails, and Analytics."""

from datetime import datetime
from fastapi import APIRouter, Request
from sqlmodel import func, literal, or_, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Card,
    Access_Door,
    Access_Log,
    Access_Member,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import time_now

router = APIRouter(
    prefix="/api/access/log",
    tags=["Access Logs & Analytics"],
)


@router.get("/datatable", summary="DataTables Server-side Endpoint for Access Logs")
async def get_logs_datatable(req_para: Request, db: AsyncDbDep):
    """Server-side DataTables pagination, search, ordering, multi-filter, and Excel export."""
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    # 1. Search Condition
    search_cond = literal(True)
    if search:
        search_cond = or_(
            Access_Log.card_number.ilike(f"%{search}%"),
            Access_Log.member_name.ilike(f"%{search}%"),
            Access_Log.department.ilike(f"%{search}%"),
            Access_Log.door_name.ilike(f"%{search}%"),
            Access_Log.result.ilike(f"%{search}%"),
            Access_Log.reason.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"], fallback_model=Access_Log)
    if not select_stmt:
        select_stmt = [c.label(c.name) for c in Access_Log.__table__.c]
    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    # Additional custom filters from query parameters
    if params.get("door_id") and params["door_id"].isdigit():
        base_stmt = base_stmt.where(Access_Log.door_id == int(params["door_id"]))
    if params.get("result"):
        base_stmt = base_stmt.where(Access_Log.result == params["result"].upper())
    if params.get("direction"):
        base_stmt = base_stmt.where(Access_Log.direction == params["direction"].upper())

    order_expr = build_order_by_expr(datatable_select["order_by"], fallback_model=Access_Log)
    if order_expr is None:
        # Default sort by event_time desc
        order_expr = Access_Log.event_time.desc()

    # 3. Total & Filtered Record Counts
    total_subq = base_stmt.subquery()
    records_total = (await db.execute(select(func.count()).select_from(total_subq))).scalar_one()
    records_filtered = records_total

    # 4. Handle Export vs JSON Response
    if params.get("export"):
        rows = (await db.execute(base_stmt.order_by(order_expr))).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="access_event_logs",
            sheet_title="Access Logs",
            export_type=params.get("export", "excel"),
        )

    rows = (await db.execute(base_stmt.order_by(order_expr).offset(skip).limit(limit))).mappings().all()
    return {
        "draw": params.get("draw"),
        "recordsTotal": records_total,
        "recordsFiltered": records_filtered,
        "data": rows,
    }


@router.get("/recent", summary="Get recent 10 access logs for live ticker")
async def get_recent_logs(db: AsyncDbDep):
    """Fetch the most recent 10 access logs."""
    stmt = select(Access_Log).order_by(Access_Log.event_time.desc()).limit(10)
    logs = (await db.exec(stmt)).all()
    return {"success": True, "data": logs}


@router.get("/summary_stats", summary="Get dashboard summary KPI counters")
async def get_summary_stats(db: AsyncDbDep):
    """Calculate key performance indicators (KPIs) for Access Control dashboard."""
    now = time_now()
    today_start = now.strftime("%Y-%m-%d")

    # Swipes today
    all_logs = (await db.exec(select(Access_Log))).all()
    today_logs = [l for l in all_logs if str(l.event_time).startswith(today_start)]

    today_total = len(today_logs)
    today_granted = sum(1 for l in today_logs if l.result == "GRANTED")
    today_denied = sum(1 for l in today_logs if l.result != "GRANTED")

    # Online Doors
    doors = (await db.exec(select(Access_Door))).all()
    total_doors = len(doors)
    online_doors = sum(1 for d in doors if d.status.upper() == "ONLINE")

    # Cardholders & Cards
    members = (await db.exec(select(Access_Member))).all()
    total_members = len(members)
    active_members = sum(1 for m in members if m.status.lower() == "active")

    cards = (await db.exec(select(Access_Card))).all()
    total_cards = len(cards)
    active_cards = sum(1 for c in cards if c.status.lower() == "active")

    return {
        "success": True,
        "today_total": today_total,
        "today_granted": today_granted,
        "today_denied": today_denied,
        "total_doors": total_doors,
        "online_doors": online_doors,
        "total_members": total_members,
        "active_members": active_members,
        "total_cards": total_cards,
        "active_cards": active_cards,
    }


@router.get("/chart_stats", summary="Get hourly chart statistics for today")
async def get_chart_stats(db: AsyncDbDep):
    """Hourly breakdown of granted vs denied events for today."""
    now = time_now()
    today_start = now.strftime("%Y-%m-%d")

    all_logs = (await db.exec(select(Access_Log))).all()
    today_logs = [l for l in all_logs if str(l.event_time).startswith(today_start)]

    hours = [f"{h:02d}:00" for h in range(24)]
    granted_counts = [0] * 24
    denied_counts = [0] * 24

    for l in today_logs:
        try:
            if isinstance(l.event_time, datetime):
                h = l.event_time.hour
            else:
                h = int(str(l.event_time)[11:13])
            if 0 <= h < 24:
                if l.result == "GRANTED":
                    granted_counts[h] += 1
                else:
                    denied_counts[h] += 1
        except Exception:
            continue

    return {
        "success": True,
        "labels": hours,
        "granted": granted_counts,
        "denied": denied_counts,
    }
