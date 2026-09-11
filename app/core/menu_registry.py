"""Central Registry for System Menus, Pages, and Home Widgets.

This module acts as the Single Source of Truth (SSOT) for all frontend routes,
sidebar navigation items, dashboard widgets, and role-based permissions.
"""

from typing import Any

# ---------------------------------------------------------------------------
# ⚙️ SYSTEM SETTINGS MODULES REGISTRY (Submenus for Settings)
# ---------------------------------------------------------------------------
SYSTEM_SETTINGS_MODULES: list[dict[str, Any]] = [
    {
        "code": "GENERAL_SETTINGS",
        "title": "General Settings",
        "title_th": "ตั้งค่าทั่วไป",
        "icon": "fa-solid fa-gear",
        "url": "/page?page=system_config#tab=general",
        "tab": "general",
    },
    {
        "code": "USER_MANAGEMENT",
        "title": "User Management",
        "title_th": "จัดการผู้ใช้งาน",
        "icon": "fa-solid fa-users",
        "url": "/page?page=system_config#tab=users",
        "tab": "users",
    },
    {
        "code": "USER_TYPES",
        "title": "Roles & Permissions",
        "title_th": "บทบาทและสิทธิ์",
        "icon": "fa-solid fa-users-gear",
        "url": "/page?page=system_config#tab=roles",
        "tab": "roles",
    },
    {
        "code": "DATABASE_MAINTENANCE",
        "title": "Database & Backup",
        "title_th": "ฐานข้อมูลและสำรอง",
        "icon": "fa-solid fa-database",
        "url": "/page?page=system_config#tab=database",
        "tab": "database",
    },
    {
        "code": "REALTIME_SSE",
        "title": "Real-time Broadcast",
        "title_th": "ทดสอบสัญญาณสด (SSE)",
        "icon": "fa-solid fa-tower-broadcast",
        "url": "/page?page=system_config#tab=sse",
        "tab": "sse",
    },
]

# ---------------------------------------------------------------------------
# 🧭 ALL SYSTEM MENUS & PAGES REGISTRY
# ---------------------------------------------------------------------------
SYSTEM_MENU_REGISTRY: list[dict[str, Any]] = [
    {
        "code": "HOME",
        "page": "home",
        "title": "Home",
        "title_th": "หน้าหลัก",
        "url": "/page?page=home",
        "icon": "fa-solid fa-house",
        "category": "main",
        "default_for_new_role": True,
        "description": "Main dashboard portal and summary overview",
    },
    {
        "code": "DASHBOARD",
        "page": "dashboard",
        "title": "Dashboard",
        "title_th": "แดชบอร์ดสถิติ",
        "url": "/page?page=dashboard",
        "icon": "fa-solid fa-chart-line",
        "category": "main",
        "default_for_new_role": True,
        "description": "Access statistics, swipe analytics, and KPI counters",
    },
    {
        "code": "LIVE_MONITOR",
        "page": "live_monitor",
        "title": "Live Monitor",
        "title_th": "มอนิเตอร์สด",
        "url": "/page?page=live_monitor",
        "icon": "fa-solid fa-tower-broadcast",
        "category": "access",
        "default_for_new_role": True,
        "description": "Real-time card swipe monitor & remote door control",
    },
    {
        "code": "ACCESS_LOGS",
        "page": "access_logs",
        "title": "Access Logs",
        "title_th": "ประวัติการเข้า-ออก",
        "url": "/page?page=access_logs",
        "icon": "fa-solid fa-clock-rotate-left",
        "category": "access",
        "default_for_new_role": True,
        "description": "Audit trail of all card swipes, permissions, and doors",
    },
    {
        "code": "MEMBERS",
        "page": "members",
        "title": "Cardholders",
        "title_th": "ผู้ถือบัตร / สมาชิก",
        "url": "/page?page=members",
        "icon": "fa-solid fa-id-card-clip",
        "category": "access",
        "default_for_new_role": True,
        "description": "Manage personnel, visitors, departments, and credentials",
    },
    {
        "code": "CARDS",
        "page": "cards",
        "title": "Access Cards",
        "title_th": "บัตร RFID / คีย์การ์ด",
        "url": "/page?page=cards",
        "icon": "fa-solid fa-credit-card",
        "category": "access",
        "default_for_new_role": True,
        "description": "Manage RFID cards, keycards, statuses, and cardholders",
    },
    {
        "code": "DOORS",
        "page": "doors",
        "title": "Doors & Gates",
        "title_th": "ประตูและไม้กั้น",
        "url": "/page?page=doors",
        "icon": "fa-solid fa-door-open",
        "category": "access",
        "default_for_new_role": True,
        "description": "Manage access points, barrier gates, turnstiles, and relays",
    },
    {
        "code": "ACCESS_GROUPS",
        "page": "access_groups",
        "title": "Access Groups",
        "title_th": "กลุ่มสิทธิ์เข้า-ออก",
        "url": "/page?page=access_groups",
        "icon": "fa-solid fa-user-shield",
        "category": "access",
        "default_for_new_role": True,
        "description": "Define access permission rules, timezones, and door access",
    },
    {
        "code": "ZONES",
        "page": "zones",
        "title": "Access Zones",
        "title_th": "จัดการโซนพื้นที่",
        "url": "/page?page=zones",
        "icon": "fa-solid fa-layer-group",
        "category": "access",
        "default_for_new_role": True,
        "description": "Define security areas, anti-passback rules, and occupancy limits",
    },
    {
        "code": "ZONE_PRESENCE",
        "page": "zone_presence",
        "title": "Zone Presence & Muster",
        "title_th": "ติดตามพิกัด & รายงานฉุกเฉิน",
        "url": "/page?page=zone_presence",
        "icon": "fa-solid fa-person-shelter",
        "category": "access",
        "default_for_new_role": True,
        "description": "Real-time member presence, occupancy density, and emergency muster roll call",
    },
    {
        "code": "FACE_REVIEW",
        "page": "face_review",
        "title": "Face Review",
        "title_th": "รีวิวภาพใบหน้า (Face Audit)",
        "url": "/page?page=face_review",
        "icon": "fa-solid fa-camera-rotate",
        "category": "access",
        "default_for_new_role": True,
        "description": "Face recognition audit gallery, snapshot verification, and confidence review",
    },
    {
        "code": "SYSTEM_CONFIG",
        "page": "system_config",
        "title": "Settings",
        "title_th": "ตั้งค่าระบบ",
        "url": "/page?page=system_config",
        "icon": "fa-solid fa-sliders",
        "category": "system",
        "default_for_new_role": False,
        "required_roles": ["ROOT", "ADMIN"],
        "description": "System configurations, user administration, and roles",
        "children": SYSTEM_SETTINGS_MODULES,
    },
]

