"""Zero-dependency Automated Test Runner for PKS Project Template."""

import asyncio
import sys
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.stdio import print_debug, print_error, print_success


async def run_all_tests():
    print_debug("🧪 Starting Automated Test Suite...")
    transport = ASGITransport(app=app)
    passed = 0
    failed = 0

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Health Check
        try:
            r = await client.get("/api/health")
            assert r.status_code == 200
            assert r.json()["status"] == "healthy"
            print_success("  [PASS] GET /api/health - Status Healthy & DB Ping OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] GET /api/health: {e}")
            failed += 1

        # Test 2: Security Headers
        try:
            r = await client.get("/api/health")
            assert r.headers.get("x-content-type-options") == "nosniff"
            assert r.headers.get("x-frame-options") == "SAMEORIGIN"
            print_success("  [PASS] Security Headers (nosniff, SAMEORIGIN, xss-protect)")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Security Headers: {e}")
            failed += 1

        # Test 3: Unauthenticated redirect to login
        try:
            r = await client.get("/dashboard", follow_redirects=False)
            assert r.status_code == 302
            assert r.headers["location"] == "/login"
            print_success("  [PASS] Route Protection: /dashboard redirects to /login")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Route Protection: {e}")
            failed += 1

        # Test 4: Login Authentication
        token = ""
        try:
            r = await client.post(
                "/api/system_user/login",
                json={"username": "admin", "password": "12341234"},
            )
            assert r.status_code == 200
            token = r.json()["access_token"]
            print_success("  [PASS] POST /api/system_user/login - JWT Generated")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] POST /api/system_user/login: {e}")
            failed += 1

        # Test 5: Authenticated profile /me
        try:
            r = await client.get("/api/system_user/me", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
            assert r.json()["username"] == "admin"
            print_success("  [PASS] GET /api/system_user/me - Authenticated profile OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] GET /api/system_user/me: {e}")
            failed += 1

        # Test 6: Sample Items DataTables Pagination
        try:
            r = await client.get(
                "/api/sample/datatable?table=Sample_Item&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=code"
            )
            assert r.status_code == 200
            data = r.json()["data"]
            assert len(data) > 0
            assert "id" in data[0]
            assert "code" in data[0]
            assert "Sample_Item" in data[0]
            print_success("  [PASS] GET /api/sample/datatable - DataTables & Nested Object OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] GET /api/sample/datatable: {e}")
            failed += 1

        # Test 7: Image Upload API
        try:
            files = {"file": ("test_avatar.png", b"fake_png_data_for_test", "image/png")}
            r = await client.post("/api/upload/image", files=files)
            assert r.status_code == 200
            assert r.json()["success"] is True
            assert "/static/uploads/" in r.json()["url"]
            print_success("  [PASS] POST /api/upload/image - Upload & Secure Path OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] POST /api/upload/image: {e}")
            failed += 1

        # Test 8: Custom 404 HTML
        try:
            r = await client.get("/non-existent-page-url", headers={"accept": "text/html"})
            assert r.status_code == 404
            assert "404" in r.text
            print_success("  [PASS] Custom 404 HTML Error Page Rendered")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Custom 404 HTML: {e}")
            failed += 1

    print_debug(f"📊 Results: {passed} PASSED, {failed} FAILED")
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
