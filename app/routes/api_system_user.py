"""User Authentication and Account Management API."""

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlmodel import func, literal, or_, select

from app.core.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.core.dependencies import AsyncDbDep, SystemUserDep
from app.core.models import System_User_Type, System_Users
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import print_error, print_success, time_now

router = APIRouter(
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
    token = create_access_token(
        data={
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "system_user_type_id": user.system_user_type_id,
        }
    )

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
        "success": True,
        "data": {
            "id": current_user.id,
            "username": current_user.username,
            "name": current_user.name,
            "email": getattr(current_user, "email", "") or "",
            "role": current_user.role,
            "is_active": current_user.is_active,
            "system_user_type_id": current_user.system_user_type_id,
            "pictureUrl": getattr(current_user, "pictureUrl", "") or "/static/image/no_image.png",
        },
        "id": current_user.id,
        "username": current_user.username,
        "name": current_user.name,
        "email": getattr(current_user, "email", "") or "",
        "role": current_user.role,
        "is_active": current_user.is_active,
    }


@router.put("/me", summary="Update current logged in user profile")
async def update_me_profile(
    request: Request,
    current_user: SystemUserDep,
    db: AsyncDbDep,
):
    """Update profile of current user (name, password, photo)."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    name = str(data.get("name", "")).strip()
    old_password = str(data.get("old_password", "")).strip()
    new_password = str(data.get("new_password", "")).strip()

    updated = []
    if name and name != current_user.name:
        current_user.name = name
        updated.append("name")

    if old_password and new_password:
        if not verify_password(old_password, current_user.password):
            return {"success": False, "msg": "Current password is incorrect"}
        if len(new_password) < 6:
            return {"success": False, "msg": "New password must be at least 6 characters long"}
        current_user.password = get_password_hash(new_password)
        updated.append("password")

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return {
        "success": True,
        "msg": "Profile updated successfully",
        "data": {
            "id": current_user.id,
            "username": current_user.username,
            "name": current_user.name,
        },
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
async def get_system_users_datatable(
    req_para: Request,
    db: AsyncDbDep,
    current_user: SystemUserDep,
):
    """DataTables server-side endpoint for listing system users."""

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
            System_Users.status.ilike(f"%{search}%"),
        )

    base_query = select(System_Users).where(search_cond)
    count_query = select(func.count(System_Users.id)).where(search_cond)

    total_records = (await db.exec(select(func.count(System_Users.id)))).one()
    filtered_records = (await db.exec(count_query)).one()

    # Ordering
    if datatable_select["order_by"]:
        col_name = datatable_select["order_by"]["col"]
        if "." in col_name:
            col_name = col_name.split(".")[-1]
        direction = datatable_select["order_by"]["dir"]
        col_attr = getattr(System_Users, col_name, None)
        if col_attr is not None:
            base_query = base_query.order_by(col_attr.desc() if direction == "desc" else col_attr.asc())
    else:
        base_query = base_query.order_by(System_Users.id.desc())

    # Map user_type from System_User_Type
    types = (await db.exec(select(System_User_Type))).all()
    type_map = {t.id: t.user_type for t in types}

    # Streaming Excel / CSV Export
    if params.get("export"):
        rows = (await db.exec(base_query)).all()
        export_data = [
            {
                "id": u.id,
                "username": u.username,
                "name": u.name or "-",
                "email": getattr(u, "email", "") or "-",
                "role": type_map.get(u.system_user_type_id, "ADMIN"),
                "is_active": "Active" if (u.status == "ENABLE") else "Inactive",
                "created_at": u.createDate.strftime("%Y-%m-%d %H:%M") if getattr(u, "createDate", None) else "-",
            }
            for u in rows
        ]
        return await export_excel_response(
            export_data,
            filename_prefix="system_users",
            sheet_title="System Users",
            export_type=params.get("export", "excel"),
        )

    if limit is not None:
        base_query = base_query.offset(skip).limit(limit)

    users = (await db.exec(base_query)).all()

    data_rows = [
        {
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "email": getattr(u, "email", "") or "-",
            "role": type_map.get(u.system_user_type_id, "ADMIN"),
            "is_active": (u.status == "ENABLE"),
            "created_at": u.createDate.strftime("%Y-%m-%d %H:%M") if getattr(u, "createDate", None) else "-",
            "System_Users.id": u.id,
            "System_Users.username": u.username,
            "System_Users.name": u.name,
            "System_Users.email": getattr(u, "email", "") or "-",
            "System_Users.role": type_map.get(u.system_user_type_id, "ADMIN"),
            "System_Users.is_active": (u.status == "ENABLE"),
            "System_Users.created_at": u.createDate.strftime("%Y-%m-%d %H:%M") if getattr(u, "createDate", None) else "-",
        }
        for u in users
    ]

    return {
        "draw": int(params.get("draw", 1)),
        "recordsTotal": total_records,
        "recordsFiltered": filtered_records,
        "data": data_rows,
    }


# =============================================================================
# 👥 SYSTEM USER TYPES (CRUD & DataTables)
# =============================================================================


@router.get("/type", summary="Get system user types or single type by ?id=")
async def get_system_user_type(
    db: AsyncDbDep,
    current_user: SystemUserDep,
    id: int | None = None,
):
    """Get system user types or single type by ?id= for _table_class.js manager modal."""
    if id is not None:
        stmt = select(System_User_Type).where(System_User_Type.id == id)
        item = (await db.exec(stmt)).first()
        if not item:
            return {"success": False, "msg": "System user type not found"}
        return {
            "success": True,
            "data": {
                "id": item.id,
                "user_type": item.user_type,
                "description": item.description or "",
                "permission_allowed": item.permission_allowed or "",
                "menu_config": item.menu_config or "",
                "system_config": item.system_config or "",
                "home_item_config": item.home_item_config or "",
            },
        }

    stmt = select(System_User_Type).order_by(System_User_Type.id.asc())
    rows = (await db.exec(stmt)).all()
    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "user_type": r.user_type,
                "description": r.description or "",
                "permission_allowed": r.permission_allowed or "",
                "menu_config": r.menu_config or "",
                "system_config": r.system_config or "",
                "home_item_config": r.home_item_config or "",
            }
            for r in rows
        ],
    }


@router.get("/type/datatable", summary="DataTables server-side endpoint for system user types")
async def get_system_user_type_datatable(
    req_para: Request,
    db: AsyncDbDep,
    current_user: SystemUserDep,
):
    """DataTables server-side endpoint for listing system user types."""
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    search_cond = literal(True)
    if search:
        search_cond = or_(
            System_User_Type.user_type.ilike(f"%{search}%"),
            System_User_Type.description.ilike(f"%{search}%"),
        )

    base_query = select(System_User_Type).where(search_cond)
    count_query = select(func.count(System_User_Type.id)).where(search_cond)

    total_records = (await db.exec(select(func.count(System_User_Type.id)))).one()
    filtered_records = (await db.exec(count_query)).one()

    # Ordering
    if datatable_select["order_by"]:
        col_name = datatable_select["order_by"]["col"]
        if "." in col_name:
            col_name = col_name.split(".")[-1]
        direction = datatable_select["order_by"]["dir"]
        col_attr = getattr(System_User_Type, col_name, None)
        if col_attr is not None:
            base_query = base_query.order_by(col_attr.desc() if direction == "desc" else col_attr.asc())
    else:
        base_query = base_query.order_by(System_User_Type.id.asc())

    # Excel / CSV Export
    if params.get("export"):
        rows = (await db.exec(base_query)).all()
        export_data = [
            {
                "id": t.id,
                "user_type": t.user_type,
                "description": t.description or "-",
            }
            for t in rows
        ]
        return await export_excel_response(
            export_data,
            filename_prefix="system_user_types",
            sheet_title="System User Types",
            export_type=params.get("export", "excel"),
        )

    if limit is not None:
        base_query = base_query.offset(skip).limit(limit)

    items = (await db.exec(base_query)).all()

    data_rows = [
        {
            "id": t.id,
            "user_type": t.user_type,
            "description": t.description or "",
            "permission_allowed": t.permission_allowed or "",
            "menu_config": t.menu_config or "",
            "system_config": t.system_config or "",
            "home_item_config": t.home_item_config or "",
            "System_User_Type": {
                "id": t.id,
                "user_type": t.user_type,
                "description": t.description or "",
                "permission_allowed": t.permission_allowed or "",
                "menu_config": t.menu_config or "",
                "system_config": t.system_config or "",
                "home_item_config": t.home_item_config or "",
            },
            "System_User_Type.id": t.id,
            "System_User_Type.user_type": t.user_type,
            "System_User_Type.description": t.description or "",
            "System_User_Type.permission_allowed": t.permission_allowed or "",
            "System_User_Type.menu_config": t.menu_config or "",
            "System_User_Type.system_config": t.system_config or "",
            "System_User_Type.home_item_config": t.home_item_config or "",
        }
        for t in items
    ]

    return {
        "draw": int(params.get("draw", 1)),
        "recordsTotal": total_records,
        "recordsFiltered": filtered_records,
        "data": data_rows,
    }


@router.post("/type", summary="Create or update system user type (_table_class.js compatible)")
async def save_system_user_type(
    request: Request,
    current_user: SystemUserDep,
    db: AsyncDbDep,
):
    """Create or update a system user type."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    raw_id = data.get("id")
    type_id = int(raw_id) if raw_id and str(raw_id).isdigit() and int(raw_id) > 0 else None
    user_type = str(data.get("user_type", "")).strip().upper()
    description = str(data.get("description", "") or "").strip()
    menu_config = str(data.get("menu_config", "") or "")
    system_config = str(data.get("system_config", "") or "")
    home_item_config = str(data.get("home_item_config", "") or "")
    permission_allowed = str(data.get("permission_allowed", "") or "")

    if not user_type:
        return {"success": False, "msg": "Role Type Name is required"}

    if type_id:
        target = (await db.exec(select(System_User_Type).where(System_User_Type.id == type_id))).first()
        if not target:
            return {"success": False, "msg": "System user type not found"}

        # Duplicate check on other records
        dup = (
            await db.exec(
                select(System_User_Type).where(
                    func.upper(System_User_Type.user_type) == user_type,
                    System_User_Type.id != type_id,
                )
            )
        ).first()
        if dup:
            return {"success": False, "msg": f"User type name '{user_type}' already exists"}

        target.user_type = user_type
        target.description = description
        if menu_config:
            target.menu_config = menu_config
        if system_config:
            target.system_config = system_config
        if home_item_config:
            target.home_item_config = home_item_config
        if permission_allowed:
            target.permission_allowed = permission_allowed

        db.add(target)
        await db.commit()
        await db.refresh(target)
        print_success(f"System User Type '{target.user_type}' updated by '{current_user.username}'")
        return {"success": True, "msg": f"Role '{target.user_type}' updated successfully", "data": {"id": target.id}}
    else:
        dup = (
            await db.exec(
                select(System_User_Type).where(
                    func.upper(System_User_Type.user_type) == user_type
                )
            )
        ).first()
        if dup:
            return {"success": False, "msg": f"User type name '{user_type}' already exists"}

        new_type = System_User_Type(
            user_type=user_type,
            description=description,
            menu_config=menu_config,
            system_config=system_config,
            home_item_config=home_item_config,
            permission_allowed=permission_allowed,
        )
        db.add(new_type)
        await db.commit()
        await db.refresh(new_type)
        print_success(f"System User Type '{new_type.user_type}' created by '{current_user.username}'")
        return {"success": True, "msg": f"Role '{new_type.user_type}' created successfully", "data": {"id": new_type.id}}


