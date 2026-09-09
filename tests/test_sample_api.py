"""Tests for Sample Item CRUD & DataTables Endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_sample_datatable_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/sample/datatable?table=Sample_Item&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=code"
        )
        assert res.status_code == 200
        data = res.json()
        assert "data" in data
        assert "recordsTotal" in data
        assert "recordsFiltered" in data


@pytest.mark.asyncio
async def test_sample_crud_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        import time
        unique_code = f"TEST-{int(time.time())}"

        # 1. Create
        create_payload = {
            "code": unique_code,
            "name": "Automated Test Item",
            "category": "Testing",
            "price": 199.99,
            "quantity": 5,
            "status": "active",
        }
        res_create = await client.post("/api/sample", json=create_payload)
        assert res_create.status_code == 201
        created_item = res_create.json()["data"]
        item_id = created_item["id"]

        # 2. Read
        res_get = await client.get(f"/api/sample/{item_id}")
        assert res_get.status_code == 200
        assert res_get.json()["code"] == unique_code

        # 3. Update
        res_update = await client.put(
            f"/api/sample/{item_id}",
            json={"name": "Updated Test Item", "price": 249.99},
        )
        assert res_update.status_code == 200
        assert res_update.json()["data"]["name"] == "Updated Test Item"

        # 4. Delete
        res_delete = await client.delete(f"/api/sample/{item_id}")
        assert res_delete.status_code == 200

        # Verify Deleted
        res_verify = await client.get(f"/api/sample/{item_id}")
        assert res_verify.status_code == 404
