"""API endpoints for card swipe events, access validation, and remote door unlock."""

import json
from datetime import datetime
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Request
from sqlmodel import func, select

from app.core.dependencies import AsyncDbDep
from app.core.models import (
    Access_Card,
    Access_Door,
    Access_Group,
    Access_Log,
    Access_Member,
    Access_Zone,
)
from app.core.utility import broadcast_sse
from app.stdio import print_error, print_info, print_success, time_now

router = APIRouter(
    prefix="/api/access/event",
    tags=["Access Events & Hardware Integration"],
)


class CardSwipeRequest(BaseModel):
    """Schema for card swipe event webhook payload from readers/controllers."""

    card_number: str = Field(..., description="Card RFID / Wiegand Number")
    door_code: str = Field(..., description="Door or Barrier Gate identifier code")
    direction: str = Field(default="IN", description="Direction: IN or OUT")
    reader_id: str | None = Field(default="", description="Optional hardware reader identifier")


class RemoteUnlockRequest(BaseModel):
    """Schema for manual remote unlock trigger."""

    door_id: int
    operator_name: str | None = Field(default="Operator", description="Name of operator triggering the unlock")


@router.post("/swipe", summary="Card Swipe Event Webhook / Ingest Endpoint")
async def handle_card_swipe(payload: CardSwipeRequest, db: AsyncDbDep):
    """
    Ingest card swipe events from external RFID readers, turnstiles, or barrier gates.
    Validates permissions against card status, membership, door permissions, and time profiles.
    Logs event and broadcasts in real-time via Server-Sent Events (SSE).
    """
    now = time_now()
    card_number = (payload.card_number or "").strip()
    door_code = (payload.door_code or "").strip().upper()
    direction = (payload.direction or "IN").upper()
    reader_id = payload.reader_id or ""

    # 1. Lookup Door
    door_stmt = select(Access_Door).where(Access_Door.code == door_code)
    door = (await db.exec(door_stmt)).first()

    if not door:
        # Fallback: try looking up by ID if numeric
        if door_code.isdigit():
            door = await db.get(Access_Door, int(door_code))

    door_id = door.id if door else None
    door_name = door.name if door else f"Unknown Door ({door_code})"

    result = "DENIED"
    reason = "Access Denied"
    member = None
    member_id = None
    member_name = "Unknown Cardholder"
    department = ""
    picture_url = ""

    if not door:
        reason = f"Door not registered: {door_code}"
    elif door.status.upper() != "ONLINE":
        reason = f"Door '{door.name}' is currently {door.status}"
    else:
        # 2. Lookup Card
        card_stmt = select(Access_Card).where(Access_Card.card_number == card_number)
        card = (await db.exec(card_stmt)).first()

        if not card:
            reason = f"Unregistered Card Number: {card_number}"
        elif card.status.lower() != "active":
            reason = f"Card is {card.status.upper()}"
        elif card.expire_date and card.expire_date < now:
            reason = "Card has expired"
        else:
            # 3. Lookup Member
            member = None
            if card.member_id:
                member = await db.get(Access_Member, card.member_id)

            if not member:
                reason = "Card is not assigned to any member"
            elif member.status.lower() != "active":
                member_id = member.id
                member_name = f"{member.first_name} {member.last_name}".strip()
                department = member.department
                picture_url = member.picture_url or ""
                reason = f"Cardholder account is {member.status.upper()}"
            elif member.expire_date and member.expire_date < now:
                member_id = member.id
                member_name = f"{member.first_name} {member.last_name}".strip()
                department = member.department
                picture_url = member.picture_url or ""
                reason = "Cardholder membership has expired"
            else:
                member_id = member.id
                member_name = f"{member.first_name} {member.last_name}".strip()
                department = member.department
                picture_url = member.picture_url or ""

                # 4. Check Access Group & Time Schedule
                if not member.access_group_id:
                    reason = "No access group assigned to cardholder"
                else:
                    access_group = await db.get(Access_Group, member.access_group_id)
                    if not access_group or access_group.status.lower() != "active":
                        reason = "Access group is inactive or disabled"
                    else:
                        # Validate allowed doors
                        allowed_doors_raw = access_group.doors_allowed or "[]"
                        is_door_allowed = False
                        if allowed_doors_raw.strip() == "*":
                            is_door_allowed = True
                        else:
                            try:
                                allowed_doors_list = json.loads(allowed_doors_raw)
                                if (
                                    door.id in allowed_doors_list
                                    or str(door.id) in allowed_doors_list
                                    or door.code in allowed_doors_list
                                ):
                                    is_door_allowed = True
                            except Exception:
                                is_door_allowed = False

                        if not is_door_allowed:
                            reason = f"Door not permitted for group '{access_group.name}'"
                        else:
                            # Validate Day of Week
                            day_map = {0: "MON", 1: "TUE", 2: "WED", 3: "THU", 4: "FRI", 5: "SAT", 6: "SUN"}
                            current_day = day_map[now.weekday()]
                            allowed_days = [d.strip().upper() for d in access_group.allowed_days.split(",")]
                            if current_day not in allowed_days:
                                reason = f"Access restricted on {current_day}"
                            else:
                                # Validate Time window
                                current_hh_mm = now.strftime("%H:%M")
                                if not (access_group.time_start <= current_hh_mm <= access_group.time_end):
                                    reason = f"Access outside schedule ({access_group.time_start} - {access_group.time_end})"
                                else:
                                    # All checks passed!
                                    result = "GRANTED"
                                    reason = f"Access Granted ({access_group.name})"

    # 5. Zone Resolution, Anti-Passback & Occupancy Checks
    from_zone_id = None
    to_zone_id = None
    from_zone_name = ""
    to_zone_name = ""
    target_zone = None

    if door:
        if direction == "IN":
            from_zone_id = door.from_zone_id
            to_zone_id = door.to_zone_id
        else:
            from_zone_id = door.to_zone_id
            to_zone_id = door.from_zone_id

        if from_zone_id:
            from_zone = await db.get(Access_Zone, from_zone_id)
            from_zone_name = from_zone.name if from_zone else ""
        if to_zone_id:
            target_zone = await db.get(Access_Zone, to_zone_id)
            to_zone_name = target_zone.name if target_zone else (door.zone or "")

    if result == "GRANTED" and target_zone and member:
        # 5.1 Anti-Passback (APB) Validation
        if target_zone.antipassback_enabled:
            if direction == "IN" and member.current_zone_id == target_zone.id:
                apb_violation = True
                if target_zone.antipassback_timeout_min and member.last_access_time:
                    diff_min = (now - member.last_access_time).total_seconds() / 60
                    if diff_min >= target_zone.antipassback_timeout_min:
                        apb_violation = False
                if apb_violation:
                    result = "DENIED"
                    reason = f"Anti-Passback Violation: Already inside '{target_zone.name}'"

        # 5.2 Maximum Zone Occupancy Limit Validation
        if result == "GRANTED" and target_zone.max_occupancy > 0 and direction == "IN":
            curr_occ = (
                await db.exec(
                    select(func.count(Access_Member.id)).where(Access_Member.current_zone_id == target_zone.id)
                )
            ).one()
            if curr_occ >= target_zone.max_occupancy:
                result = "DENIED"
                reason = f"Zone Capacity Full ({curr_occ}/{target_zone.max_occupancy} in {target_zone.name})"

    # 6. Update Member Zone Location if Access Granted
    if result == "GRANTED" and member:
        member.current_zone_id = to_zone_id
        member.is_inside = (target_zone is not None and target_zone.zone_type.upper() != "OUTSIDE")
        member.last_access_door_id = door_id
        member.last_access_time = now
        member.last_direction = direction
        db.add(member)

    # 7. Log Access Event to Database
    log_entry = Access_Log(
        event_time=now,
        card_number=card_number,
        member_id=member_id,
        member_name=member_name,
        department=department,
        door_id=door_id,
        door_name=door_name,
        from_zone_id=from_zone_id,
        from_zone_name=from_zone_name,
        to_zone_id=to_zone_id,
        to_zone_name=to_zone_name,
        direction=direction,
        result=result,
        reason=reason,
        event_type="CARD_SWIPE",
        snapshot_url=picture_url,
        reader_id=reader_id,
    )

    try:
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
    except Exception as err:
        await db.rollback()
        print_error(f"Failed to record access log: {err}")

    # 8. Real-time Broadcast via Server-Sent Events (SSE)
    event_payload = {
        "event": "access_swipe",
        "data": {
            "id": log_entry.id,
            "time": now.strftime("%H:%M:%S"),
            "date": now.strftime("%Y-%m-%d"),
            "card_number": card_number,
            "member_id": member_id,
            "member_name": member_name,
            "department": department,
            "door_id": door_id,
            "door_code": door_code,
            "door_name": door_name,
            "from_zone_name": from_zone_name,
            "to_zone_name": to_zone_name,
            "target_zone_id": to_zone_id,
            "is_inside": member.is_inside if member else False,
            "direction": direction,
            "result": result,
            "reason": reason,
            "picture_url": picture_url,
            "unlock_relay": (result == "GRANTED"),
            "relay_time_sec": door.relay_time_sec if door else 5,
        },
    }
    broadcast_sse(event_payload)

    if result == "GRANTED":
        print_success(f"🔓 [ACCESS GRANTED] {member_name} ({card_number}) at {door_name} -> {to_zone_name}")
    else:
        print_info(f"🚫 [ACCESS DENIED] {card_number} at {door_name} - Reason: {reason}")

    return {
        "success": True,
        "granted": (result == "GRANTED"),
        "result": result,
        "reason": reason,
        "member_name": member_name,
        "door_name": door_name,
        "from_zone": from_zone_name,
        "to_zone": to_zone_name,
        "unlock_relay": (result == "GRANTED"),
        "relay_time": door.relay_time_sec if (door and result == "GRANTED") else 0,
        "log_id": log_entry.id,
    }


