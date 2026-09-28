#!/usr/bin/env python3
"""
PKS Access Control - Hardware Event & Card Swipe Testing Tool
============================================================
เครื่องมือทดสอบ API จำลองการทาบบัตร (Card Swipe) และส่งสัญญาณสั่งเปิดประตู
รองรับทั้งโหมด Interactive Menu (CLI) และ Command-Line Flags

Usage:
  # โหมดเมนูโต้ตอบ (Interactive):
  python test_access_tool.py

  # รันทุก Scenario อัตโนมัติ:
  python test_access_tool.py --run-all

  # ระบุบัตรและประตูเอง:
  python test_access_tool.py --card 1001234567 --door DOOR-01 --direction IN

  # สั่งเปิดประตูจากระยะไกล (Remote Unlock):
  python test_access_tool.py --unlock --door-id 1

  # ทดสอบความเร็ว / Stress Test:
  python test_access_tool.py --stress 20 --card 1001234567 --door DOOR-01
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# ANSI Colors
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_GREEN = "\033[92m"
C_RED = "\033[91m"
C_YELLOW = "\033[93m"
C_CYAN = "\033[96m"
C_BLUE = "\033[94m"
C_MAGENTA = "\033[95m"
C_WHITE = "\033[97m"
C_DIM = "\033[2m"

DEFAULT_SERVER = "http://127.0.0.1:8000"


def print_banner():
    print(f"\n{C_CYAN}{C_BOLD}==============================================================={C_RESET}")
    print(f"{C_WHITE}{C_BOLD}   🛡️  PKS ACCESS CONTROL - CARD SWIPE & HARDWARE TEST TOOL   {C_RESET}")
    print(f"{C_CYAN}{C_BOLD}==============================================================={C_RESET}")


def send_http_request(url: str, payload: dict, timeout: float = 5.0) -> tuple[int, dict, float]:
    """Send JSON POST request using standard library urllib."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "PKS-Access-Test-Tool/1.0"},
    )
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body), elapsed_ms
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        error_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(error_body)
        except Exception:
            parsed = {"error": error_body}
        return e.code, parsed, elapsed_ms
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return 0, {"error": str(e)}, elapsed_ms


def send_query_request(url: str, params: dict, timeout: float = 5.0) -> tuple[int, dict, float]:
    """Send POST request with URL query parameters."""
    query_url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(query_url, method="POST", headers={"User-Agent": "PKS-Access-Test-Tool/1.0"})
    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return resp.status, json.loads(resp.read().decode("utf-8")), elapsed_ms
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        error_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(error_body)
        except Exception:
            parsed = {"error": error_body}
        return e.code, parsed, elapsed_ms
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return 0, {"error": str(e)}, elapsed_ms


def swipe_card(
    server_url: str,
    card_number: str,
    door_code: str,
    direction: str = "IN",
    reader_id: str = "CLI-TEST-RDR",
    device_code: str = "",
    verbose: bool = True,
) -> dict:
    """Request card access authorization."""
    endpoint = f"{server_url.rstrip('/')}/api/access/authorizations/card"
    payload = {
        "card_number": str(card_number).strip(),
        "door_code": str(door_code).strip(),
        "direction": direction.upper(),
        "reader_id": reader_id,
    }
    if device_code:
        payload["device_code"] = device_code

    if verbose:
        print(f"\n{C_BLUE}▶ Sending Card Swipe Event:{C_RESET}")
        print(f"  • Endpoint    : {endpoint}")
        print(f"  • Card Number : {C_BOLD}{card_number}{C_RESET}")
        print(f"  • Door Code   : {C_BOLD}{door_code}{C_RESET}")
        print(f"  • Direction   : {C_BOLD}{direction.upper()}{C_RESET}")
        print(f"  • Reader ID   : {reader_id}")

    status_code, response, latency = send_query_request(endpoint, payload)

    if verbose:
        print_swipe_result(status_code, response, latency)

    return {"status_code": status_code, "response": response, "latency_ms": latency}


