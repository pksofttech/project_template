import base64
import json
import os
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Request
from sqlmodel import func, or_, select

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
from app.module.face_service import face_service
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


# =========================================================================
# 📹 CAMERA FACE DETECTION & RECOGNITION (INSIGHTFACE / MOCKUP)
# =========================================================================

@router.post("/camera-face", summary="Camera Face Detection & Recognition Webhook")
async def handle_camera_face(request: Request, db: AsyncDbDep):
    """
    Ingest face detection snapshots from Smart IP Cameras (Hikvision, Dahua, Uniview, etc.)
    or Edge Workers. Extracts 512-dim ArcFace embeddings, identifies member via 1:N in-memory cache,
    validates access permissions, triggers relay, logs event, and broadcasts via SSE.
    """
    now = time_now()
    door_code = ""
    direction = "IN"
    reader_id = "CAM-FACE-01"
    simulate_member_code = None
    image_bytes = None

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        door_code = (form.get("door_code") or "").strip().upper()
        direction = (form.get("direction") or "IN").strip().upper()
        reader_id = form.get("reader_id") or "CAM-FACE-01"
        simulate_member_code = form.get("simulate_member_code")
        upload_file = form.get("image")
        if upload_file and hasattr(upload_file, "read"):
            image_bytes = await upload_file.read()
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        door_code = (body.get("door_code") or "").strip().upper()
        direction = (body.get("direction") or "IN").strip().upper()
        reader_id = body.get("reader_id") or "CAM-FACE-01"
        simulate_member_code = body.get("simulate_member_code")
        image_base64 = body.get("image_base64")
        if image_base64:
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            try:
                image_bytes = base64.b64decode(image_base64)
            except Exception:
                image_bytes = None

    if not door_code:
        raise HTTPException(status_code=400, detail="Missing required field 'door_code'")

    # Save Snapshot Image to static/uploads/snapshots if provided
    os.makedirs("static/uploads/snapshots", exist_ok=True)
    snapshot_url = ""
    if image_bytes and len(image_bytes) > 0:
        snap_fname = f"face_{int(now.timestamp())}_{uuid.uuid4().hex[:8]}.jpg"
        snap_path = os.path.join("static/uploads/snapshots", snap_fname)
        try:
            with open(snap_path, "wb") as f:
                f.write(image_bytes)
            snapshot_url = f"/static/uploads/snapshots/{snap_fname}"
        except Exception as e:
            print_error(f"Failed to save face snapshot: {e}")

    # 1. Extract 512-dim ArcFace embedding
    target_embedding, meta = face_service.extract_embedding(
        image_bytes=image_bytes,
        simulate_member_code=simulate_member_code,
    )

    if target_embedding is None:
        return {
            "success": False,
            "granted": False,
            "result": "NO_FACE",
            "reason": "No face detected in submitted frame",
            "engine_mode": face_service.engine_mode,
        }

    # 2. 1:N In-Memory Vector Search (Auto-sync cache from DB if not loaded)
    if len(face_service.member_ids) == 0:
        members = (await db.exec(select(Access_Member))).all()
        for m in members:
            if not m.face_embedding:
                m.face_embedding = face_service.enroll_mock_embedding(m.member_code)
                m.face_registered_at = time_now()
                m.face_tag = "Mockup-ArcFace-512"
                db.add(m)
        if members:
            await db.commit()
        face_service.sync_cache(members)

    matched_member_id, confidence, matched_code = face_service.identify_member(target_embedding)

    # 3. Lookup Door
    door_stmt = select(Access_Door).where(Access_Door.code == door_code)
    door = (await db.exec(door_stmt)).first()
    if not door and door_code.isdigit():
        door = await db.get(Access_Door, int(door_code))

    door_id = door.id if door else None
    door_name = door.name if door else f"Unknown Door ({door_code})"

    # 4. Access Validation
    result = "DENIED"
    reason = "Access Denied"
    member = None
    member_id = None
    member_name = "Unknown Person"
    department = ""
    picture_url = ""

    if not door:
        reason = f"Door not registered: {door_code}"
    elif door.status.upper() != "ONLINE":
        reason = f"Door '{door.name}' is currently {door.status}"
    elif matched_member_id is None:
        result = "UNREGISTERED"
        reason = f"Face Unregistered / Low Confidence ({confidence * 100:.1f}%)"
    else:
        # Member matched!
        member = await db.get(Access_Member, matched_member_id)
        if not member:
            result = "UNREGISTERED"
            reason = f"Member ID {matched_member_id} not found"
        elif member.status.lower() != "active":
            member_id = member.id
            member_name = f"{member.first_name} {member.last_name}".strip()
            department = member.department
            picture_url = member.picture_url or ""
            reason = f"Member account is {member.status.upper()}"
        elif member.expire_date and member.expire_date < now:
            member_id = member.id
            member_name = f"{member.first_name} {member.last_name}".strip()
            department = member.department
            picture_url = member.picture_url or ""
            reason = "Member account has expired"
        else:
            member_id = member.id
            member_name = f"{member.first_name} {member.last_name}".strip()
            department = member.department
            picture_url = member.picture_url or ""

            # Check Access Group & Schedule
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
                                result = "GRANTED"
                                reason = f"Face Verified ({confidence * 100:.1f}%)"

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
        # Anti-Passback (APB)
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

        # Max Occupancy Check
        if result == "GRANTED" and target_zone.max_occupancy > 0 and direction == "IN":
            curr_occ = (
                await db.exec(
                    select(func.count(Access_Member.id)).where(Access_Member.current_zone_id == target_zone.id)
                )
            ).one()
            if curr_occ >= target_zone.max_occupancy:
                result = "DENIED"
                reason = f"Zone Capacity Full ({curr_occ}/{target_zone.max_occupancy} in {target_zone.name})"

    # 6. Update Member Location if Granted
    if result == "GRANTED" and member:
        member.current_zone_id = to_zone_id
        member.is_inside = (target_zone is not None and target_zone.zone_type.upper() != "OUTSIDE")
        member.last_access_door_id = door_id
        member.last_access_time = now
        member.last_direction = direction
        db.add(member)

    # 7. Log Event
    display_snapshot = snapshot_url or picture_url
    log_entry = Access_Log(
        event_time=now,
        card_number=f"FACE:{matched_code or 'UNKNOWN'}",
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
        event_type="FACE_RECOGNITION",
        snapshot_url=display_snapshot,
        confidence_score=confidence,
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
            "card_number": f"FACE:{matched_code or 'UNKNOWN'}",
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
            "event_type": "FACE_RECOGNITION",
            "confidence_score": confidence,
            "confidence_percent": f"{confidence * 100:.1f}%",
            "picture_url": picture_url,
            "snapshot_url": display_snapshot,
            "engine_mode": face_service.engine_mode,
            "unlock_relay": (result == "GRANTED"),
            "relay_time_sec": door.relay_time_sec if door else 5,
        },
    }
    broadcast_sse(event_payload)

    if result == "GRANTED":
        print_success(f"🔓 [FACE GRANTED] {member_name} ({confidence*100:.1f}%) at {door_name}")
    else:
        print_info(f"🚫 [FACE DENIED] {matched_code or 'STRANGER'} at {door_name} - Reason: {reason}")

    return {
        "success": True,
        "granted": (result == "GRANTED"),
        "result": result,
        "reason": reason,
        "member_name": member_name,
        "door_name": door_name,
        "confidence": confidence,
        "confidence_percent": f"{confidence * 100:.1f}%",
        "engine_mode": face_service.engine_mode,
        "unlock_relay": (result == "GRANTED"),
        "relay_time": door.relay_time_sec if (door and result == "GRANTED") else 0,
        "log_id": log_entry.id,
    }


