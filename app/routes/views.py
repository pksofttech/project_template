"""HTML Template View Routes (Jinja2 + DaisyUI v5)."""

import json
import os
from typing import Any

from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import select

from app.config_app import AppConfig
from app.core.auth import decode_access_token
from app.core.database import get_configurations
from app.core.dependencies import AsyncDbDep, SystemUserDep
from app.core.menu_registry import (
    HOME_WIDGET_REGISTRY,
    SYSTEM_MENU_REGISTRY,
    get_default_home_widgets_for_new_role,
    get_default_menus_for_new_role,
)
from app.core.models import System_User_Type, System_Users
from app.stdio import print_error, time_now

router = APIRouter(tags=["Frontend Views"])
templates = Jinja2Templates(directory="templates")


def get_authenticated_user(request: Request) -> dict | None:
    """Extract and validate the currently authenticated user from request cookies or headers."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = payload.copy()
            if "system_user_type_id" not in user:
                role = str(user.get("role", "")).upper()
                user["system_user_type_id"] = 1 if role in ("ROOT", "SYSTEM") else (2 if role == "ADMIN" else 4)
            return user
    return None


def get_view_context(request: Request, title: str = "", current_user: Any = None, **kwargs) -> dict:
    """Standardized template context dictionary."""
    user = current_user if current_user is not None else get_authenticated_user(request)
    current_theme = request.cookies.get("theme", "")

    context = {
        "request": request,
        "title": title or AppConfig.APP_TITLE,
        "app_name": AppConfig.APP_NAME,
        "version": AppConfig.VERSION,
        "current_user": user,
        "user": user,
        "current_theme": current_theme,
        "now": time_now().strftime("%Y%m%d%H%M%S"),
        "user_menus": kwargs.pop("user_menus", SYSTEM_MENU_REGISTRY),
        "card_menu_home": kwargs.pop("card_menu_home", [w["title"] for w in HOME_WIDGET_REGISTRY]),
    }
    context.update(kwargs)
    return context


@router.get("/", response_class=HTMLResponse)
async def index_view(request: Request):
    """Root route redirecting to home portal or login."""
    if get_authenticated_user(request):
        return RedirectResponse(url="/page?page=home", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@router.get("/login", response_class=HTMLResponse)
async def login_view(request: Request):
    """Render modern DaisyUI login screen."""
    if get_authenticated_user(request):
        return RedirectResponse(url="/dashboard", status_code=302)
    return templates.TemplateResponse("login.html", get_view_context(request, title="Sign In"))


@router.get("/logout")
async def logout_view(response: Response):
    """Clear session cookie and redirect to login."""
    res = RedirectResponse(url="/login", status_code=302)
    res.delete_cookie("access_token")
    return res


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_view(request: Request):
    """Render main administration dashboard."""
    user = get_authenticated_user(request)
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse(
        "dashboard.html",
        get_view_context(request, title="Dashboard", active_page="dashboard", current_user=user),
    )


@router.get("/sample", response_class=HTMLResponse)
async def sample_manager_view(request: Request):
    """Render sample CRUD DataTables management page."""
    user = get_authenticated_user(request)
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse(
        "sample_manager.html",
        get_view_context(request, title="Sample Item Manager", active_page="sample", current_user=user),
    )


@router.get("/system_config", response_class=HTMLResponse)
async def system_config_view(request: Request):
    """Render system configurations management page."""
    user = get_authenticated_user(request)
    if not user:
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse(
        "system_config.html",
        get_view_context(request, title="System Settings", active_page="system_config", current_user=user),
    )


@router.get("/page", include_in_schema=False)
async def ep_page(
    request: Request,
    page: str,
    db: AsyncDbDep,
    user: SystemUserDep,
):
    """Render dynamic HTML view template by page name."""
    clean_page = os.path.basename(page).removesuffix(".html")
    is_root = (user.system_user_type_id == 1) or (getattr(user, "role", "").upper() in ("ROOT", "SYSTEM"))

    # 1. Fetch System User Type configurations
    user_type_row = (
        await db.execute(select(System_User_Type).where(System_User_Type.id == user.system_user_type_id))
    ).scalar_one_or_none()

    menu_config = []
    system_config = {}
    home_item_config = []

    if user_type_row:
        try:
            menu_config = json.loads(user_type_row.menu_config) if user_type_row.menu_config else []
        except Exception as err:
            print_error(f"Error parsing menu_config: {err}")

        try:
            system_config = json.loads(user_type_row.system_config) if user_type_row.system_config else {}
        except Exception as err:
            print_error(f"Error parsing system_config: {err}")

        try:
            home_item_config = json.loads(user_type_row.home_item_config) if user_type_row.home_item_config else []
        except Exception as err:
            print_error(f"Error parsing home_item_config: {err}")

    # 2. Dynamic Menu & Access Control Resolution (Supporting Newly Created Roles & Pages)
    if is_root:
        active_menus = SYSTEM_MENU_REGISTRY
        allowed_pages = {m["page"] for m in SYSTEM_MENU_REGISTRY} | {"home", "dashboard", "404", "403"}
        active_home_widgets = [w["title"] for w in HOME_WIDGET_REGISTRY]
    elif not menu_config:
        # Fallback for newly created roles that do not have custom menu_config saved yet
        active_menus = get_default_menus_for_new_role()
        allowed_pages = {m["page"] for m in active_menus} | {"home", "dashboard", "404", "403"}
        active_home_widgets = get_default_home_widgets_for_new_role()
    else:
        # User role with saved menu configuration
        allowed_codes = set(menu_config)
        active_menus = [m for m in SYSTEM_MENU_REGISTRY if m["code"] in allowed_codes]
        allowed_pages = {m["page"] for m in active_menus} | {"home", "dashboard", "404", "403"}
        active_home_widgets = home_item_config if home_item_config else get_default_home_widgets_for_new_role()

    # 3. Route Access Authorization Guard
    base_page = clean_page.removesuffix("_manager")
    if clean_page not in allowed_pages and base_page not in allowed_pages and not is_root:
        context_403 = get_view_context(
            request,
            title="403 Forbidden",
            current_user=user,
            active_page="403",
            user_menus=active_menus,
        )
        return templates.TemplateResponse("403.html", context_403, status_code=403)

    # 4. Resolve template file
    page_template = f"{clean_page}.html"
    if not os.path.isfile(os.path.join("templates", page_template)):
        if os.path.isfile(os.path.join("templates", f"{clean_page}_manager.html")):
            page_template = f"{clean_page}_manager.html"
        else:
            page_template = "404.html"

    # 5. Fetch system configurations & user records
    _sql = select(System_Users)
    users = (await db.execute(_sql)).scalars().all()

    app_configurations_name = await get_configurations(db, "app_configurations_name")
    app_configurations_address = await get_configurations(db, "app_configurations_address")
    app_configurations_phone = await get_configurations(db, "app_configurations_phone")
    app_configurations_vat_no = await get_configurations(db, "app_configurations_vat_no")
    app_configurations_remark = await get_configurations(db, "app_configurations_remark")
    app_configurations_image = await get_configurations(db, "app_configurations_image")
    app_configurations_image_wallpaper = await get_configurations(db, "app_configurations_image_wallpaper")

    app_title = await get_configurations(db, "app_title") or AppConfig.APP_TITLE
    config_menu = await get_configurations(db, "config_menu", as_type="dict")

    title = clean_page.replace("_", " ").title()

    context = get_view_context(
        request,
        title=title,
        current_user=user,
        active_page=clean_page,
        app_title=app_title,
        app_configurations_name=app_configurations_name or AppConfig.APP_NAME,
        app_configurations_image=app_configurations_image or "/static/image/logo.jpg",
        app_configurations_image_wallpaper=app_configurations_image_wallpaper or "/static/image/logo.jpg",
        app_configurations_address=app_configurations_address,
        app_configurations_phone=app_configurations_phone,
        app_configurations_vat_no=app_configurations_vat_no,
        app_configurations_remark=app_configurations_remark,
        config_menu=config_menu,
        menu_config=menu_config,
        system_config=system_config,
        home_item_config=home_item_config,
        user_menus=active_menus,
        card_menu_home=active_home_widgets,
        users=users,
        datas={},
    )

    status_code = 404 if page_template == "404.html" else 200
    return templates.TemplateResponse(
        page_template,
        context,
        status_code=status_code,
    )