def verify_challenge_2fa(
    server_url: str,
    session_token: str,
    pin_code: str,
    factor_type: str = "PIN",
    verbose: bool = True,
) -> dict:
    """Complete 2FA Challenge with PIN."""
    endpoint = f"{server_url.rstrip('/')}/api/access/authorizations/challenge/verify"
    payload = {
        "session_token": session_token,
        "factor_type": factor_type,
        "factor_value": str(pin_code),
    }
    if verbose:
        print(f"\n{C_YELLOW}▶ Submitting 2FA Second Factor (PIN):{C_RESET}")
        print(f"  • Endpoint     : {endpoint}")
        print(f"  • Factor Type  : {factor_type}")
        print(f"  • PIN Code     : ****")
        print(f"  • Session Token: {session_token[:12]}...")

    status_code, response, latency = send_http_request(endpoint, payload)
    if verbose:
        print_swipe_result(status_code, response, latency)

    return {"status_code": status_code, "response": response, "latency_ms": latency}


def print_swipe_result(status_code: int, res: dict, latency: float):
    """Format and display swipe result."""
    print(f"\n{C_DIM}--- Response Details (Latency: {latency:.1f} ms) ---{C_RESET}")

    if status_code != 200:
        print(f"  {C_RED}{C_BOLD}❌ HTTP ERROR {status_code}{C_RESET}")
        print(f"  Detail: {json.dumps(res, indent=2, ensure_ascii=False)}")
        return

    result = res.get("result", "UNKNOWN")
    granted = res.get("granted", False)
    reason = res.get("reason", "-")
    member = res.get("member_name", "Unknown")
    door = res.get("door_name", "Unknown")
    relay = res.get("unlock_relay", False)
    relay_time = res.get("relay_time", 0)
    from_z = res.get("from_zone", "-")
    to_z = res.get("to_zone", "-")
    log_id = res.get("log_id", "-")

    if granted:
        badge = f"{C_GREEN}{C_BOLD}🔓 [ACCESS GRANTED - ประตูเปิด]{C_RESET}"
        relay_str = f"{C_GREEN}{C_BOLD}YES (Pulse {relay_time}s){C_RESET}"
    elif result == "CHALLENGE_REQUIRED":
        badge = f"{C_YELLOW}{C_BOLD}⏳ [2FA CHALLENGE - รอ PIN/Factor 2]{C_RESET}"
        relay_str = f"{C_YELLOW}NO (Waiting 2FA){C_RESET}"
    else:
        badge = f"{C_RED}{C_BOLD}🚫 [ACCESS DENIED - ไม่อนุญาต]{C_RESET}"
        relay_str = f"{C_RED}NO (Locked){C_RESET}"

    print(f"  Result       : {badge}")
    print(f"  Reason       : {C_WHITE}{reason}{C_RESET}")
    print(f"  Cardholder   : {C_CYAN}{member}{C_RESET}")
    print(f"  Door Target  : {C_WHITE}{door}{C_RESET}")
    print(f"  Unlock Relay : {relay_str}")
    print(f"  Zone Movement: {from_z}  ➔  {to_z}")
    print(f"  Audit Log ID : #{log_id}")


def print_face_result(status_code: int, res: dict, latency: float):
    """Format and display face scan result."""
    print(f"\n{C_DIM}--- Face Recognition Details (Latency: {latency:.1f} ms) ---{C_RESET}")
    if status_code != 200:
        print(f"  {C_RED}{C_BOLD}❌ HTTP ERROR {status_code}{C_RESET}")
        print(f"  Detail: {json.dumps(res, indent=2, ensure_ascii=False)}")
        return

    result = res.get("result", "UNKNOWN")
    granted = res.get("granted", False)
    reason = res.get("reason", "-")
    member = res.get("member_name", "Unknown Person")
    door = res.get("door_name", "Unknown Door")
    conf = res.get("confidence_percent", "-")
    engine = res.get("engine_mode", "unknown")
    relay = res.get("unlock_relay", False)
    relay_time = res.get("relay_time", 0)
    log_id = res.get("log_id", "-")

    if granted:
        badge = f"{C_GREEN}{C_BOLD}🔓 [FACE RECOGNIZED - ACCESS GRANTED]{C_RESET}"
        relay_str = f"{C_GREEN}{C_BOLD}YES (Pulse {relay_time}s){C_RESET}"
    elif result == "UNREGISTERED":
        badge = f"{C_RED}{C_BOLD}🚫 [FACE UNREGISTERED - บุคคลภายนอก]{C_RESET}"
        relay_str = f"{C_RED}NO (Locked){C_RESET}"
    else:
        badge = f"{C_RED}{C_BOLD}🚫 [ACCESS DENIED]{C_RESET}"
        relay_str = f"{C_RED}NO (Locked){C_RESET}"

    print(f"  Result       : {badge}")
    print(f"  Reason       : {C_WHITE}{reason}{C_RESET}")
    print(f"  Identified As: {C_CYAN}{member}{C_RESET}")
    print(f"  Confidence   : {C_YELLOW}{C_BOLD}{conf}{C_RESET} (AI Engine: {engine})")
    print(f"  Door Target  : {C_WHITE}{door}{C_RESET}")
    print(f"  Unlock Relay : {relay_str}")
    print(f"  Audit Log ID : #{log_id}")


