"""Application Configuration Module."""

import os
import platform
from dotenv import load_dotenv

from app.stdio import print_debug, print_success, time_now

# Load environment variables from .env if present
load_dotenv()


class AppConfig:
    """AppConfig centralized configuration class."""

    APP_NAME = os.getenv("APP_NAME", "PKS-ACCESS-CONTROL")
    APP_TITLE = os.getenv("APP_TITLE", "PKS Access Control Management")
    VERSION = os.getenv("VERSION", "1.0.0")
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    PROD_MODE = not DEBUG

    # Server Bind
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))

    # Security & JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pks-super-secret-key-change-in-production")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))

    # Host info & start time
    current_hostname = platform.node().upper()
    SERVER_START_TIME = time_now()

    print_debug("🚀 Initialize App Config")
    print_success(f"✅ APP_NAME: {APP_NAME} (v{VERSION})")
    print_success(f"✅ Current Hostname: {current_hostname}")
    print_success(f"✅ Running in {'DEBUG' if DEBUG else 'PRODUCTION'} mode")
