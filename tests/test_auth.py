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
