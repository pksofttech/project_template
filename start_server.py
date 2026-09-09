"""Main Application Server Launcher with CLI Arguments, Pre-migration & Uvicorn Runner."""

import argparse
import asyncio
import os
import sys

import uvicorn
from uvicorn.logging import AccessFormatter

from app.core.database_init import database_init_default
from app.stdio import print_debug, print_error, print_success, print_warning


class CustomAccessFormatter(AccessFormatter):
    """Clean Uvicorn access formatter removing long query strings for readable terminal logs."""

    def formatMessage(self, record):
        if record.args and len(record.args) >= 5:
            client_addr, method, full_path, http_version, status_code = record.args
            path = full_path.split("?", 1)[0]
            record.args = (client_addr, method, path, http_version, status_code)
        return super().formatMessage(record)


LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "()": "uvicorn.logging.DefaultFormatter",
            "fmt": "%(levelprefix)s %(message)s",
            "use_colors": True,
        },
        "access": {
            "()": CustomAccessFormatter,
            "fmt": "\n%(levelprefix)s %(asctime)s | %(client_addr)s | %(status_code)s \n    \x1b[90m└─> %(request_line)s\x1b[0m \n",
            "use_colors": True,
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stderr",
        },
        "access": {
            "formatter": "access",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        "uvicorn": {"handlers": ["default"], "level": "INFO", "propagate": False},
        "uvicorn.error": {"handlers": ["default"], "level": "INFO", "propagate": False},
        "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
    },
}


def prepare_environment():
    """Ensure required system directories exist."""
    os.makedirs("./database", exist_ok=True)
    os.makedirs("./logs", exist_ok=True)
    os.makedirs("./static/uploads", exist_ok=True)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="PKS Modern Project Server Runner")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--dev", action="store_true", help="Run server with auto-reload (development mode)")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes (production)")
    return parser.parse_args()


def main():
    """Entrypoint function."""
    args = parse_args()
    prepare_environment()

    print_debug(f"🚀 Initializing server on {args.host}:{args.port} (Dev={args.dev})...")

    # Run Database Auto-Migrations and Seeding prior to launching web workers
    try:
        asyncio.run(database_init_default())
    except Exception as err:
        print_error(f"❌ Failed during database initialization: {err}")
        sys.exit(1)

    print_success(f"🌐 Server ready at http://localhost:{args.port}")
    print_success(f"📚 API Documentation at http://localhost:{args.port}/docs")

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.dev,
        workers=1 if args.dev else args.workers,
        log_config=LOGGING_CONFIG,
    )


if __name__ == "__main__":
    main()
