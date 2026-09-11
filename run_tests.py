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

        # Test 9: Access Control - Card Swipe (Granted & Zone Transition)
        try:
            # Ensure member is outside initially
            await client.post("/api/access/zone/presence/reset_apb", json={})

            # 9a. First Swipe IN -> Granted
            r = await client.post(
                "/api/access/event/swipe",
                json={"card_number": "1001234567", "door_code": "DOOR-01", "direction": "IN"},
            )
            assert r.status_code == 200
            d = r.json()
            assert d["granted"] is True
            assert d["unlock_relay"] is True
            print_success("  [PASS] POST /api/access/event/swipe - Granted & Relay Triggered")
            passed += 1

            # 9b. Second Swipe IN immediately (Same Zone) -> Denied by Anti-Passback (APB)
            r_apb = await client.post(
                "/api/access/event/swipe",
                json={"card_number": "1001234567", "door_code": "DOOR-01", "direction": "IN"},
            )
            assert r_apb.status_code == 200
            d_apb = r_apb.json()
            assert d_apb["granted"] is False
            assert "Anti-Passback" in d_apb["reason"]
            print_success("  [PASS] POST /api/access/event/swipe - Anti-Passback (APB) Protection Verified")
            passed += 1

            # 9c. Swipe OUT -> Granted
            r_out = await client.post(
                "/api/access/event/swipe",
                json={"card_number": "1001234567", "door_code": "DOOR-02", "direction": "OUT"},
            )
            assert r_out.status_code == 200
            assert r_out.json()["granted"] is True
            print_success("  [PASS] POST /api/access/event/swipe - Swipe OUT Granted & Exit Tracked")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Card Swipe Granted / APB: {e}")
            failed += 1

        # Test 10: Access Control - Card Swipe (Denied / Blocked)
        try:
            r = await client.post(
                "/api/access/event/swipe",
                json={"card_number": "9990001111", "door_code": "DOOR-01", "direction": "IN"},
            )
            assert r.status_code == 200
            d = r.json()
            assert d["granted"] is False
            assert d["unlock_relay"] is False
            print_success("  [PASS] POST /api/access/event/swipe - Blocked Card Denied")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Card Swipe Denied: {e}")
            failed += 1

        # Test 11: Access Control - Remote Unlock Door
        try:
            r = await client.post(
                "/api/access/event/remote_unlock",
                json={"door_id": 1, "operator_name": "Test Runner"},
            )
            assert r.status_code == 200
            assert r.json()["success"] is True
            print_success("  [PASS] POST /api/access/event/remote_unlock - Pulse Relay OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Remote Unlock: {e}")
            failed += 1

        # Test 12: Access Control - Dashboard KPI Stats
        try:
            r = await client.get("/api/access/log/summary_stats")
            assert r.status_code == 200
            d = r.json()
            assert d["today_total"] >= 1
            assert d["online_doors"] >= 1
            print_success("  [PASS] GET /api/access/log/summary_stats - KPIs Calculated OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Summary Stats: {e}")
            failed += 1

        # Test 13: Access Control - Doors DataTables
        try:
            r = await client.get(
                "/api/access/door/datatable?table=Access_Door&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=code"
            )
            assert r.status_code == 200
            assert len(r.json()["data"]) >= 1
            print_success("  [PASS] GET /api/access/door/datatable - Doors Listing OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Doors DataTables: {e}")
            failed += 1

        # Test 14: Access Control - Access Logs DataTables
        try:
            r = await client.get(
                "/api/access/log/datatable?table=Access_Log&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=card_number"
            )
            assert r.status_code == 200
            assert len(r.json()["data"]) >= 1
            print_success("  [PASS] GET /api/access/log/datatable - Access Logs Listing OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Logs DataTables: {e}")
            failed += 1

        # Test 15: Access Control - Members DataTables
        try:
            r = await client.get(
                "/api/access/member/datatable?table=Access_Member&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=member_code"
            )
            assert r.status_code == 200
            assert len(r.json()["data"]) >= 1
            print_success("  [PASS] GET /api/access/member/datatable - Cardholders Listing OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Members DataTables: {e}")
            failed += 1

        # Test 16: Access Control - Cards DataTables
        try:
            r = await client.get(
                "/api/access/card/datatable?table=Access_Card&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=card_number"
            )
            assert r.status_code == 200
            assert len(r.json()["data"]) >= 1
            print_success("  [PASS] GET /api/access/card/datatable - Cards Listing OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Cards DataTables: {e}")
            failed += 1

        # Test 17: Access Control - Groups DataTables
        try:
            r = await client.get(
                "/api/access/group/datatable?table=Access_Group&draw=1&start=0&length=10&columns[0][data]=id&columns[1][data]=code"
            )
            assert r.status_code == 200
            assert len(r.json()["data"]) >= 1
            print_success("  [PASS] GET /api/access/group/datatable - Groups Listing OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Access Groups DataTables: {e}")
            failed += 1

        # Test 18: Access Control - Live Monitor Page View
        try:
            r = await client.get("/live_monitor", cookies={"access_token": token})
            assert r.status_code == 200
            assert "Live Access Monitor" in r.text
            print_success("  [PASS] GET /live_monitor - Rendered Live Monitor HTML OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Live Monitor Page View: {e}")
            failed += 1

        # Test 19: Access Control - Access Groups Page View (/access_groups)
        try:
            r = await client.get("/access_groups", cookies={"access_token": token})
            assert r.status_code == 200
            assert "Access Permission Groups" in r.text
            print_success("  [PASS] GET /access_groups - Direct View Rendered OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] GET /access_groups: {e}")
            failed += 1

        # Test 20: Access Control - Access Groups Page View via /page?page=access_groups
        try:
            r = await client.get("/page?page=access_groups", cookies={"access_token": token})
            assert r.status_code == 200
            assert "Access Permission Groups" in r.text
            print_success("  [PASS] GET /page?page=access_groups - Dynamic Portal Route Rendered OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] GET /page?page=access_groups: {e}")
            failed += 1

        # Test 21: Menu Registry & Submenu Hierarchy Test
        try:
            r = await client.get("/api/system_user/registry", headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 200
            res = r.json()
            assert res["success"] is True
            cfg_menu = next((m for m in res["menus"] if m["code"] == "SYSTEM_CONFIG"), None)
            assert cfg_menu is not None
            assert "children" in cfg_menu
            assert len(cfg_menu["children"]) == 5
            print_success("  [PASS] GET /api/system_user/registry - Settings Submenus Registered OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Menu Registry Submenu Hierarchy: {e}")
        # Test 22: DataTables Pages using TableModel from _table_class.js
        try:
            pages_to_check = [
                ("/cards", "Access_Card", "#tableCards"),
                ("/doors", "Access_Door", "#tableDoors"),
                ("/members", "Access_Member", "#tableMembers"),
                ("/sample", "SampleModel", "#tableSample"),
                ("/access_groups", "Access_Group", "#tableGroups"),
                ("/access_logs", "Access_Log", "#tableAccessLogs"),
                ("/zones", "Access_Zone", "#tableZones"),
            ]
            for page_url, table_name, selector in pages_to_check:
                r = await client.get(page_url, cookies={"access_token": token})
                assert r.status_code == 200, f"{page_url} returned {r.status_code}"
                assert "TableModel" in r.text, f"{page_url} missing TableModel"
                assert selector in r.text, f"{page_url} missing {selector}"
                assert "_table_class.js" in r.text, f"{page_url} missing _table_class.js"
            print_success("  [PASS] All 7 DataTables Pages use TableModel & _table_class.js OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] DataTables TableModel Verification: {e}")
            failed += 1

        # Test 23: Zone Presence & Emergency Muster Roll Call Endpoints
        try:
            # 23a. Zone Datatable
            r_zdt = await client.get("/api/access/zone/datatable", cookies={"access_token": token})
            assert r_zdt.status_code == 200
            assert r_zdt.json()["recordsTotal"] >= 5

            # 23b. Zone Presence Summary
            r_sum = await client.get("/api/access/zone/presence/summary", cookies={"access_token": token})
            assert r_sum.status_code == 200
            sum_data = r_sum.json()
            assert sum_data["success"] is True
            assert "kpi" in sum_data
            assert len(sum_data["zones"]) >= 5

            # 23c. Emergency Muster Roll Call
            r_mst = await client.get("/api/access/zone/presence/muster_roll_call", cookies={"access_token": token})
            assert r_mst.status_code == 200
            assert r_mst.json()["success"] is True

            print_success("  [PASS] Zone Presence, APB & Muster Roll Call APIs OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Zone Presence & Muster APIs: {e}")
            failed += 1

        # Test 24: Zone HTML Views & Dynamic Routing
        try:
            r_zp = await client.get("/zone_presence", cookies={"access_token": token})
            assert r_zp.status_code == 200
            assert "Emergency Evacuation" in r_zp.text

            r_dyn = await client.get("/page?page=zone_presence", cookies={"access_token": token})
            assert r_dyn.status_code == 200

            print_success("  [PASS] Zone Presence & Muster HTML Views Rendered OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Zone HTML Views: {e}")
            failed += 1

        # Test 25: Face Engine Status Diagnostic
        try:
            r_fs = await client.get("/api/access/event/face-status")
            assert r_fs.status_code == 200
            fs_data = r_fs.json()
            assert fs_data["engine_mode"] in ("mockup", "insightface")
            assert fs_data["dimension"] == 512
            assert fs_data["enrolled_members_count"] >= 3
            assert "MEM-001" in fs_data["enrolled_member_codes"]
            print_success(f"  [PASS] GET /api/access/event/face-status - Mode: {fs_data['engine_mode']} ({fs_data['enrolled_members_count']} faces enrolled)")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Face Engine Status: {e}")
            failed += 1

        # Test 26: Camera Face Ingestion - Recognized Member (Somchai MEM-001)
        try:
            r_fc = await client.post(
                "/api/access/event/camera-face",
                json={
                    "door_code": "DOOR-01",
                    "direction": "IN",
                    "simulate_member_code": "MEM-001",
                    "reader_id": "TEST-CAM-01",
                },
            )
            assert r_fc.status_code == 200
            fc_data = r_fc.json()
            assert fc_data["success"] is True
            assert fc_data["confidence"] >= 0.65
            assert "Somchai" in fc_data["member_name"]
            assert fc_data["engine_mode"] in ("mockup", "insightface")
            print_success(f"  [PASS] POST /api/access/event/camera-face - Verified Match ({fc_data['confidence_percent']})")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Camera Face Recognition (Member): {e}")
            failed += 1

        # Test 27: Camera Face Ingestion - Unregistered Stranger
        try:
            r_stranger = await client.post(
                "/api/access/event/camera-face",
                json={
                    "door_code": "DOOR-01",
                    "direction": "IN",
                    "simulate_member_code": "STRANGER_GUEST_99",
                    "reader_id": "TEST-CAM-01",
                },
            )
            assert r_stranger.status_code == 200
            st_data = r_stranger.json()
            assert st_data["success"] is True
            assert st_data["result"] == "UNREGISTERED"
            assert st_data["granted"] is False
            print_success(f"  [PASS] POST /api/access/event/camera-face - Stranger Correctly Denied ({st_data['confidence_percent']})")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Camera Face Recognition (Stranger): {e}")
            failed += 1

        # Test 28: Member Face Enrollment & Cache Sync
        try:
            r_enr = await client.post(
                "/api/access/event/face-enroll?member_id=2",
                cookies={"access_token": token},
            )
            assert r_enr.status_code == 200
            enr_data = r_enr.json()
            assert enr_data["success"] is True
            assert "ArcFace-512" in enr_data["face_tag"]
            print_success("  [PASS] POST /api/access/event/face-enroll - Face Vector Enrolled & Synced")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Member Face Enrollment: {e}")
            failed += 1

        # Test 29: Face Review Views (Direct & Dynamic Portal Route)
        try:
            r_fr1 = await client.get("/face_review", cookies={"access_token": token})
            assert r_fr1.status_code == 200
            assert "Face Access Review" in r_fr1.text

            r_fr2 = await client.get("/page?page=face_review", cookies={"access_token": token})
            assert r_fr2.status_code == 200
            assert "Face Access Review" in r_fr2.text
            print_success("  [PASS] GET /face_review & /page?page=face_review - Views Rendered OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Face Review Views: {e}")
            failed += 1

        # Test 30: Face Review Summary Statistics API
        try:
            r_stats = await client.get("/api/access/event/face-review/stats")
            assert r_stats.status_code == 200
            s_data = r_stats.json()
            assert s_data["success"] is True
            assert "total_face_scans" in s_data
            assert "granted_scans" in s_data
            assert "avg_confidence_percent" in s_data
            assert "enrolled_members" in s_data
            print_success(f"  [PASS] GET /api/access/event/face-review/stats - Total: {s_data['total_face_scans']}, Enrolled: {s_data['enrolled_members']}")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Face Review Stats API: {e}")
            failed += 1

        # Test 31: Face Review Gallery Paginated API
        try:
            r_gal = await client.get("/api/access/event/face-review/gallery?page=1&limit=10")
            assert r_gal.status_code == 200
            g_data = r_gal.json()
            assert g_data["success"] is True
            assert len(g_data["items"]) > 0
            first_item = g_data["items"][0]
            assert "snapshot_url" in first_item
            assert "confidence_percent" in first_item
            assert "door_name" in first_item
            print_success(f"  [PASS] GET /api/access/event/face-review/gallery - Loaded {len(g_data['items'])} audit items")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Face Review Gallery API: {e}")
            failed += 1

        # Test 32: Face Review Enrolled Registry & DataTables Event Filter
        try:
            r_enr_list = await client.get("/api/access/event/face-review/enrolled")
            assert r_enr_list.status_code == 200
            el_data = r_enr_list.json()
            assert el_data["success"] is True
            assert len(el_data["data"]) > 0

            # Verify DataTables event_type filter
            r_dt = await client.get(
                "/api/access/log/datatable?event_type=FACE_RECOGNITION&draw=1&start=0&length=10"
            )
            assert r_dt.status_code == 200
            assert "data" in r_dt.json()
            print_success("  [PASS] GET /api/access/event/face-review/enrolled & DataTables Filter OK")
            passed += 1
        except Exception as e:
            print_error(f"  [FAIL] Face Review Enrolled & DataTables Filter: {e}")
            failed += 1

    print_debug(f"📊 Results: {passed} PASSED, {failed} FAILED")
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
