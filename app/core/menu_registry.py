"""Central Registry for System Menus, Pages, and Home Widgets.

This module acts as the Single Source of Truth (SSOT) for all frontend routes,
sidebar navigation items, dashboard widgets, and role-based permissions.
"""

from typing import Any

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
        "title_th": "แดชบอร์ด",
        "url": "/page?page=dashboard",
        "icon": "fa-solid fa-gauge-high",
        "category": "main",
        "default_for_new_role": True,
        "description": "System analytics, traffic charts, and KPI counters",
    },
    {
        "code": "SAMPLE",
        "page": "sample",
        "title": "Sample Items",
        "title_th": "จัดการข้อมูลตัวอย่าง",
        "url": "/page?page=sample",
        "icon": "fa-solid fa-box-archive",
        "category": "main",
        "default_for_new_role": True,
        "description": "Sample CRUD DataTables management screen",
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
    },
]

# ---------------------------------------------------------------------------
# 📦 HOME WIDGETS REGISTRY (Cards displayed on Home Portal)
# ---------------------------------------------------------------------------
HOME_WIDGET_REGISTRY: list[dict[str, Any]] = [
    {
        "code": "GENERAL_SETTINGS",
        "title": "General Settings",
        "title_th": "ตั้งค่าทั่วไป",
        "icon": "fa-solid fa-gear",
        "url": "/page?page=system_config",
        "default_for_new_role": False,
    },
    {
        "code": "USER_MANAGEMENT",
        "title": "User Management",
        "title_th": "จัดการผู้ใช้",
        "icon": "fa-solid fa-users",
        "url": "/page?page=system_config",
        "default_for_new_role": False,
    },
    {
        "code": "USER_TYPES",
        "title": "User Types",
        "title_th": "กำหนดระดับผู้ใช้",
        "icon": "fa-solid fa-users-gear",
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
        "code": "REALTIME_SSE",
        "title": "Real-time SSE",
        "title_th": "ระบบแจ้งเตือนเรียลไทม์",
        "icon": "fa-solid fa-tower-broadcast",
        "url": "/page?page=system_config",
        "default_for_new_role": True,
    },
    {
        "code": "API_DOCS",
        "title": "API Documentation",
        "title_th": "เอกสาร API",
        "icon": "fa-solid fa-code",
        "url": "/docs",
        "default_for_new_role": True,
    },
    {
        "code": "SAMPLE_MANAGER",
        "title": "Sample Manager",
        "title_th": "จัดการข้อมูลตัวอย่าง",
        "icon": "fa-solid fa-boxes-stacked",
        "url": "/page?page=sample",
        "default_for_new_role": True,
    },
]

# ---------------------------------------------------------------------------
# ⚙️ SYSTEM SETTINGS MODULES REGISTRY
# ---------------------------------------------------------------------------
SYSTEM_SETTINGS_MODULES: list[dict[str, Any]] = [
    {"code": "GENERAL_SETTINGS", "title": "General Settings", "icon": "fa-solid fa-gear"},
    {"code": "USER_MANAGEMENT", "title": "User Management", "icon": "fa-solid fa-users"},
    {"code": "USER_TYPES", "title": "System User Types", "icon": "fa-solid fa-users-gear"},
    {"code": "DATABASE_MAINTENANCE", "title": "Database & Maintenance", "icon": "fa-solid fa-database"},
    {"code": "REALTIME_SSE", "title": "Real-time SSE", "icon": "fa-solid fa-tower-broadcast"},
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
