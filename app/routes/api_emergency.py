"""Emergency Management & Life Safety API Router (Fire Alarm & Global Lockdown).

Provides endpoints for:
1. Fire Alarm Evacuation Mode (Unlocks all fail-safe doors for free egress).
2. Global Lockdown Mode (Secures all perimeter and interior doors against active threats).
3. Reset to Normal Operation (Restores scheduled access control policies).
4. Real-time status reporting and audit logging.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlmodel import select

from app.core.auth import decode_access_token
from app.core.database import get_configurations, set_configurations
from app.core.dependencies import AsyncDbDep
from app.core.models import Access_Door, Access_Log
from app.core.utility import broadcast_sse
from app.stdio import print_success, print_warning, time_now

router = APIRouter(
    prefix="/api/access/emergency",
    tags=["Emergency Management & Life Safety"],
)


class EmergencyTriggerRequest(BaseModel):
    """Schema for triggering emergency procedures."""

    reason: str = Field(default="", description="Reason or incident narrative")
    source: str = Field(default="MANUAL_WEB", description="Trigger source: MANUAL_WEB, FACP_WEBHOOK, PANIC_BUTTON, API")
    affected_zones: str = Field(default="ALL", description="'ALL' or JSON list of zone IDs")


def _get_operator_name(request: Request) -> str:
    """Extract operator username from cookies or Authorization header."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return payload.get("username") or payload.get("sub") or "Administrator"
    return "FACP / System Operator"


@router.get("/status", summary="Get Current Emergency System State")
async def get_emergency_status(db: AsyncDbDep):
    """
    Returns the active emergency operational state:
    - NORMAL: Normal access rules and schedules apply.
    - FIRE_ALARM: Fire alarm active, doors unlocked for evacuation.
    - GLOBAL_LOCKDOWN: Active threat lockdown, doors secured.
    """
    mode = await get_configurations(db, "emergency_mode") or "NORMAL"
    triggered_at = await get_configurations(db, "emergency_triggered_at") or None
    triggered_by = await get_configurations(db, "emergency_triggered_by") or None
    reason = await get_configurations(db, "emergency_reason") or ""
    source = await get_configurations(db, "emergency_source") or ""

    # Count total doors
    doors_stmt = select(Access_Door)
    doors = (await db.exec(doors_stmt)).all()
    total_doors = len(doors)

    return {
        "status": "success",
        "mode": mode,
        "is_emergency": mode in ("FIRE_ALARM", "GLOBAL_LOCKDOWN"),
        "triggered_at": triggered_at,
        "triggered_by": triggered_by,
        "reason": reason,
        "source": source,
        "total_doors": total_doors,
        "server_time": time_now().isoformat(),
    }


