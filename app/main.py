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
from app.routes import api_sample, api_system_config, api_system_user, views
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

# --------------------------------------------------------
# 📁 STATIC ASSETS MOUNT
# --------------------------------------------------------
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# --------------------------------------------------------
# 📡 REAL-TIME SERVER-SENT EVENTS (SSE)
# --------------------------------------------------------
async def event_generator(request: Request, client_queue: asyncio.Queue):
    """Generator for streaming events to clients via SSE."""
    try:
        # Send initial welcome message
        yield {"event": "connected", "data": json.dumps({"status": "connected", "time": time_now().isoformat()})}

        while True:
            if await request.is_disconnected():
                break
            try:
                data = await asyncio.wait_for(client_queue.get(), timeout=20.0)
                yield {"event": "message", "data": json.dumps(data)}
            except TimeoutError:
                # Keep-alive ping
                yield {"event": "ping", "data": ""}
    finally:
        if client_queue in sse_clients:
            sse_clients.remove(client_queue)
            print_debug("Removed disconnected SSE client.")


@app.get("/sse", summary="Server-Sent Events endpoint", tags=["Real-time"])
async def sse_endpoint(request: Request):
    """SSE endpoint for browser EventSource clients."""
    client_queue: asyncio.Queue = asyncio.Queue()
    sse_clients.append(client_queue)
    return EventSourceResponse(event_generator(request, client_queue), headers={"content-encoding": "identity"})


@app.post("/broadcast_sse", summary="Broadcast message to SSE clients", tags=["Real-time"])
async def broadcast_sse_endpoint(payload: dict = Body(...)):  # noqa: B008
    """Broadcast an event payload to all active SSE subscribers."""
    broadcast_sse(payload)
    return {"success": True}


# --------------------------------------------------------
# 🚏 ROUTE REGISTRATIONS
# --------------------------------------------------------
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
        "now": time_now().strftime("%Y%m%d%H%M%S"),
    }
    if exc.status_code == 404:
        return templates.TemplateResponse("404.html", context, status_code=404)
    if exc.status_code == 403:
        return templates.TemplateResponse("403.html", context, status_code=403)

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

