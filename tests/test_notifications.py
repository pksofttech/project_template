"""Unit & Integration Tests for Multi-Channel Alert & Notification Service (LINE, Telegram, Webhook, Duress)."""

import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.module.notification_service import notification_service


@pytest.mark.asyncio
async def test_notification_config_lifecycle():
    """Verify reading and updating multi-channel notification configurations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Login as admin
        login_res = await client.post(
            "/api/system_user/login",
            json={"username": "admin", "password": "12341234"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Read current config
        get_res = await client.get("/api/system_config/notifications", headers=headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert "line_enabled" in data
        assert "telegram_enabled" in data
        assert "webhook_enabled" in data
        assert "alert_on_duress" in data

        # Step 3: Update notification settings
        update_payload = {
            "line_enabled": True,
            "line_token": "test-line-token-12345",
            "line_messaging_token": "test-messaging-token",
            "line_target_id": "Utestuser123",
            "telegram_enabled": True,
            "telegram_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
            "telegram_chat_id": "-100987654321",
            "webhook_enabled": True,
            "webhook_url": "https://example.com/webhook/test",
            "alert_on_duress": True,
            "alert_on_fire_alarm": True,
            "alert_on_lockdown": True,
            "alert_on_denied_limit": True,
        }
        post_res = await client.post(
            "/api/system_config/notifications",
            json=update_payload,
            headers=headers,
        )
        assert post_res.status_code == 200
        assert post_res.json()["message"] == "Notification configurations updated successfully"

        # Step 4: Verify updated settings
        verify_res = await client.get("/api/system_config/notifications", headers=headers)
        assert verify_res.status_code == 200
        vdata = verify_res.json()
        assert vdata["line_enabled"] is True
        assert vdata["line_token"] == "test-line-token-12345"
        assert vdata["telegram_enabled"] is True
        assert vdata["telegram_chat_id"] == "-100987654321"
        assert vdata["webhook_url"] == "https://example.com/webhook/test"


@pytest.mark.asyncio
async def test_notification_test_dispatch_api():
    """Verify test notification dispatch endpoint works with mocked external HTTP clients."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login
        login_res = await client.post(
            "/api/system_user/login",
            json={"username": "admin", "password": "12341234"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        with patch.object(notification_service, "_send_line_notify", new_callable=AsyncMock) as mock_line, \
             patch.object(notification_service, "_send_telegram", new_callable=AsyncMock) as mock_tg, \
             patch.object(notification_service, "_send_webhook", new_callable=AsyncMock) as mock_wh:

            mock_line.return_value = {"success": True, "status_code": 200}
            mock_tg.return_value = {"success": True, "status_code": 200}
            mock_wh.return_value = {"success": True, "status_code": 200}

            test_res = await client.post(
                "/api/system_config/notifications/test",
                json={"channel": "all", "message": "Manual test notification"},
                headers=headers,
            )
            assert test_res.status_code == 200
            res_data = test_res.json()
            assert res_data["status"] == "success"
            assert "results" in res_data


@pytest.mark.asyncio
async def test_duress_pin_alert_dispatch():
    """Verify entering a duress PIN silently dispatches DURESS_PIN alert."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch.object(notification_service, "dispatch_alert_background") as mock_dispatch:
            res = await client.post(
                "/api/access/event/pin-code",
                json={
                    "door_code": "DOOR-01",
                    "pin_code": "9999",  # Seeded duress PIN for MEM-003
                    "member_code": "MEM-003",
                    "direction": "IN",
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["granted"] is True
            assert data["is_duress"] is True
            assert data["unlock_relay"] is True  # Egress granted to protect cardholder

            # Verify silent alert was dispatched
            mock_dispatch.assert_called_once()
            call_kwargs = mock_dispatch.call_args.kwargs
            assert call_kwargs["event_type"] == "DURESS_PIN"
            assert "DURESS PIN" in call_kwargs["title"]


@pytest.mark.asyncio
async def test_emergency_modes_alert_dispatch():
    """Verify fire alarm and lockdown trigger alert dispatches."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch.object(notification_service, "dispatch_alert_background") as mock_dispatch:
            # Fire Alarm
            await client.post(
                "/api/access/emergency/fire-alarm",
                json={"reason": "Fire Drill Smoke Alarm", "source": "FACP_WEBHOOK"},
            )
            assert mock_dispatch.call_count >= 1
            last_call = mock_dispatch.call_args.kwargs
            assert last_call["event_type"] == "FIRE_ALARM"

            # Reset
            await client.post("/api/access/emergency/reset")
            last_call = mock_dispatch.call_args.kwargs
            assert last_call["event_type"] == "EMERGENCY_RESET"

            # Lockdown
            await client.post(
                "/api/access/emergency/lockdown",
                json={"reason": "Perimeter Threat Detected", "source": "PANIC_BUTTON"},
            )
            last_call = mock_dispatch.call_args.kwargs
            assert last_call["event_type"] == "LOCKDOWN"

            # Reset again to leave clean state
            await client.post("/api/access/emergency/reset")


@pytest.mark.asyncio
async def test_repeated_access_denials_alert():
    """Verify repeated denied swipes trigger DENIED_LIMIT security alert after 3 failed attempts."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch.object(notification_service, "dispatch_alert_background") as mock_dispatch:
            target_card = "UNKNOWN_SUSPECT_CARD_999"

            # Swipe 1: Denied
            await client.post(
                "/api/access/event/swipe",
                json={"card_number": target_card, "door_code": "DOOR-01", "direction": "IN"},
            )
            # Swipe 2: Denied
            await client.post(
                "/api/access/event/swipe",
                json={"card_number": target_card, "door_code": "DOOR-01", "direction": "IN"},
            )
            # Swipe 3: Denied -> Should trigger alert!
            await client.post(
                "/api/access/event/swipe",
                json={"card_number": target_card, "door_code": "DOOR-01", "direction": "IN"},
            )

            assert mock_dispatch.call_count >= 1
            call_kwargs = mock_dispatch.call_args.kwargs
            assert call_kwargs["event_type"] == "DENIED_LIMIT"
            assert target_card in call_kwargs["message"]