@router.post("/fire-alarm", summary="Trigger Fire Alarm Evacuation Mode (Unlock All Doors)")
async def trigger_fire_alarm(
    payload: EmergencyTriggerRequest,
    request: Request,
    db: AsyncDbDep,
):
    """
    Activates Fire Alarm Evacuation Mode (Life Safety Protocol).
    - Unlocks all fail-safe doors immediately for free exit.
    - Suspends normal access restrictions.
    - Broadcasts high-priority SSE emergency alert.
    - Writes an immutable audit trail record to Access_Log.
    """
    operator = _get_operator_name(request)
    now = time_now()
    now_iso = now.isoformat()
    reason = payload.reason.strip() or "Fire Alarm Evacuation Triggered - Immediate Free Egress Activated"

    # 1. Update Persistent Configuration
    await set_configurations(db, "emergency_mode", "FIRE_ALARM")
    await set_configurations(db, "emergency_triggered_at", now_iso)
    await set_configurations(db, "emergency_triggered_by", operator)
    await set_configurations(db, "emergency_reason", reason)
    await set_configurations(db, "emergency_source", payload.source)

    # 2. Query doors
    doors = (await db.exec(select(Access_Door))).all()
    doors_count = len(doors)

    # 3. Create Audit Log in Access_Log
    emergency_log = Access_Log(
        event_time=now,
        card_number="EMERGENCY-FIRE",
        member_id=None,
        member_name=f"FIRE ALARM ({operator})",
        department="Life Safety & Evacuation",
        door_id=None,
        door_name=f"ALL DOORS ({doors_count} Points)",
        direction="BOTH",
        result="GRANTED",
        reason=f"FIRE ALARM EVACUATION: {reason}",
        event_type="FIRE_ALARM",
        credential_type="MANUAL",
        credential_identifier=payload.source,
    )
    db.add(emergency_log)
    await db.commit()

    # 4. Broadcast Real-time High-Priority SSE Event
    broadcast_data = {
        "mode": "FIRE_ALARM",
        "title": "FIRE ALARM EVACUATION",
        "reason": reason,
        "source": payload.source,
        "triggered_by": operator,
        "triggered_at": now_iso,
        "affected_doors": doors_count,
        "action": "ALL_DOORS_UNLOCKED",
    }
    broadcast_sse({"event": "emergency_event", "data": broadcast_data})
    broadcast_sse(
        {
            "event": "access_swipe",
            "data": {
                "id": emergency_log.id,
                "event_time": now_iso,
                "member_name": "🚨 FIRE ALARM EVACUATION",
                "department": "Life Safety",
                "door_name": "ALL DOORS UNLOCKED",
                "result": "GRANTED",
                "reason": reason,
                "card_number": "EMERGENCY",
                "credential_type": "FIRE_ALARM",
                "direction": "OUT",
            },
        }
    )

    # 5. Multi-Channel Notification Dispatch
    from app.module.notification_service import notification_service

    notification_service.dispatch_alert_background(
        event_type="FIRE_ALARM",
        title="🔥 FIRE ALARM EVACUATION ACTIVATED",
        message=f"Fire alarm activated by {operator}.\nReason: {reason}\nStatus: All {doors_count} doors unlocked for emergency evacuation.",
        metadata={"operator": operator, "doors_count": doors_count, "source": payload.source},
    )

    print_warning(f"🚨 FIRE ALARM ACTIVATED by {operator}: {reason}")

    return {
        "success": True,
        "mode": "FIRE_ALARM",
        "message": "Fire Alarm Evacuation Mode Activated. All doors unlocked for emergency egress.",
        "triggered_at": now_iso,
        "triggered_by": operator,
        "affected_doors": doors_count,
    }


@router.post("/lockdown", summary="Trigger Global Lockdown Mode (Secure All Doors)")
async def trigger_lockdown(
    payload: EmergencyTriggerRequest,
    request: Request,
    db: AsyncDbDep,
):
    """
    Activates Global Lockdown Mode (Security Threat Protocol).
    - Immediately locks all perimeter, interior, and turnstile doors.
    - Denies access to all regular cardholders.
    - Only designated master security credentials can bypass.
    - Broadcasts high-priority SSE emergency alert.
    - Writes an immutable audit trail record to Access_Log.
    """
    operator = _get_operator_name(request)
    now = time_now()
    now_iso = now.isoformat()
    reason = payload.reason.strip() or "Active Security Threat - Perimeter & Interior Facility Lockdown"

    # 1. Update Persistent Configuration
    await set_configurations(db, "emergency_mode", "GLOBAL_LOCKDOWN")
    await set_configurations(db, "emergency_triggered_at", now_iso)
    await set_configurations(db, "emergency_triggered_by", operator)
    await set_configurations(db, "emergency_reason", reason)
    await set_configurations(db, "emergency_source", payload.source)

    # 2. Query doors
    doors = (await db.exec(select(Access_Door))).all()
    doors_count = len(doors)

    # 3. Create Audit Log in Access_Log
    lockdown_log = Access_Log(
        event_time=now,
        card_number="EMERGENCY-LOCKDOWN",
        member_id=None,
        member_name=f"LOCKDOWN ({operator})",
        department="Security Command",
        door_id=None,
        door_name=f"ALL DOORS ({doors_count} Points)",
        direction="BOTH",
        result="DENIED",
        reason=f"GLOBAL LOCKDOWN: {reason}",
        event_type="LOCKDOWN",
        credential_type="MANUAL",
        credential_identifier=payload.source,
    )
    db.add(lockdown_log)
    await db.commit()

    # 4. Broadcast Real-time High-Priority SSE Event
    broadcast_data = {
        "mode": "GLOBAL_LOCKDOWN",
        "title": "FACILITY LOCKDOWN",
        "reason": reason,
        "source": payload.source,
        "triggered_by": operator,
        "triggered_at": now_iso,
        "affected_doors": doors_count,
        "action": "ALL_DOORS_LOCKED",
    }
    broadcast_sse({"event": "emergency_event", "data": broadcast_data})
    broadcast_sse(
        {
            "event": "access_swipe",
            "data": {
                "id": lockdown_log.id,
                "event_time": now_iso,
                "member_name": "🔒 GLOBAL FACILITY LOCKDOWN",
                "department": "Security Command",
                "door_name": "ALL DOORS SECURED",
                "result": "DENIED",
                "reason": reason,
                "card_number": "LOCKDOWN",
                "credential_type": "LOCKDOWN",
                "direction": "IN",
            },
        }
    )

    # 5. Multi-Channel Notification Dispatch
    from app.module.notification_service import notification_service

    notification_service.dispatch_alert_background(
        event_type="LOCKDOWN",
        title="🔒 GLOBAL LOCKDOWN ACTIVATED",
        message=f"Facility lockdown activated by {operator}.\nReason: {reason}\nStatus: All {doors_count} doors secured against unauthorized access.",
        metadata={"operator": operator, "doors_count": doors_count, "source": payload.source},
    )

    print_warning(f"🔒 GLOBAL LOCKDOWN ACTIVATED by {operator}: {reason}")

    return {
        "success": True,
        "mode": "GLOBAL_LOCKDOWN",
        "message": "Global Lockdown Activated. All doors secured against unauthorized entry.",
        "triggered_at": now_iso,
        "triggered_by": operator,
        "affected_doors": doors_count,
    }