def scan_face(
    server_url: str,
    door_code: str = "DOOR-01",
    direction: str = "IN",
    member_code: str = "MEM-001",
    image_path: str = "",
    reader_id: str = "CAM-FACE-01",
    verbose: bool = True,
) -> dict:
    """Send Face Recognition event to /api/access/event/camera-face."""
    import base64

    endpoint = f"{server_url.rstrip('/')}/api/access/event/camera-face"
    payload = {
        "door_code": str(door_code).strip(),
        "direction": direction.upper(),
        "reader_id": reader_id,
    }

    if image_path:
        with open(image_path, "rb") as f:
            payload["image_base64"] = base64.b64encode(f.read()).decode("utf-8")
    else:
        payload["simulate_member_code"] = str(member_code).strip()

    if verbose:
        print(f"\n{C_MAGENTA}▶ Sending Camera Face Recognition Event:{C_RESET}")
        print(f"  • Endpoint     : {endpoint}")
        print(f"  • Door Code    : {C_BOLD}{door_code}{C_RESET}")
        print(f"  • Direction    : {C_BOLD}{direction.upper()}{C_RESET}")
        if image_path:
            print(f"  • Image File   : {image_path}")
        else:
            print(f"  • Target Member: {C_BOLD}{member_code}{C_RESET} (Simulation Vector)")

    status_code, response, latency = send_http_request(endpoint, payload)
    if verbose:
        print_face_result(status_code, response, latency)

    return {"status_code": status_code, "response": response, "latency_ms": latency}


def remote_unlock(server_url: str, door_id: int = 1, operator: str = "Admin-Tester"):
    """Send remote unlock command to /api/access/event/remote_unlock."""
    endpoint = f"{server_url.rstrip('/')}/api/access/event/remote_unlock"
    payload = {"door_id": door_id, "operator_name": operator}

    print(f"\n{C_MAGENTA}▶ Sending Remote Unlock Command:{C_RESET}")
    print(f"  • Endpoint : {endpoint}")
    print(f"  • Door ID  : {door_id}")
    print(f"  • Operator : {operator}")

    status_code, response, latency = send_http_request(endpoint, payload)
    print(f"\n{C_DIM}--- Response (Latency: {latency:.1f} ms) ---{C_RESET}")
    if status_code == 200 and response.get("success"):
        print(f"  {C_GREEN}{C_BOLD}🔓 [REMOTE UNLOCK GRANTED]{C_RESET}")
        print(f"  Door Name  : {response.get('door_name')}")
        print(f"  Relay Time : {response.get('relay_time')}s")
        print(f"  Audit Log  : #{response.get('log_id')}")
    else:
        print(f"  {C_RED}{C_BOLD}❌ FAILED: {response.get('detail') or response.get('message')}{C_RESET}")