# ---------------------------------------------------------------------------
# 📦 HOME WIDGETS REGISTRY (Cards displayed on Home Portal)
# ---------------------------------------------------------------------------
HOME_WIDGET_REGISTRY: list[dict[str, Any]] = [
    {
        "code": "LIVE_MONITOR",
        "title": "Live Monitor",
        "title_th": "มอนิเตอร์สด Real-time",
        "icon": "fa-solid fa-tower-broadcast",
        "url": "/page?page=live_monitor",
        "default_for_new_role": True,
    },
    {
        "code": "ACCESS_LOGS",
        "title": "Access Logs",
        "title_th": "ประวัติการเข้า-ออก",
        "icon": "fa-solid fa-clock-rotate-left",
        "url": "/page?page=access_logs",
        "default_for_new_role": True,
    },
    {
        "code": "MEMBERS",
        "title": "Cardholders",
        "title_th": "จัดการผู้ถือบัตร",
        "icon": "fa-solid fa-id-card-clip",
        "url": "/page?page=members",
        "default_for_new_role": True,
    },
    {
        "code": "CARDS",
        "title": "Access Cards",
        "title_th": "จัดการบัตร RFID",
        "icon": "fa-solid fa-credit-card",
        "url": "/page?page=cards",
        "default_for_new_role": True,
    },
    {
        "code": "DOORS",
        "title": "Doors & Gates",
        "title_th": "ประตูและไม้กั้น",
        "icon": "fa-solid fa-door-open",
        "url": "/page?page=doors",
        "default_for_new_role": True,
    },
    {
        "code": "ACCESS_GROUPS",
        "title": "Access Groups",
        "title_th": "กลุ่มสิทธิ์เข้า-ออก",
        "icon": "fa-solid fa-user-shield",
        "url": "/page?page=access_groups",
        "default_for_new_role": True,
    },
    {
        "code": "ZONES",
        "title": "Access Zones",
        "title_th": "โซนพื้นที่",
        "icon": "fa-solid fa-layer-group",
        "url": "/page?page=zones",
        "default_for_new_role": True,
    },
    {
        "code": "ZONE_PRESENCE",
        "title": "Zone Presence",
        "title_th": "ติดตามพิกัดผู้ใช้",
        "icon": "fa-solid fa-person-shelter",
        "url": "/page?page=zone_presence",
        "default_for_new_role": True,
    },
    {
        "code": "FACE_REVIEW",
        "title": "Face Review",
        "title_th": "รีวิวภาพใบหน้า Access",
        "icon": "fa-solid fa-camera-rotate",
        "url": "/page?page=face_review",
        "default_for_new_role": True,
    },
    {
        "code": "GENERAL_SETTINGS",
        "title": "General Settings",
        "title_th": "ตั้งค่าทั่วไป",
        "icon": "fa-solid fa-gear",
        "url": "/page?page=system_config",
        "default_for_new_role": False,
    },
    {
        "code": "DATABASE_BACKUP",
        "title": "Database & Backup",
        "title_th": "ฐานข้อมูลและสำรอง",
        "icon": "fa-solid fa-database",
        "url": "/page?page=system_config",
        "default_for_new_role": False,
    },
    {
        "code": "API_DOCS",
        "title": "API Documentation",
        "title_th": "เอกสาร API",
        "icon": "fa-solid fa-code",
        "url": "/docs",
        "default_for_new_role": True,
    },
]



def get_menu_by_page(page_name: str) -> dict[str, Any] | None:
    """Find menu metadata by page identifier."""
    clean = page_name.lower().removesuffix('.html')
    for item in SYSTEM_MENU_REGISTRY:
        if item['page'].lower() == clean or f"{item['page']}_manager".lower() == clean:
            return item
    return None


def get_default_menus_for_new_role() -> list[dict[str, Any]]:
    """Get list of menu items enabled by default for newly created user types."""
    return [m for m in SYSTEM_MENU_REGISTRY if m.get('default_for_new_role', False)]


def get_default_home_widgets_for_new_role() -> list[str]:
    """Get list of widget titles enabled by default for newly created user types."""
    return [w['title'] for w in HOME_WIDGET_REGISTRY if w.get('default_for_new_role', False)]
