"""Centralized FastAPI Dependencies & Type Aliases."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import decode_access_token, get_token_from_request
from app.core.database import get_db
from app.core.models import System_Users


async def get_current_user_id(request: Request) -> int:
    """Extract and validate user ID from JWT token."""
    token = await get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    try:
        return int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token user identity",
        )


async def get_current_system_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> System_Users:
    """Fetch the active system user record from DB for the authenticated session."""
    user_id = await get_current_user_id(request)
    user = await db.get(System_Users, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated or not found",
        )
    return user


# Annotated Type Aliases for FastAPI route signatures
AsyncDbDep = Annotated[AsyncSession, Depends(get_db)]
JWTDep = Annotated[int, Depends(get_current_user_id)]
SystemUserDep = Annotated[System_Users, Depends(get_current_system_user)]
