"""Tests for Authentication and User Session."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_login_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/system_user/login",
            json={"username": "admin", "password": "12341234"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["username"] == "admin"


@pytest.mark.asyncio
async def test_login_invalid_password():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/system_user/login",
            json={"username": "admin", "password": "wrong-password"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login first
        login_res = await client.post(
            "/api/system_user/login",
            json={"username": "admin", "password": "12341234"},
        )
        token = login_res.json()["access_token"]

        # Query /me with token
        headers = {"Authorization": f"Bearer {token}"}
        res = await client.get("/api/system_user/me", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "admin"


@pytest.mark.asyncio
async def test_side_menu_bar_categorized_rendering():
    """Verify that sidebar renders with categorized access control groups and badges."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Login to obtain token
        login_res = await client.post(
            "/api/system_user/login",
            json={"username": "admin", "password": "12341234"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        cookies = {"access_token": token}

        # Request /page?page=members
        res = await client.get("/page?page=members", cookies=cookies)
        assert res.status_code == 200
        html = res.text

        # Verify access control categories are rendered
        assert "Identity &amp; Credentials" in html or "Identity & Credentials" in html
        assert "Doors &amp; Hardware" in html or "Doors & Hardware" in html
        assert "Rules &amp; Policies" in html or "Rules & Policies" in html

        # Verify badges are present
        assert "HUB" in html
        assert "RFID" in html
        assert "GATE" in html
        assert "DEV" in html
        assert "ZONE" in html
        assert "RULE" in html
