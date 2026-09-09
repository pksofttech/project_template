"""Health Check and System Status API."""

import os
import platform
import sys
from datetime import timedelta

import psutil
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config_app import AppConfig
from app.core.dependencies import AsyncDbDep
from app.stdio import print_error, time_now

router = APIRouter(tags=["Health & Monitoring"])


@router.get("/health", summary="Health check endpoint for Docker and monitoring systems")
@router.get("/api/health", summary="API health check and system status")
async def health_check(db: AsyncDbDep):
    """
    Health check and readiness probe.
    Tests database connectivity and reports CPU, Memory, Disk, and Uptime.
    """
    db_status = "ok"
    db_latency_ms = 0.0

    # 1. Ping SQLite database
    try:
        t0 = time_now()
        await db.execute(text("SELECT 1;"))
        db_latency_ms = round((time_now() - t0).total_seconds() * 1000, 2)
    except Exception as err:
        print_error(f"Health check database ping failed: {err}")
        db_status = f"error: {err}"

    # 2. Compute uptime
    now = time_now()
    uptime_seconds = int((now - AppConfig.SERVER_START_TIME).total_seconds())
    uptime_human = str(timedelta(seconds=uptime_seconds))

    # 3. System resource metrics via psutil
    try:
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage(os.path.abspath("."))
        system_stats = {
            "cpu_usage_percent": psutil.cpu_percent(interval=None),
            "memory_usage_percent": mem.percent,
            "memory_used_mb": round(mem.used / (1024 * 1024), 2),
            "memory_total_mb": round(mem.total / (1024 * 1024), 2),
            "disk_usage_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024 * 1024 * 1024), 2),
        }
    except Exception:
        system_stats = {}

    is_healthy = db_status == "ok"
    payload = {
        "status": "healthy" if is_healthy else "unhealthy",
        "app_name": AppConfig.APP_NAME,
        "version": AppConfig.VERSION,
        "mode": "DEBUG" if AppConfig.DEBUG else "PRODUCTION",
        "server_time": now.isoformat(),
        "uptime_seconds": uptime_seconds,
        "uptime_human": uptime_human,
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
            "engine": "SQLite WAL (aiosqlite)",
        },
        "resources": system_stats,
        "system": {
            "hostname": AppConfig.current_hostname,
            "platform": platform.platform(),
            "python_version": sys.version.split(" ")[0],
        },
    }

    return JSONResponse(
        content=payload,
        status_code=status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