@router.post("/remote_unlock", summary="Remote Door Unlock Trigger")
async def remote_door_unlock(payload: RemoteUnlockRequest, db: AsyncDbDep):
    """Trigger a remote door unlock command from operator interface."""
    door = await db.get(Access_Door, payload.door_id)
    if not door:
        raise HTTPException(status_code=404, detail="Door not found")

    now = time_now()
    operator = payload.operator_name or "Operator"

    # Log the remote opening event
    log_entry = Access_Log(
        event_time=now,
        card_number="REMOTE_CMD",
        member_name=f"Manual Unlock ({operator})",
        department="Security",
        door_id=door.id,
        door_name=door.name,
        direction=door.direction,
        result="GRANTED",
        reason=f"Remote Unlock triggered by {operator}",
        event_type="REMOTE_OPEN",
    )

    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    # Broadcast unlock to SSE clients
    broadcast_sse(
        {
            "event": "door_unlocked",
            "data": {
                "id": log_entry.id,
                "door_id": door.id,
                "door_code": door.code,
                "door_name": door.name,
                "relay_time_sec": door.relay_time_sec,
                "operator": operator,
                "time": now.strftime("%H:%M:%S"),
            },
        }
    )

    print_success(f"🔓 Remote unlock executed for {door.name} ({door.relay_time_sec}s) by {operator}")

    return {
        "success": True,
        "message": f"Door '{door.name}' unlocked successfully for {door.relay_time_sec} seconds",
        "door_id": door.id,
        "relay_time": door.relay_time_sec,
    }