@router.post("/reset", summary="Reset Emergency Mode to Normal Operation")
async def reset_emergency_mode(
    request: Request,
    db: AsyncDbDep,
):
    """
    Clears active Fire Alarm or Lockdown mode and restores Normal Operation.
    - Restores normal scheduled door rules and cardholder permissions.
    - Writes audit record and broadcasts clear event via SSE.
    """
    operator = _get_operator_name(request)
    previous_mode = await get_configurations(db, "emergency_mode") or "NORMAL"
    now = time_now()
    now_iso = now.isoformat()

    # 1. Update Persistent Configuration
    await set_configurations(db, "emergency_mode", "NORMAL")
    await set_configurations(db, "emergency_triggered_at", "")
    await set_configurations(db, "emergency_triggered_by", "")
    await set_configurations(db, "emergency_reason", "")
    await set_configurations(db, "emergency_source", "")
    await set_configurations(db, "emergency_reset_at", now_iso)
    await set_configurations(db, "emergency_reset_by", operator)

    # 2. Create Audit Log in Access_Log
    reset_log = Access_Log(
        event_time=now,
        card_number="EMERGENCY-RESET",
        member_id=None,
        member_name=f"NORMAL RESTORED ({operator})",
        department="Operations",
        door_id=None,
        door_name="ALL ACCESS POINTS",
        direction="BOTH",
        result="GRANTED",
        reason=f"Emergency mode '{previous_mode}' cleared by {operator}. Normal operation restored.",
        event_type="EMERGENCY_RESET",
        credential_type="MANUAL",
        credential_identifier="MANUAL_RESET",
    )
    db.add(reset_log)
    await db.commit()

    # 3. Broadcast Real-time Clear SSE Event
    broadcast_data = {
        "mode": "NORMAL",
        "previous_mode": previous_mode,
        "title": "NORMAL OPERATION RESTORED",
        "reset_by": operator,
        "reset_at": now_iso,
        "action": "NORMAL_RULES_RESTORED",
    }
    broadcast_sse({"event": "emergency_event", "data": broadcast_data})
    broadcast_sse(
        {
            "event": "access_swipe",
            "data": {
                "id": reset_log.id,
                "event_time": now_iso,
                "member_name": "✅ NORMAL OPERATION RESTORED",
                "department": "Operations",
                "door_name": "ALL ACCESS POINTS",
                "result": "GRANTED",
                "reason": f"Cleared '{previous_mode}' mode",
                "card_number": "NORMAL",
                "credential_type": "RESET",
                "direction": "IN",
            },
        }
    )

    # 4. Multi-Channel Notification Dispatch
    from app.module.notification_service import notification_service

    notification_service.dispatch_alert_background(
        event_type="EMERGENCY_RESET",
        title="✅ EMERGENCY CLEARED - NORMAL OPERATION RESTORED",
        message=f"Emergency mode '{previous_mode}' cleared by {operator}.\nFacility returned to normal access policies.",
        metadata={"operator": operator, "previous_mode": previous_mode},
    )

    print_success(f"✅ EMERGENCY CLEARED by {operator}. Normal mode active.")

    return {
        "success": True,
        "mode": "NORMAL",
        "previous_mode": previous_mode,
        "message": "Emergency mode cleared. System restored to normal operation.",
        "reset_at": now_iso,
        "reset_by": operator,
    }
