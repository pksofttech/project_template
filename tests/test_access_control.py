"""Unit & Integration Tests for Access Control Management System."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_access_card_swipe_granted():
    """Verify valid cardholder swipe grants access and triggers door relay."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
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