@router.delete("/type", summary="Delete system user type by query ID")
async def delete_system_user_type(
    current_user: SystemUserDep,
    db: AsyncDbDep,
    id: int | None = None,
):
    """Delete a system user type via ?id={id}."""
    if not id:
        return {"success": False, "msg": "Missing ID parameter"}

    if id <= 6:
        return {
            "success": False,
            "msg": "Default System User Types (1-6) are protected and cannot be deleted",
        }

    target = (await db.exec(select(System_User_Type).where(System_User_Type.id == id))).first()
    if not target:
        return {"success": False, "msg": "System user type not found"}

    active_users = (await db.exec(select(System_Users).where(System_Users.system_user_type_id == id))).first()
    if active_users:
        return {
            "success": False,
            "msg": f"Cannot delete '{target.user_type}' because active user accounts are assigned to it",
        }

    name = target.user_type
    await db.delete(target)
    await db.commit()
    print_success(f"System User Type '{name}' deleted by '{current_user.username}'")
    return {"success": True, "msg": f"User type '{name}' deleted successfully"}


@router.get("", summary="Get system user by ID or current profile")
async def get_system_user_by_query_id(
    db: AsyncDbDep,
    current_user: SystemUserDep,
    id: int | None = None,
):
    """Retrieve user details by ?id={id} for _table_class.js manager modal."""
    target_id = id if id is not None else current_user.id
    user = (await db.exec(select(System_Users).where(System_Users.id == target_id))).first()
    if not user:
        return {"success": False, "msg": "User not found"}

    user_type = (await db.exec(select(System_User_Type).where(System_User_Type.id == user.system_user_type_id))).first()
    role_name = user_type.user_type if user_type else "ADMIN"

    return {
        "success": True,
        "data": {
            "id": user.id,
            "username": user.username,
            "name": user.name or "",
            "email": getattr(user, "email", "") or "",
            "role": role_name,
            "is_active": (user.status == "ENABLE"),
            "created_at": user.createDate.strftime("%Y-%m-%d %H:%M") if getattr(user, "createDate", None) else "-",
        },
    }


