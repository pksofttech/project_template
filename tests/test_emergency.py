"""Unit & Integration Tests for Emergency Management & Life Safety (Fire Alarm & Global Lockdown)."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_emergency_lifecycle_and_swipe_enforcement():
    """Test full emergency lifecycle: normal -> fire alarm -> swipe check -> lockdown -> reset."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Ensure Clean Normal State
        reset_res = await client.post("/api/access/emergency/reset")
        assert reset_res.status_code == 200
        assert reset_res.json()["mode"] == "NORMAL"

        # Check Initial Status
        status_res = await client.get("/api/access/emergency/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["mode"] == "NORMAL"
        assert status_data["is_emergency"] is False

        # ----------------------------------------------------
        # 🔥 Step 1: Trigger Fire Alarm Evacuation Mode
        # ----------------------------------------------------
        fire_res = await client.post(
            "/api/access/emergency/fire-alarm",
            json={
                "reason": "Fire Drill Smoke Sensor Triggered",
                "source": "FACP_WEBHOOK",
            },
        )
        assert fire_res.status_code == 200
        fire_data = fire_res.json()
        assert fire_data["success"] is True
        assert fire_data["mode"] == "FIRE_ALARM"

        # Verify status is now FIRE_ALARM
        status_after_fire = await client.get("/api/access/emergency/status")
        assert status_after_fire.json()["mode"] == "FIRE_ALARM"
        assert status_after_fire.json()["is_emergency"] is True

        # Test Swipe during FIRE_ALARM:
        # 1. Blocked card '9990001111' MUST be GRANTED for emergency life safety
        swipe_blocked = await client.post(
            "/api/access/event/swipe",
            json={"card_number": "9990001111", "door_code": "DOOR-01", "direction": "OUT"},
        )
        assert swipe_blocked.status_code == 200
        res_blocked = swipe_blocked.json()
        assert res_blocked["granted"] is True
        assert res_blocked["unlock_relay"] is True
        assert "FIRE ALARM" in res_blocked["reason"].upper()

        # 2. Completely unregistered card MUST be GRANTED for emergency evacuation
        swipe_unknown = await client.post(
            "/api/access/event/swipe",
            json={"card_number": "UNKNOWN_CARD_999", "door_code": "DOOR-01", "direction": "OUT"},
        )
        assert swipe_unknown.status_code == 200
        res_unknown = swipe_unknown.json()
        assert res_unknown["granted"] is True
        assert res_unknown["unlock_relay"] is True

        # ----------------------------------------------------
        # 🔒 Step 2: Trigger Global Lockdown Mode
        # ----------------------------------------------------
        lockdown_res = await client.post(
            "/api/access/emergency/lockdown",
            json={
                "reason": "Armed Intruder Warning on Perimeter",
                "source": "MANUAL_WEB",
            },
        )
        assert lockdown_res.status_code == 200
        lockdown_data = lockdown_res.json()
        assert lockdown_data["success"] is True
        assert lockdown_data["mode"] == "GLOBAL_LOCKDOWN"

        # Verify status is now GLOBAL_LOCKDOWN
        status_after_lock = await client.get("/api/access/emergency/status")
        assert status_after_lock.json()["mode"] == "GLOBAL_LOCKDOWN"
        assert status_after_lock.json()["is_emergency"] is True

        # Test Swipe during GLOBAL_LOCKDOWN:
        # 1. Regular active user '1001234567' (Engineering / Somchai) MUST be DENIED
        swipe_regular = await client.post(
            "/api/access/event/swipe",
            json={"card_number": "1001234567", "door_code": "DOOR-01", "direction": "IN"},
        )
        assert swipe_regular.status_code == 200
        res_regular = swipe_regular.json()
        assert res_regular["granted"] is False
        assert res_regular["unlock_relay"] is False
        assert "LOCKDOWN" in res_regular["reason"].upper()

        # ----------------------------------------------------
        # ✅ Step 3: Reset Emergency Back to Normal
        # ----------------------------------------------------
        clear_res = await client.post("/api/access/emergency/reset")
        assert clear_res.status_code == 200
        clear_data = clear_res.json()
        assert clear_data["success"] is True
        assert clear_data["mode"] == "NORMAL"

        # Verify status is back to NORMAL
        status_final = await client.get("/api/access/emergency/status")
        assert status_final.json()["mode"] == "NORMAL"
        assert status_final.json()["is_emergency"] is False

        # Verify Somchai can swipe normally again
        # Move Somchai to outside zone via DOOR-02 exit turnstile (direction="IN" moves from lobby to outside)
        await client.post(
            "/api/access/event/swipe",
            json={"card_number": "1001234567", "door_code": "DOOR-02", "direction": "IN"},
        )
        swipe_normal = await client.post(
            "/api/access/event/swipe",
            json={"card_number": "1001234567", "door_code": "DOOR-01", "direction": "IN"},
        )
        assert swipe_normal.status_code == 200
        assert swipe_normal.json()["granted"] is True
        assert swipe_normal.json()["unlock_relay"] is True