def query_presence(server_url: str, search: str = ""):
    """Query live zone presence and list individuals inside each area."""
    endpoint = f"{server_url.rstrip('/')}/api/access/zone/presence/summary"
    req = urllib.request.Request(endpoint, headers={"User-Agent": "PKS-Access-Test-Tool/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  {C_RED}Failed to query zone presence: {e}{C_RESET}")
        return

    kpi = data.get("kpi", {})
    zones = data.get("zones", [])

    print(f"\n{C_CYAN}{C_BOLD}==================== LIVE ZONE PRESENCE SUMMARY ===================={C_RESET}")
    print(f"  • Total Inside Facility : {C_GREEN}{C_BOLD}{kpi.get('total_inside', 0)}{C_RESET} persons")
    print(f"  • Total Outside/Off-site: {C_DIM}{kpi.get('total_outside', 0)}{C_RESET} persons")
    print(f"  • Total Monitored Zones : {kpi.get('total_zones', 0)} zones")
    print("-" * 68)

    for z in zones:
        members = z.get("members", [])
        if search:
            members = [
                m for m in members
                if search.lower() in m.get("name", "").lower()
                or search.lower() in m.get("member_code", "").lower()
                or search.lower() in m.get("department", "").lower()
            ]

        curr = len(z.get("members", []))
        max_o = z.get("max_occupancy", 0)
        max_str = f"/ {max_o} max" if max_o > 0 else "(Unlimited)"

        print(f"\n{C_BOLD}📍 {z.get('name')} [{z.get('code')}]{C_RESET} - Occupancy: {C_YELLOW}{curr} {max_str}{C_RESET}")
        if not members:
            print(f"   {C_DIM}(ไม่มีบุคคลในพื้นที่นี้){C_RESET}")
        else:
            for m in members:
                status_icon = "🟢" if m.get("is_inside") else "⚪"
                print(f"   {status_icon} {C_CYAN}{m.get('member_code')}{C_RESET} | {C_BOLD}{m.get('name')}{C_RESET} ({m.get('department') or 'General'}) | เข้าเมื่อ: {m.get('last_access_time') or '-'}")

    print(f"\n{C_CYAN}{C_BOLD}===================================================================={C_RESET}\n")


def reset_apb(server_url: str, verbose: bool = True):
    """Reset Anti-Passback status for all members back to outside zone."""
    endpoint = f"{server_url.rstrip('/')}/api/access/zone/presence/reset_apb"
    status_code, response, latency = send_http_request(endpoint, {})
    if verbose:
        if status_code == 200 and response.get("success"):
            print(f"  {C_GREEN}{C_BOLD}✔ {response.get('message', 'Reset APB successfully')}{C_RESET}")
        else:
            print(f"  {C_RED}{C_BOLD}✘ Failed to reset APB: {response}{C_RESET}")
    return response


def run_preconfigured_scenarios(server_url: str):
    """Run a comprehensive battery of test scenarios."""
    print_banner()
    print(f"{C_BOLD}Running Full Access Control Test Battery against {server_url}...{C_RESET}")

    # Step 0: Ensure clean state by resetting APB for all members to outside zone
    print(f"{C_DIM}Setting initial baseline state (resetting APB state for all members)...{C_RESET}")
    reset_apb(server_url, verbose=False)
    time.sleep(0.3)

    scenarios = [
        {
            "name": "1. Valid Card Swipe (Entry)",
            "card": "1001234567",
            "door": "DOOR-01",
            "direction": "IN",
            "expect_result": "GRANTED",
            "desc": "สมชาย ใจดี ทาบบัตรเข้าประตูหลัก Turnstile 1 (ควรได้รับอนุญาต)",
        },
        {
            "name": "2. Anti-Passback (APB) Violation",
            "card": "1001234567",
            "door": "DOOR-01",
            "direction": "IN",
            "expect_result": "DENIED",
            "desc": "ทาบเข้าซ้ำอีกรอบทันทีโดยไม่ได้ทาบออก (ต้องโดน Anti-Passback บล็อก)",
        },
        {
            "name": "3. Valid Card Swipe (Exit)",
            "card": "1001234567",
            "door": "DOOR-02",
            "direction": "IN",
            "expect_result": "GRANTED",
            "desc": "สมชาย ทาบบัตรออกจากโถงต้อนรับผ่าน Turnstile 2 (ควรได้รับอนุญาต)",
        },
        {
            "name": "4. Blocked / Suspended Card",
            "card": "9990001111",
            "door": "DOOR-01",
            "direction": "IN",
            "expect_result": "DENIED",
            "desc": "บัตรผู้รับเหมาที่ถูกระงับสิทธิ์ (Status: blocked)",
        },
        {
            "name": "5. Unregistered RFID Card",
            "card": "9999999999",
            "door": "DOOR-01",
            "direction": "IN",
            "expect_result": "DENIED",
            "desc": "บัตรที่ไม่เคยลงทะเบียนในระบบ (Unregistered Card)",
        },
        {
            "name": "6. High-Security 2FA Challenge (Card)",
            "card": "1001234569",
            "door": "DOOR-03",
            "direction": "IN",
            "expect_result": "CHALLENGE_REQUIRED",
            "desc": "อนันต์ ทาบบัตรเข้า Data Center (ต้องติด 2FA Challenge รอ PIN)",
            "is_2fa": True,
            "pin": "8888",
        },
    ]

    summary = []

    for sc in scenarios:
        print(f"\n{C_CYAN}{C_BOLD}▶ Scenario: {sc['name']}{C_RESET}")
        print(f"  {C_DIM}{sc['desc']}{C_RESET}")
        res = swipe_card(
            server_url=server_url,
            card_number=sc["card"],
            door_code=sc["door"],
            direction=sc["direction"],
            verbose=True,
        )
        actual_result = res["response"].get("result", "ERR")
        pass_test = actual_result == sc["expect_result"]

        summary.append(
            {
                "name": sc["name"],
                "latency": res["latency_ms"],
                "result": actual_result,
                "passed": pass_test,
            }
        )

        # If 2FA scenario, complete with second factor PIN
        if sc.get("is_2fa") and actual_result == "CHALLENGE_REQUIRED":
            session_token = res["response"].get("session_token")
            if session_token:
                print(f"\n{C_CYAN}{C_BOLD}▶ Scenario: 6b. Complete 2FA with PIN Code ({sc['pin']}){C_RESET}")
                res_2fa = verify_challenge_2fa(server_url, session_token, sc["pin"], verbose=True)
                actual_2fa = res_2fa["response"].get("result", "ERR")
                pass_2fa = actual_2fa == "GRANTED"
                summary.append(
                    {
                        "name": "6b. 2FA Second Factor (PIN Verify)",
                        "latency": res_2fa["latency_ms"],
                        "result": actual_2fa,
                        "passed": pass_2fa,
                    }
                )

        time.sleep(0.4)

    # Print Summary Table
    print(f"\n{C_BOLD}======================= TEST SUMMARY REPORT ======================={C_RESET}")
    print(f"{'No. / Scenario':<36} | {'Result':<18} | {'Latency':<8} | {'Test Status'}")
    print("-" * 75)
    all_passed = True
    for item in summary:
        status_tag = f"{C_GREEN}PASS ✔{C_RESET}" if item["passed"] else f"{C_RED}FAIL ✘{C_RESET}"
        if not item["passed"]:
            all_passed = False
        print(f"{item['name']:<36} | {item['result']:<18} | {item['latency']:5.1f} ms | {status_tag}")

    print("-" * 75)
    if all_passed:
        print(f"{C_GREEN}{C_BOLD}🎉 ALL TEST SCENARIOS PASSED SUCCESSFULLY!{C_RESET}\n")
    else:
        print(f"{C_RED}{C_BOLD}⚠️ SOME TEST SCENARIOS FAILED! Check configuration.{C_RESET}\n")


def run_stress_test(server_url: str, count: int, card: str, door: str):
    """Benchmark the swipe API under sequential stress load."""
    print_banner()
    print(f"{C_BOLD}Starting Stress / Performance Benchmark against {server_url}{C_RESET}")
    print(f"  • Total Requests : {count}")
    print(f"  • Target Card    : {card}")
    print(f"  • Target Door    : {door}\n")

    latencies = []
    success_count = 0
    err_count = 0

    start_total = time.perf_counter()
    for i in range(1, count + 1):
        target_door = door if i % 2 == 1 else "DOOR-02"
        res = swipe_card(
            server_url=server_url,
            card_number=card,
            door_code=target_door,
            direction="IN",
            verbose=False,
        )
        lat = res["latency_ms"]
        latencies.append(lat)

        if res["status_code"] == 200:
            success_count += 1
            icon = f"{C_GREEN}✔{C_RESET}"
        else:
            err_count += 1
            icon = f"{C_RED}✘{C_RESET}"

        print(f"\r  [{i:03d}/{count:03d}] {icon} Latency: {lat:5.1f} ms | Door: {target_door:<7}", end="")
        sys.stdout.flush()

    total_time = time.perf_counter() - start_total
    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    min_lat = min(latencies) if latencies else 0
    max_lat = max(latencies) if latencies else 0
    rps = count / total_time if total_time > 0 else 0

    print(f"\n\n{C_BOLD}==================== BENCHMARK RESULTS ===================={C_RESET}")
    print(f"  • Total Completed : {count} requests in {total_time:.2f}s ({rps:.1f} req/sec)")
    print(f"  • Successful (200): {C_GREEN}{success_count}{C_RESET}")
    print(f"  • Failed          : {C_RED}{err_count}{C_RESET}")
    print(f"  • Average Latency : {C_BOLD}{avg_lat:.2f} ms{C_RESET}")
    print(f"  • Min / Max       : {min_lat:.1f} ms / {max_lat:.1f} ms")
    print(f"{C_BOLD}==========================================================={C_RESET}\n")


def interactive_menu(server_url: str):
    """Terminal Interactive Menu for easy manual testing."""
    while True:
        print_banner()
        print(f" Connected Server: {C_GREEN}{server_url}{C_RESET}\n")
        print("  [1] รันทุกชุดทดสอบอัตโนมัติ (Run All Pre-set Scenarios)")
        print("  [2] ทาบบัตรปกติ ขาเข้า (Valid Swipe IN  - 1001234567 -> DOOR-01)")
        print("  [3] ทาบบัตรปกติ ขาออก (Valid Swipe OUT - 1001234567 -> DOOR-02)")
        print("  [4] ทดสอบ Anti-Passback (ทาบเข้าซ้ำสองครั้งติด)")
        print("  [5] ทดสอบบัตรถูกระงับสิทธิ์ (Blocked Card - 9990001111)")
        print("  [6] ทดสอบบัตรไม่รู้จักในระบบ (Unregistered Card - 9999999999)")
        print("  [7] ทดสอบสแกนใบหน้าสมาชิก (Face Scan Member - สมชาย MEM-001)")
        print("  [8] ทดสอบสแกนใบหน้าบุคคลภายนอก (Face Scan Stranger - คนแปลกหน้า)")
        print("  [9] ระบุเลขบัตรและประตูเอง (Custom Card Swipe)")
        print("  [10] สั่งเปิดประตูระยะไกล (Remote Door Unlock)")
        print("  [11] ทดสอบ Stress / Load Test (20 requests)")
        print("  [12] ตรวจสอบรายชื่อบุคคลที่อยู่ในพื้นที่ (Zone Presence / Muster List)")
        print("  [0] ออกจากโปรแกรม (Exit)")
        print("-" * 63)

        choice = input(f"{C_BOLD}เลือกเมนู [0-12]: {C_RESET}").strip()

        if choice == "1":
            run_preconfigured_scenarios(server_url)
        elif choice == "2":
            swipe_card(server_url, "1001234567", "DOOR-01", "IN")
        elif choice == "3":
            swipe_card(server_url, "1001234567", "DOOR-02", "IN")
        elif choice == "4":
            print(f"\n{C_YELLOW}Step 1: Ensure OUT first...{C_RESET}")
            swipe_card(server_url, "1001234567", "DOOR-02", "IN", verbose=False)
            print(f"{C_YELLOW}Step 2: First Entry (Should Grant)...{C_RESET}")
            swipe_card(server_url, "1001234567", "DOOR-01", "IN")
            print(f"\n{C_YELLOW}Step 3: Second Entry immediately without exit (Should Deny APB)...{C_RESET}")
            swipe_card(server_url, "1001234567", "DOOR-01", "IN")
        elif choice == "5":
            swipe_card(server_url, "9990001111", "DOOR-01", "IN")
        elif choice == "6":
            swipe_card(server_url, "9999999999", "DOOR-01", "IN")
        elif choice == "7":
            scan_face(server_url, door_code="DOOR-01", direction="IN", member_code="MEM-001")
        elif choice == "8":
            scan_face(server_url, door_code="DOOR-01", direction="IN", member_code="STRANGER_GUEST_99")
        elif choice == "9":
            c = input("กรอกหมายเลขบัตร (Card Number): ").strip() or "1001234567"
            d = input("กรอกรหัสประตู (Door Code เช่น DOOR-01, GATE-01): ").strip() or "DOOR-01"
            dir_in = input("ทิศทาง [IN/OUT] (default: IN): ").strip().upper() or "IN"
            swipe_card(server_url, c, d, dir_in)
        elif choice == "10":
            d_id = input("ระบุ Door ID (default: 1): ").strip() or "1"
            remote_unlock(server_url, int(d_id))
        elif choice == "11":
            n = input("จำนวนรอบที่ต้องการยิงทดสอบ (default: 20): ").strip() or "20"
            run_stress_test(server_url, int(n), "1001234567", "DOOR-01")
        elif choice == "12":
            kw = input("ค้นหาชื่อ/รหัสพนักงาน/แผนก (กด Enter เพื่อดูทั้งหมด): ").strip()
            query_presence(server_url, search=kw)
        elif choice == "0":
            print(f"\n{C_CYAN}ลาก่อนครับ! (Goodbye){C_RESET}\n")
            break
        else:
            print(f"{C_RED}ตัวเลือกไม่ถูกต้อง กรุณาเลือก 0-12{C_RESET}")

        input(f"\n{C_DIM}กด [Enter] เพื่อกลับสู่เมนูหลัก...{C_RESET}")


def main():
    parser = argparse.ArgumentParser(
        description="PKS Access Control Card Swipe & Hardware Testing Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--server", default=DEFAULT_SERVER, help=f"Server Base URL (default: {DEFAULT_SERVER})")
    parser.add_argument("--run-all", action="store_true", help="Run full suite of test scenarios")
    parser.add_argument("--card", help="RFID Card Number to swipe")
    parser.add_argument("--door", default="DOOR-01", help="Door code (e.g. DOOR-01, GATE-01)")
    parser.add_argument("--direction", choices=["IN", "OUT", "in", "out"], default="IN", help="Direction (IN/OUT)")
    parser.add_argument("--reader", default="CLI-TEST-RDR", help="Hardware reader identifier")
    parser.add_argument("--device", default="", help="Device code (e.g. DEV-LOBBY-01)")
    parser.add_argument("--unlock", action="store_true", help="Trigger remote door unlock")
    parser.add_argument("--door-id", type=int, default=1, help="Door ID for remote unlock")
    parser.add_argument("--stress", type=int, help="Run stress test with N iterations")
    parser.add_argument("--face", help="Simulate face recognition for member code (e.g. MEM-001, STRANGER)")
    parser.add_argument("--image", default="", help="Path to real face snapshot image (.jpg/.png) to scan")
    parser.add_argument("--presence", nargs="?", const="", help="Query live zone presence and who is inside (optional: search keyword)")

    args = parser.parse_args()

    # Priority 1: CLI Flags
    if args.run_all:
        run_preconfigured_scenarios(args.server)
        return

    if args.unlock:
        remote_unlock(args.server, args.door_id)
        return

    if args.stress:
        run_stress_test(args.server, args.stress, args.card or "1001234567", args.door)
        return

    if args.face or args.image:
        scan_face(
            server_url=args.server,
            door_code=args.door,
            direction=args.direction,
            member_code=args.face or "MEM-001",
            image_path=args.image,
            reader_id=args.reader,
        )
        return

    if args.presence is not None:
        query_presence(args.server, search=args.presence)
        return

    if args.card:
        swipe_card(
            server_url=args.server,
            card_number=args.card,
            door_code=args.door,
            direction=args.direction,
            reader_id=args.reader,
            device_code=args.device,
        )
        return

    # Priority 2: If no flags passed, launch interactive CLI menu
    try:
        interactive_menu(args.server)
    except KeyboardInterrupt:
        print(f"\n\n{C_YELLOW}ยกเลิกโดยผู้ใช้งาน (Interrupted).{C_RESET}\n")


if __name__ == "__main__":
    main()
