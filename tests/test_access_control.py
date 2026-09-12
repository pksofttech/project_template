"""Unit & Integration Tests for Access Control Management System."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_access_card_swipe_granted():
    """Verify valid cardholder swipe grants access and triggers door relay."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Move Somchai to outside zone via exit turnstile DOOR-02 to ensure clean state
        await client.post(
            "/api/access/event/swipe",
            json={
                "card_number": "1001234567",
                "door_code": "DOOR-02",
                "direction": "IN",
            },
        )
        # Somchai's card '1001234567' on DOOR-01
        res = await client.post(
            "/api/access/event/swipe",
            json={
                "card_number": "1001234567",
                "door_code": "DOOR-01",
                "direction": "IN",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["granted"] is True
        assert data["result"] == "GRANTED"
        assert data["unlock_relay"] is True
        assert data["relay_time"] > 0
        assert "Somchai" in data["member_name"] or "สมชาย" in data["member_name"]


@pytest.mark.asyncio
async def test_access_card_swipe_denied_blocked():
    """Verify blocked cardholder swipe is denied access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # John Doe's blocked card '9990001111'
        res = await client.post(
            "/api/access/event/swipe",
            json={
                "card_number": "9990001111",
                "door_code": "DOOR-01",
                "direction": "IN",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["granted"] is False
        assert data["result"] == "DENIED"
        assert data["unlock_relay"] is False


@pytest.mark.asyncio
async def test_access_card_swipe_unregistered():
    """Verify unregistered card is denied access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/access/event/swipe",
            json={
                "card_number": "UNKNOWN_987654321",
                "door_code": "DOOR-01",
                "direction": "IN",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["granted"] is False
        assert data["result"] == "DENIED"
        assert "Unregistered" in data["reason"]


@pytest.mark.asyncio
async def test_access_door_remote_unlock():
    """Verify remote unlock command triggers relay and logs event."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/access/event/remote_unlock",
            json={"door_id": 1, "operator_name": "Test Runner"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["relay_time"] > 0


@pytest.mark.asyncio
async def test_access_summary_stats():
    """Verify dashboard KPI statistics endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/access/log/summary_stats")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["today_total"] >= 1
        assert data["online_doors"] >= 1
        assert data["total_members"] >= 1


@pytest.mark.asyncio
async def test_access_doors_datatable():
    """Verify DataTables server-side listing for doors."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/access/door/datatable?table=Access_Door&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=code"
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 1
        assert "code" in data[0]


@pytest.mark.asyncio
async def test_access_members_datatable():
    """Verify DataTables server-side listing for members."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/access/member/datatable?table=Access_Member&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=member_code"
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 1
        assert "member_code" in data[0]


@pytest.mark.asyncio
async def test_access_cards_datatable():
    """Verify DataTables server-side listing for cards."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/access/card/datatable?table=Access_Card&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=card_number"
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 1
        assert "card_number" in data[0]


@pytest.mark.asyncio
async def test_access_groups_datatable():
    """Verify DataTables server-side listing for groups."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/access/group/datatable?table=Access_Group&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=code"
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 1
        assert "code" in data[0]


@pytest.mark.asyncio
async def test_access_logs_datatable():
    """Verify DataTables server-side listing for access logs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/access/log/datatable?table=Access_Log&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=card_number"
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert len(data) >= 1
        assert "card_number" in data[0]


@pytest.mark.asyncio
async def test_member_credentials_summary():
    """Verify aggregated credential breakdown per member."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/access/credentials/member/1")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "credentials" in data
        assert "counts" in data
        assert data["counts"]["rfid"] >= 1
        assert data["counts"]["mobile"] >= 1
        assert data["counts"]["fingerprint"] >= 1
        assert data["counts"]["pin"] >= 1


@pytest.mark.asyncio
async def test_mobile_credential_swipe():
    """Verify smartphone BLE / NFC virtual credential authentication."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/access/event/mobile-credential",
            json={
                "device_uuid": "uuid-apple-ble-somchai-001",
                "door_code": "DOOR-01",
                "comm_tech": "BLE",
                "direction": "IN",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["granted"] is True
        assert data["result"] == "GRANTED"
        assert data["unlock_relay"] is True


@pytest.mark.asyncio
async def test_fingerprint_swipe():
    """Verify biometric fingerprint verification against enrolled template."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/access/event/fingerprint",
            json={
                "door_code": "DOOR-01",
                "member_code": "MEM-001",
                "finger_index": 2,
                "direction": "IN",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["granted"] is True
        assert data["result"] == "GRANTED"


@pytest.mark.asyncio
async def test_pin_entry_granted_and_duress():
    """Verify keypad PIN verification and silent duress alarm handling."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Standard PIN for MEM-001 ("1234")
        res_std = await client.post(
            "/api/access/event/pin-code",
            json={
                "door_code": "DOOR-01",
                "pin_code": "1234",
                "member_code": "MEM-001",
                "direction": "IN",
            },
        )
        assert res_std.status_code == 200
        data_std = res_std.json()
        assert data_std["granted"] is True
        assert data_std["is_duress"] is False

        # Duress PIN for MEM-003 ("9999")
        res_dur = await client.post(
            "/api/access/event/pin-code",
            json={
                "door_code": "DOOR-01",
                "pin_code": "9999",
                "member_code": "MEM-003",
                "direction": "IN",
            },
        )
        assert res_dur.status_code == 200
        data_dur = res_dur.json()
        assert data_dur["granted"] is True
        assert data_dur["is_duress"] is True


@pytest.mark.asyncio
async def test_credential_crud_endpoints():
    """Verify CRUD endpoints for Mobile, Fingerprint, and PIN credentials."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Mobile Credential
        res_mob = await client.post(
            "/api/access/credentials/mobile",
            json={
                "member_id": 2,
                "virtual_card_number": "VC-TEST-9988",
                "device_uuid": "test-device-uuid-9988",
                "comm_tech": "BLE",
                "os_platform": "iOS",
                "status": "active",
            },
        )
        assert res_mob.status_code == 200
        mob_data = res_mob.json()
        assert mob_data["success"] is True
        mob_id = mob_data["data"]["id"]

        # Delete Mobile Credential
        res_del_mob = await client.delete(f"/api/access/credentials/mobile/{mob_id}")
        assert res_del_mob.status_code == 200

        # 2. Create Fingerprint
        res_fp = await client.post(
            "/api/access/credentials/fingerprint",
            json={
                "member_id": 2,
                "finger_index": 3,
                "finger_name": "Right Middle",
                "template_data": "ISO_MINUTIAE_TEST_DATA",
                "algorithm_version": "ISO_19794_2",
                "quality_score": 95,
                "status": "active",
            },
        )
        assert res_fp.status_code == 200
        fp_data = res_fp.json()
        assert fp_data["success"] is True
        fp_id = fp_data["data"]["id"]

        # Delete Fingerprint
        res_del_fp = await client.delete(f"/api/access/credentials/fingerprint/{fp_id}")
        assert res_del_fp.status_code == 200

        # 3. Create PIN
        res_pin = await client.post(
            "/api/access/credentials/pin",
            json={
                "member_id": 2,
                "pin_code": "5678",
                "pin_type": "STANDARD",
                "status": "active",
            },
        )
        assert res_pin.status_code == 200
        pin_data = res_pin.json()
        assert pin_data["success"] is True
        pin_id = pin_data["data"]["id"]

        # Delete PIN
        res_del_pin = await client.delete(f"/api/access/credentials/pin/{pin_id}")
        assert res_del_pin.status_code == 200


@pytest.mark.asyncio
async def test_access_log_credential_type_filter():
    """Verify access logs DataTables filtering by credential_type."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/access/log/datatable?credential_type=RFID_CARD")
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        for row in data["data"]:
            assert row["credential_type"] == "RFID_CARD"


