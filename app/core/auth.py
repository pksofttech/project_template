"""Authentication, JWT Token Handling, and Password Security."""

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import jwt
from fastapi import HTTPException, Request, status
from jwt import PyJWTError
from passlib.context import CryptContext
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config_app import AppConfig
from app.core.models import System_Users
from app.stdio import print_error, print_warning, time_now

# Password hashing context (Argon2 / Bcrypt fallback)
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as err:
        print_error(f"Password verification error: {err}")
        return False


def get_password_hash(password: str) -> str:
    """Hash password using argon2/bcrypt."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Generate signed JWT access token."""
    to_encode = data.copy()
    expire = time_now() + (expires_delta or timedelta(minutes=AppConfig.JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, AppConfig.JWT_SECRET_KEY, algorithm=AppConfig.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate JWT access token."""
    try:
        return jwt.decode(token, AppConfig.JWT_SECRET_KEY, algorithms=[AppConfig.JWT_ALGORITHM])
    except PyJWTError as err:
        print_warning(f"JWT Decode error: {err}")
        return None


async def authenticate_user(db: AsyncSession, username: str, password: str) -> System_Users | None:
    """Authenticate username and password against database."""
    stmt = select(System_Users).where(System_Users.username == username, System_Users.is_active == True)
    user = (await db.exec(stmt)).first()
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user


async def get_token_from_request(request: Request) -> str | None:
    """Extract JWT token from Authorization header or cookies."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return request.cookies.get("access_token")