@router.get("/{user_id}", summary="Get system user by path ID")
async def get_system_user_by_path_id(user_id: int, current_user: SystemUserDep, db: AsyncDbDep):
    """Retrieve single system user details."""
    user = (await db.exec(select(System_Users).where(System_Users.id == user_id))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_type = (await db.exec(select(System_User_Type).where(System_User_Type.id == user.system_user_type_id))).first()
    role_name = user_type.user_type if user_type else "ADMIN"

    return {
        "success": True,
        "data": {
            "id": user.id,
            "username": user.username,
            "name": user.name or "",
            "email": getattr(user, "email", "") or "",
            "role": role_name,
            "is_active": (user.status == "ENABLE"),
            "created_at": user.createDate.strftime("%Y-%m-%d %H:%M") if getattr(user, "createDate", None) else "-",
        },
    }


@router.post("", summary="Create or update system user (_table_class.js compatible)")
async def save_or_update_system_user(
    request: Request,
    current_user: SystemUserDep,
    db: AsyncDbDep,
):
    """Handle both create (id=0) and update (id>0) from FormData or JSON."""
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
    else:
        form = await request.form()
        data = dict(form)

    user_id_raw = data.get("id", 0)
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        user_id = 0

    if user_id > 0:
        # Update Existing User
        user = (await db.exec(select(System_Users).where(System_Users.id == user_id))).first()
        if not user:
            return {"success": False, "msg": f"User ID {user_id} not found"}

        if "username" in data and data["username"]:
            new_username = str(data["username"]).strip()
            if new_username != user.username:
                existing = (await db.exec(select(System_Users).where(System_Users.username == new_username))).first()
                if existing:
                    return {"success": False, "msg": f"Username '{new_username}' already exists"}
                user.username = new_username

        if "name" in data:
            user.name = str(data["name"]).strip()

        if "role" in data and data["role"]:
            role_str = str(data["role"]).strip()
            type_row = (await db.exec(select(System_User_Type).where(func.lower(System_User_Type.user_type) == role_str.lower()))).first()
            if type_row:
                user.system_user_type_id = type_row.id

        if "is_active" in data:
            active_val = data["is_active"]
            user.status = "ENABLE" if active_val in (True, 1, "1", "true", "True", "on") else "DISABLE"

        password = str(data.get("password", "")).strip()
        if password:
            if len(password) < 6:
                return {"success": False, "msg": "Password must be at least 6 characters"}
            user.password = get_password_hash(password)

        db.add(user)
        await db.commit()
        await db.refresh(user)

        print_success(f"User '{user.username}' updated by '{current_user.username}'")
        return {"success": True, "msg": f"User '{user.username}' updated successfully", "data": {"id": user.id}}

    # Create New User
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()

    if not username:
        return {"success": False, "msg": "Username is required"}
    if not password:
        return {"success": False, "msg": "Password is required"}
    if len(password) < 6:
        return {"success": False, "msg": "Password must be at least 6 characters"}

    existing = (await db.exec(select(System_Users).where(System_Users.username == username))).first()
    if existing:
        return {"success": False, "msg": f"Username '{username}' already exists"}

    name = str(data.get("name", "")).strip()
    role = str(data.get("role", "admin")).strip()
    active_val = data.get("is_active", True)
    is_active = active_val in (True, 1, "1", "true", "True", "on")

    type_row = (await db.exec(select(System_User_Type).where(func.lower(System_User_Type.user_type) == role.lower()))).first()
    if not type_row:
        type_row = (await db.exec(select(System_User_Type))).first()
    type_id = type_row.id if type_row else 1

    new_user = System_Users(
        username=username,
        password=get_password_hash(password),
        name=name,
        createDate=time_now(),
        create_by=current_user.username,
        status="ENABLE" if is_active else "DISABLE",
        pictureUrl="",
        remark="",
        system_user_type_id=type_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    print_success(f"User '{new_user.username}' created by '{current_user.username}'")
    return {"success": True, "msg": f"User '{new_user.username}' created successfully", "data": {"id": new_user.id}}


@router.post("/create", summary="Create new system user")
async def create_system_user(payload: SystemUserCreate, current_user: SystemUserDep, db: AsyncDbDep):
    """Create a new user account with hashed password."""
    existing = (await db.exec(select(System_Users).where(System_Users.username == payload.username))).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{payload.username}' already exists",
        )

    type_row = (await db.exec(select(System_User_Type).where(func.lower(System_User_Type.user_type) == payload.role.lower()))).first()
    if not type_row:
        type_row = (await db.exec(select(System_User_Type))).first()
    type_id = type_row.id if type_row else 1

    new_user = System_Users(
        username=payload.username.strip(),
        password=get_password_hash(payload.password),
        name=payload.name.strip(),
        createDate=time_now(),
        create_by=current_user.username,
        status="ENABLE" if payload.is_active else "DISABLE",
        pictureUrl="",
        remark="",
        system_user_type_id=type_id,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    print_success(f"User '{new_user.username}' created by '{current_user.username}'")
    return {"message": f"User '{new_user.username}' created successfully", "user_id": new_user.id}


@router.delete("", summary="Delete system user by query ID (_table_class.js compatible)")
async def delete_system_user_by_query(id: int, current_user: SystemUserDep, db: AsyncDbDep):
    """Delete a system user via ?id={id}."""
    if current_user.id == id:
        return {"success": False, "msg": "You cannot delete your own account"}

    user = (await db.exec(select(System_Users).where(System_Users.id == id))).first()
    if not user:
        return {"success": False, "msg": "User not found"}

    username = user.username
    await db.delete(user)
    await db.commit()

    print_success(f"User '{username}' deleted by '{current_user.username}'")
    return {"success": True, "msg": f"User '{username}' deleted successfully"}


@router.delete("/{user_id}", summary="Delete system user by path ID")
async def delete_system_user(user_id: int, current_user: SystemUserDep, db: AsyncDbDep):
    """Delete a system user by ID."""
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
