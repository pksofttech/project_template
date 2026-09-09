"""Application Configuration Module."""

import os
import platform

from app.stdio import print_debug, print_success


class AppConfig:
    """AppConfig centralized configuration class."""

    APP_NAME = "PROJECT-STARTER-PKS"
    APP_TITLE = "PKS Modern Management System"
    VERSION = "1.0.0"
    DEBUG = True
    PROD_MODE = False

    # Security & JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pks-super-secret-key-change-in-production")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))

    # Host info
    current_hostname = platform.node().upper()

    print_debug("🚀 Initialize App Config")
    print_success(f"✅ APP_NAME: {APP_NAME} (v{VERSION})")
    print_success(f"✅ Current Hostname: {current_hostname}")
