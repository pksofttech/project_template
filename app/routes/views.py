"""HTML Template View Routes (Jinja2 + DaisyUI v5)."""

from fastapi import APIRouter, Cookie, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.config_app import AppConfig
from app.core.auth import decode_access_token
from app.stdio import time_now

router = APIRouter(tags=["Frontend Views"])
templates = Jinja2Templates(directory="templates")


def get_view_context(request: Request, title: str = "", **kwargs) -> dict:
    """Standardized template context dictionary."""
    user = None
    token = request.cookies.get("access_token")
    if token:
        payload = decode_access_token(token)
        if payload:
            user = payload

    context = {
        "request": request,
        "title": title or AppConfig.APP_TITLE,
        "app_name": AppConfig.APP_NAME,
        "version": AppConfig.VERSION,
        "current_user": user,
        "now": time_now().strftime("%Y%m%d%H%M%S"),
    }
    context.update(kwargs)
    return context


@router.get("/", response_class=HTMLResponse)
async def index_view(request: Request):
    """Root route redirecting to dashboard or login."""
    token = request.cookies.get("access_token")
    if token and decode_access_token(token):
        return RedirectResponse(url="/dashboard", status_code=302)
    return RedirectResponse(url="/login", status_code=302)


@router.get("/login", response_class=HTMLResponse)
async def login_view(request: Request):
    """Render modern DaisyUI login screen."""
    token = request.cookies.get("access_token")
    if token and decode_access_token(token):
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
    return templates.TemplateResponse(
        "dashboard.html",
        get_view_context(request, title="Dashboard", active_page="dashboard"),
    )


@router.get("/sample", response_class=HTMLResponse)
async def sample_manager_view(request: Request):
    """Render sample CRUD DataTables management page."""
    return templates.TemplateResponse(
        "sample_manager.html",
        get_view_context(request, title="Sample Item Manager", active_page="sample"),
    )


@router.get("/system_config", response_class=HTMLResponse)
async def system_config_view(request: Request):
    """Render system configurations management page."""
    return templates.TemplateResponse(
        "system_config.html",
        get_view_context(request, title="System Settings", active_page="system_config"),
    )
