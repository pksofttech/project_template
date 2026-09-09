"""User Authentication and Account Management API."""

from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Request, Response, status
from app.core.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.core.dependencies import AsyncDbDep, SystemUserDep
from app.stdio import print_error, print_success, time_now

router = APIRouter(
    prefix="/api/system_user",
    tags=["System User & Auth"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/login", summary="Login with username and password")
async def login(payload: LoginRequest, response: Response, db: AsyncDbDep):
    """Authenticate user credentials and return JWT token."""
    user = await authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Create JWT Token with subject = user.id
    token = create_access_token(data={"sub": str(user.id), "username": user.username, "role": user.role})

    # Set Cookie for seamless browser session navigation
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7 days
        samesite="lax",
    )

    print_success(f"User '{user.username}' logged in successfully.")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
        },
    }


@router.post("/logout", summary="Logout and clear authentication cookie")
async def logout(response: Response):
    """Clear access_token cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/me", summary="Get current logged in user information")
async def get_me(current_user: SystemUserDep):
    """Return authenticated user profile."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@router.put("/change-password", summary="Change current user password")
async def change_password(payload: ChangePasswordRequest, current_user: SystemUserDep, db: AsyncDbDep):
    """Update current user password after verifying the old password."""
    if not verify_password(payload.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long",
        )

    current_user.password = get_password_hash(payload.new_password)
    current_user.updated_at = time_now()
    db.add(current_user)
    await db.commit()

    print_success(f"Password updated for user '{current_user.username}'")
    return {"message": "Password changed successfully"}


class SystemUserCreate(BaseModel):
    username: str
    password: str
    name: str = ""
    email: str | None = None
    role: str = "admin"
    is_active: bool = True


@router.get("/datatable", summary="DataTables Server-side Endpoint for System Users")
async def get_system_users_datatable(req_para: Request, db: AsyncDbDep, current_user: SystemUserDep):
    """DataTables server-side endpoint for listing system users."""
    from sqlmodel import select, func, or_, literal
    from app.core.models import System_Users
    from app.core.utility import get_datatable_select

    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    search_cond = literal(True)
    if search:
        search_cond = or_(
            System_Users.username.ilike(f"%{search}%"),
            System_Users.name.ilike(f"%{search}%"),
            System_Users.role.ilike(f"%{search}%"),
        )

    base_query = select(System_Users).where(search_cond)
    count_query = select(func.count(System_Users.id)).where(search_cond)

    total_records = (await db.exec(select(func.count(System_Users.id)))).one()
    filtered_records = (await db.exec(count_query)).one()

    # Ordering
    if datatable_select["order_by"]:
        col_name = datatable_select["order_by"]["col"]
        direction = datatable_select["order_by"]["dir"]
        col_attr = getattr(System_Users, col_name, None)
        if col_attr is not None:
            base_query = base_query.order_by(col_attr.desc() if direction == "desc" else col_attr.asc())
    else:
        base_query = base_query.order_by(System_Users.id.desc())

    if limit is not None:
        base_query = base_query.offset(skip).limit(limit)

    users = (await db.exec(base_query)).all()

    data_rows = [
        {
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "email": u.email or "-",
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.strftime("%Y-%m-%d %H:%M") if u.created_at else "-",
        }
        for u in users
    ]

    return {
        "draw": int(params.get("draw", 1)),
        "recordsTotal": total_records,
        "recordsFiltered": filtered_records,
        "data": data_rows,
    }


@router.post("/create", summary="Create new system user")
async def create_system_user(payload: SystemUserCreate, current_user: SystemUserDep, db: AsyncDbDep):
    """Create a new user account with hashed password."""
    from sqlmodel import select
    from app.core.models import System_Users

    existing = (await db.exec(select(System_Users).where(System_Users.username == payload.username))).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{payload.username}' already exists",
        )

    new_user = System_Users(
        username=payload.username.strip(),
        password=get_password_hash(payload.password),
        name=payload.name.strip(),
        email=payload.email.strip() if payload.email else None,
        role=payload.role,
        is_active=payload.is_active,
        created_at=time_now(),
        updated_at=time_now(),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    print_success(f"User '{new_user.username}' created by '{current_user.username}'")
    return {"message": f"User '{new_user.username}' created successfully", "user_id": new_user.id}


@router.delete("/{user_id}", summary="Delete system user")
async def delete_system_user(user_id: int, current_user: SystemUserDep, db: AsyncDbDep):
    """Delete a system user by ID."""
    from sqlmodel import select
    from app.core.models import System_Users

    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    user = (await db.exec(select(System_Users).where(System_Users.id == user_id))).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await db.delete(user)
    await db.commit()

    print_success(f"User '{user.username}' deleted by '{current_user.username}'")
    return {"message": f"User '{user.username}' deleted successfully"}