@router.get("/face-status", summary="Face Recognition Engine Diagnostic Status")
async def get_face_status(db: AsyncDbDep):
    """Return status of the InsightFace / Mockup recognition engine."""
    if len(face_service.member_ids) == 0:
        members = (await db.exec(select(Access_Member))).all()
        for m in members:
            if not m.face_embedding:
                m.face_embedding = face_service.enroll_mock_embedding(m.member_code)
                m.face_registered_at = time_now()
                m.face_tag = "Mockup-ArcFace-512"
                db.add(m)
        if members:
            await db.commit()
        face_service.sync_cache(members)
    return face_service.get_status()


@router.post("/face-sync", summary="Synchronize In-Memory Face Embeddings Cache")
async def sync_face_cache(db: AsyncDbDep):
    """Reload all member face embeddings into the in-memory vector cache."""
    members = (await db.exec(select(Access_Member))).all()
    face_service.sync_cache(members)
    return {
        "success": True,
        "enrolled_count": len(face_service.member_ids),
        "engine_mode": face_service.engine_mode,
    }


@router.post("/face-enroll", summary="Enroll or update Member Face Embedding")
async def enroll_member_face(
    member_id: int,
    db: AsyncDbDep,
    simulate_code: str | None = None,
):
    """Enroll a face embedding for a member (Mockup or InsightFace)."""
    member = await db.get(Access_Member, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    code_to_enroll = simulate_code or member.member_code
    member.face_embedding = face_service.enroll_mock_embedding(code_to_enroll)
    member.face_registered_at = time_now()
    member.face_tag = f"{face_service.engine_mode.title()}-ArcFace-512"
    db.add(member)
    await db.commit()
    await db.refresh(member)

    # Update in-memory cache
    all_members = (await db.exec(select(Access_Member))).all()
    face_service.sync_cache(all_members)

    return {
        "success": True,
        "member_id": member.id,
        "member_code": member.member_code,
        "face_tag": member.face_tag,
    }


@router.get("/face-review/gallery", summary="Paginated Face Recognition Audit Gallery")
async def get_face_review_gallery(
    db: AsyncDbDep,
    page: int = 1,
    limit: int = 12,
    result: str | None = None,
    door_id: int | None = None,
    search: str | None = None,
    direction: str | None = None,
):
    """
    Paginated access logs for face recognition events with master vs. snapshot comparison.
    """
    if page < 1:
        page = 1
    if limit < 1:
        limit = 12
    if limit > 100:
        limit = 100
    skip = (page - 1) * limit

    # Query logs where event_type == 'FACE_RECOGNITION'
    stmt = select(Access_Log).where(Access_Log.event_type == "FACE_RECOGNITION")

    if result and result.upper() != "ALL":
        stmt = stmt.where(Access_Log.result == result.upper())
    if door_id:
        stmt = stmt.where(Access_Log.door_id == door_id)
    if direction and direction.upper() != "ALL":
        stmt = stmt.where(Access_Log.direction == direction.upper())
    if search:
        s = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Access_Log.member_name.ilike(s),
                Access_Log.card_number.ilike(s),
                Access_Log.door_name.ilike(s),
                Access_Log.department.ilike(s),
                Access_Log.reason.ilike(s),
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Order and paginate
    stmt = stmt.order_by(Access_Log.event_time.desc()).offset(skip).limit(limit)
    logs = (await db.exec(stmt)).all()

    # Pre-fetch members to get registered profile pictures & face tags
    member_ids = [log.member_id for log in logs if log.member_id]
    member_map = {}
    if member_ids:
        mem_stmt = select(Access_Member).where(Access_Member.id.in_(member_ids))
        mems = (await db.exec(mem_stmt)).all()
        member_map = {m.id: m for m in mems}

    items = []
    for log in logs:
        mem = member_map.get(log.member_id) if log.member_id else None
        conf = log.confidence_score if log.confidence_score is not None else 0.0
        conf_pct = f"{conf * 100:.1f}%" if conf > 0 else "-"
        is_match = conf >= face_service.threshold

        evt_time_str = log.event_time.strftime("%Y-%m-%d %H:%M:%S") if log.event_time else "-"
        time_str = log.event_time.strftime("%H:%M:%S") if log.event_time else "-"
        date_str = log.event_time.strftime("%Y-%m-%d") if log.event_time else "-"

        items.append({
            "id": log.id,
            "event_time": evt_time_str,
            "date_str": date_str,
            "time_str": time_str,
            "result": log.result,
            "reason": log.reason,
            "direction": log.direction,
            "door_id": log.door_id,
            "door_name": log.door_name,
            "card_number": log.card_number,
            "member_id": log.member_id,
            "member_name": log.member_name or "Unknown / Stranger",
            "department": log.department or (mem.department if mem else ""),
            "member_code": mem.member_code if mem else (log.card_number.replace("FACE:", "") if log.card_number else ""),
            "master_photo_url": mem.picture_url if (mem and mem.picture_url) else "",
            "snapshot_url": log.snapshot_url or "",
            "confidence_score": round(conf, 4),
            "confidence_percent": conf_pct,
            "is_match": is_match,
            "face_tag": mem.face_tag if mem else "",
            "threshold": face_service.threshold,
        })

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "success": True,
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "threshold": face_service.threshold,
        "engine_mode": face_service.engine_mode,
    }


