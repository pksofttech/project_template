"""stdio for standard for app using Python standard logging"""

import logging
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import wraps
from logging.handlers import RotatingFileHandler
from zoneinfo import ZoneInfo


@dataclass
class DebugColor:
    """class DebugColor"""

    Default = "\033[39m"
    Black = "\033[30m"
    Red = "\033[31m"
    Green = "\033[32m"
    Yellow = "\033[33m"
    Blue = "\033[34m"
    Magenta = "\033[35m"
    Cyan = "\033[36m"
    LightGray = "\033[37m"
    DarkGray = "\033[90m"
    LightRed = "\033[91m"
    LightGreen = "\033[92m"
    LightYellow = "\033[93m"
    LightBlue = "\033[94m"
    LightMagenta = "\033[95m"
    LightCyan = "\033[96m"
    White = "\033[97m"

    HEADER = "\033[95m"
    DEBUG = Cyan
    SUCCESS = Green
    WARNING = Yellow
    ERROR = Red
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    INFO = "\033[96m"

    I = "\033[3m"
    U = "\033[4m"


# Define custom log level for SUCCESS (between INFO and WARNING)
SUCCESS_LEVEL_NUM = 25
logging.addLevelName(SUCCESS_LEVEL_NUM, "SUCCESS")


class ColoredConsoleFormatter(logging.Formatter):
    """Custom compact, clean and beautiful logging formatter for console output."""

    LEVEL_BADGES = {  # noqa: RUF012
        logging.DEBUG: DebugColor.Cyan + DebugColor.I + "[DEBUG]" + DebugColor.ENDC + "  ",
        SUCCESS_LEVEL_NUM: DebugColor.Green + DebugColor.BOLD + "[SUCCESS]" + DebugColor.ENDC + " ",
        logging.INFO: DebugColor.Cyan + DebugColor.BOLD + "[INFO]" + DebugColor.ENDC + "   ",
        logging.WARNING: DebugColor.Yellow + DebugColor.BOLD + "[WARN]" + DebugColor.ENDC + "   ",
        logging.ERROR: DebugColor.Red + DebugColor.BOLD + "[ERROR]" + DebugColor.ENDC + "  ",
        logging.CRITICAL: DebugColor.FAIL + DebugColor.BOLD + "[CRIT]" + DebugColor.ENDC + "   ",
    }

    def format(self, record: logging.LogRecord) -> str:
        asctime = self.formatTime(record, "%H:%M:%S")
        badge = self.LEVEL_BADGES.get(record.levelno, f"[{record.levelname}]")
        location = f"{DebugColor.DarkGray}[{record.filename}:{record.lineno}]{DebugColor.ENDC}"
        msg = record.getMessage()
        return f"{DebugColor.DarkGray}{asctime}{DebugColor.ENDC} {badge} {location} {msg}"


# Configure central logger
logger = logging.getLogger("app")
logger.setLevel(logging.DEBUG)
logger.propagate = False  # Avoid duplicating log messages in root logger

if not logger.handlers:
    # 1. Console Stream Handler (With colors)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredConsoleFormatter())
    logger.addHandler(console_handler)

    # 2. Rotating File Handler (Clean text logs saved to logs/app.log)
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        log_dir = os.path.join(base_dir, "logs")
        os.makedirs(log_dir, exist_ok=True)
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, "app.log"),
            maxBytes=10 * 1024 * 1024,  # 10 MB per log file
            backupCount=5,
            encoding="utf-8",
        )
        file_formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(filename)s:%(lineno)d #%(funcName)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    except Exception:  # noqa: BLE001, S110
        pass


def print_debug(*args, **kwargs):
    """print debug with logging"""
    sep = kwargs.get("sep", " ")
    msg = sep.join(str(a) for a in args) if args else ""
    logger.debug(msg, stacklevel=kwargs.get("stacklevel", 2))


def print_info(*args, **kwargs):
    """print info with logging"""
    sep = kwargs.get("sep", " ")
    msg = sep.join(str(a) for a in args) if args else ""
    logger.info(msg, stacklevel=kwargs.get("stacklevel", 2))


def print_warning(*args, **kwargs):
    """print warning with logging"""
    sep = kwargs.get("sep", " ")
    msg = sep.join(str(a) for a in args) if args else ""
    logger.warning(msg, stacklevel=kwargs.get("stacklevel", 2))


def _print_error(*args, **kwargs):
    """internal error printer with configurable stacklevel"""
    sep = kwargs.get("sep", " ")
    msg = sep.join(str(a) for a in args) if args else ""
    logger.error(msg, stacklevel=kwargs.get("stacklevel", 2))


def print_success(*args, **kwargs):
    """print success with logging"""
    sep = kwargs.get("sep", " ")
    msg = sep.join(str(a) for a in args) if args else ""
    logger.log(SUCCESS_LEVEL_NUM, msg, stacklevel=kwargs.get("stacklevel", 2))


def print_error_info():
    """print error info"""
    try:
        exc_type, exc_obj, exc_tb = sys.exc_info()
        if exc_type and exc_tb:
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            _print_error("*" * 50, stacklevel=3)
            _print_error(f"{exc_type.__name__} in {fname}:{exc_tb.tb_lineno}", stacklevel=3)
            _print_error(str(exc_obj), stacklevel=3)
            _print_error("*" * 50, stacklevel=3)
    except Exception as err:  # noqa: BLE001
        _print_error(f"print_error_info failed: {err}", stacklevel=3)


def print_error(*args, **kwargs):
    """print error with info"""
    kwargs_err = dict(kwargs)
    kwargs_err["stacklevel"] = kwargs_err.get("stacklevel", 3)
    _print_error(*args, **kwargs_err)
    print_error_info()


def debug_timer(func):
    """debug_timer"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        msg = f"{func.__name__} took {(end - start):.3f}s"
        logger.debug(msg, stacklevel=2)
        return result

    return wrapper


def time_now(utc=False):
    """time tool - returns Timezone-Aware datetime (Default: Asia/Bangkok / UTC+7)"""
    if utc:
        return datetime.now(timezone.utc)
    return datetime.now(ZoneInfo("Asia/Bangkok"))


def parse_datetime_bkk(val: str | datetime | None) -> datetime | None:
    """
    แปลงค่า string (ISO format หรือ DD/MM/YYYY) หรือ datetime ให้เป็น Timezone-Aware datetime (Asia/Bangkok)
    - รองรับสตริง Naive, Aware, ISO 8601 ('YYYY-MM-DDTHH:MM', 'YYYY-MM-DDTHH:MM:SS'), Slash/Dash formats และ datetime object
    """
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=ZoneInfo("Asia/Bangkok"))
        return val.astimezone(ZoneInfo("Asia/Bangkok"))

    if isinstance(val, str):
        val_str = val.strip()
        if not val_str:
            return None
        # 1. Try fromisoformat (handles 'YYYY-MM-DDTHH:MM', 'YYYY-MM-DD HH:MM:SS', etc.)
        try:
            dt = datetime.fromisoformat(val_str)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=ZoneInfo("Asia/Bangkok"))
            return dt.astimezone(ZoneInfo("Asia/Bangkok"))
        except (ValueError, TypeError):
            pass

        # 2. Try common date-time formats
        for fmt in (
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y",
            "%Y/%m/%d %H:%M:%S",
            "%Y/%m/%d %H:%M",
            "%Y/%m/%d",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d",
        ):
            try:
                dt = datetime.strptime(val_str, fmt)  # noqa: DTZ007
                return dt.replace(tzinfo=ZoneInfo("Asia/Bangkok"))
            except (ValueError, TypeError):
                continue

    return None
