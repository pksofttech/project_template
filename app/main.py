"""Main FastAPI Application Entrypoint."""

import asyncio
import json
import os
from contextlib import asynccontextmanager

from fastapi import Body, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sse_starlette.sse import EventSourceResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config_app import AppConfig
from app.core.database import init_sqlite_pragmas
from app.core.database_init import database_init_default
from app.core.utility import broadcast_sse, sse_clients
from app.routes import (
    api_access_card,
    api_access_door,
    api_access_event,
    api_access_group,
    api_access_log,
    api_access_member,
    api_access_zone,
    api_health,
    api_sample,
    api_system_config,
    api_system_user,
    api_upload,
    views,
)
from app.stdio import print_debug, time_now


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    print_debug(f"🧬 Application Lifespan Start: {time_now()}")
    await init_sqlite_pragmas()
    await database_init_default()
    yield
    print_debug("🛑 Application shutting down...")


app = FastAPI(
    title=AppConfig.APP_TITLE,
    version=AppConfig.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
    description="Modern FastAPI & DaisyUI Application Template",
)

# --------------------------------------------------------
# 🛡️ MIDDLEWARES
# --------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add standard enterprise security headers to all HTTP responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# --------------------------------------------------------
# 📁 STATIC ASSETS MOUNT (WITH BROWSER CACHING)
# --------------------------------------------------------
os.makedirs("static", exist_ok=True)


class CachedStaticFiles(StaticFiles):
    """Static asset handler with 7-day browser caching headers."""

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=604800, stale-while-revalidate=86400"
        return response


app.mount("/static", CachedStaticFiles(directory="static"), name="static")


# --------------------------------------------------------
# 📡 REAL-TIME SERVER-SENT EVENTS (SSE)
# --------------------------------------------------------
SSE_QUEUE_MAXSIZE = 100
SSE_RETRY_TIMEOUT_MS = 3000  # Instruct browser EventSource to wait 3s before reconnecting


async def event_generator(request: Request, client_queue: asyncio.Queue):
    """Generator for streaming events to clients via SSE."""
    try:
        # Send initial welcome message with reconnect retry directive
        yield {
            "event": "connected",
            "retry": SSE_RETRY_TIMEOUT_MS,
            "data": json.dumps({"status": "connected", "time": time_now().isoformat()}),
        }

        while True:
            if await request.is_disconnected():
                break
            try:
                msg = await asyncio.wait_for(client_queue.get(), timeout=20.0)
                if isinstance(msg, dict) and "event" in msg and "data" in msg:
                    raw_data = msg["data"]
                    event_data = json.dumps(raw_data) if not isinstance(raw_data, str) else raw_data
                    yield {"event": msg["event"], "data": event_data}
                else:
                    event_data = json.dumps(msg) if not isinstance(msg, str) else msg
                    yield {"event": "message", "data": event_data}
            except TimeoutError:
                # Keep-alive ping
                yield {"event": "ping", "data": ""}
    except asyncio.CancelledError:
        # Expected when client tab closes or navigates to another page
        pass
    finally:
        if client_queue in sse_clients:
            sse_clients.remove(client_queue)
            print_debug(f"SSE client disconnected (active clients: {len(sse_clients)})")


@app.get("/sse", summary="Server-Sent Events endpoint", tags=["Real-time"])
async def sse_endpoint(request: Request):
    """SSE endpoint for browser EventSource clients."""
    client_queue: asyncio.Queue = asyncio.Queue(maxsize=SSE_QUEUE_MAXSIZE)
    sse_clients.append(client_queue)
    print_debug(f"SSE client connected (active clients: {len(sse_clients)})")

    return EventSourceResponse(
        event_generator(request, client_queue),
        ping=20,
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Encoding": "identity",
        },
    )


@app.post("/broadcast_sse", summary="Broadcast message to SSE clients", tags=["Real-time"])
async def broadcast_sse_endpoint(payload: dict = Body(...)):  # noqa: B008
    """Broadcast an event payload to all active SSE subscribers."""
    broadcast_sse(payload)
    return {"success": True, "active_clients": len(sse_clients)}


# --------------------------------------------------------
# 🚏 ROUTE REGISTRATIONS
# --------------------------------------------------------
app.include_router(api_health.router)
app.include_router(api_upload.router)
app.include_router(api_access_event.router)
app.include_router(api_access_door.router)
app.include_router(api_access_member.router)
app.include_router(api_access_card.router)
app.include_router(api_access_group.router)
app.include_router(api_access_zone.router)
app.include_router(api_access_log.router)
app.include_router(api_sample.router)
app.include_router(api_system_user.router, prefix="/api/system_user")
app.include_router(api_system_user.router, prefix="/api/systems_user")
app.include_router(api_system_config.router)
app.include_router(views.router)


# --------------------------------------------------------
# 🚨 ERROR & EXCEPTION HANDLERS (404 / 403)
# --------------------------------------------------------
templates = Jinja2Templates(directory="templates")


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Render beautiful HTML error pages for browsers or JSON for API requests."""
    accept = request.headers.get("accept", "")
    if request.url.path.startswith("/api/") or "application/json" in accept:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    context = {
        "request": request,
        "title": f"{exc.status_code} Error",
        "app_name": AppConfig.APP_NAME,
        "url": request.url.path,
        "detail": exc.detail,
        "current_theme": request.cookies.get("theme", ""),
        "now": time_now().strftime("%Y%m%d%H%M%S"),
    }
    if exc.status_code == 404:
        return templates.TemplateResponse("404.html", context, status_code=404)
    if exc.status_code == 403:
        return templates.TemplateResponse("403.html", context, status_code=403)

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