@router.get("/face-review/stats", summary="Face Recognition Review Summary Statistics")
async def get_face_review_stats(db: AsyncDbDep):
    """Get metrics and KPIs for face recognition operations."""
    total_face_logs = (
        await db.execute(
            select(func.count()).where(Access_Log.event_type == "FACE_RECOGNITION")
        )
    ).scalar_one()

    granted_logs = (
        await db.execute(
            select(func.count()).where(
                Access_Log.event_type == "FACE_RECOGNITION",
                Access_Log.result == "GRANTED",
            )
        )
    ).scalar_one()

    denied_logs = total_face_logs - granted_logs

    avg_conf_row = (
        await db.execute(
            select(func.avg(Access_Log.confidence_score)).where(
                Access_Log.event_type == "FACE_RECOGNITION",
                Access_Log.confidence_score.is_not(None),
            )
        )
    ).scalar_one()
    avg_confidence = float(avg_conf_row) if avg_conf_row is not None else 0.0

    enrolled_members = (
        await db.execute(
            select(func.count()).where(
                Access_Member.face_embedding.is_not(None),
                Access_Member.face_embedding != "",
            )
        )
    ).scalar_one()

    total_members = (await db.execute(select(func.count()).select_from(Access_Member))).scalar_one()
    pass_rate = round((granted_logs / total_face_logs * 100), 1) if total_face_logs > 0 else 0.0

    return {
        "success": True,
        "total_face_scans": total_face_logs,
        "granted_scans": granted_logs,
        "denied_scans": denied_logs,
        "pass_rate": pass_rate,
        "avg_confidence": round(avg_confidence, 4),
        "avg_confidence_percent": f"{avg_confidence * 100:.1f}%",
        "enrolled_members": enrolled_members,
        "total_members": total_members,
        "enrollment_rate": round((enrolled_members / total_members * 100), 1) if total_members > 0 else 0.0,
        "engine_mode": face_service.engine_mode,
        "threshold": face_service.threshold,
    }


@router.get("/face-review/enrolled", summary="List Enrolled Face Profiles")
async def get_face_enrolled_members(db: AsyncDbDep):
    """List members with enrolled biometric face embeddings."""
    stmt = select(Access_Member).order_by(Access_Member.id.asc())
    members = (await db.exec(stmt)).all()
    results = []
    for m in members:
        has_face = bool(m.face_embedding and len(m.face_embedding) > 20)
        results.append({
            "id": m.id,
            "member_code": m.member_code,
            "name": f"{m.first_name} {m.last_name or ''}".strip(),
            "department": m.department or "-",
            "picture_url": m.picture_url or "",
            "status": m.status,
            "has_face": has_face,
            "face_tag": m.face_tag or ("Enrolled" if has_face else "Not Enrolled"),
            "face_registered_at": m.face_registered_at.strftime("%Y-%m-%d %H:%M") if m.face_registered_at else "-",
        })
    return {"success": True, "data": results, "count": len(results)}


