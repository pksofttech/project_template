"""System Configuration API: Read & Update key-value application settings."""

from pydantic import BaseModel
from sqlmodel import select

from fastapi import APIRouter, HTTPException, status
from app.core.database import set_configurations
from app.core.dependencies import AsyncDbDep, SystemUserDep
from app.core.models import App_Configurations
from app.stdio import print_success

router = APIRouter(
    prefix="/api/system_config",
    tags=["System Configurations"],
)


class ConfigUpdateRequest(BaseModel):
    configs: dict[str, str]


@router.get("/all", summary="Get all system configurations")
async def get_all_configs(db: AsyncDbDep):
    """Retrieve all configuration key-value pairs."""
    stmt = select(App_Configurations)
    rows = (await db.exec(stmt)).all()
    return {row.key: row.value for row in rows}


@router.post("/batch-update", summary="Update multiple system configuration values")
async def update_configs(payload: ConfigUpdateRequest, current_user: SystemUserDep, db: AsyncDbDep):
    """Update settings in bulk. Requires authenticated system user."""
    updated = []
    for key, val in payload.configs.items():
        success = await set_configurations(db, key, val)
        if success:
            updated.append(key)

    print_success(f"User '{current_user.username}' updated configs: {updated}")
    return {"message": "Configurations updated successfully", "updated_keys": updated}


@router.get("/backups", summary="List database backups")
async def get_backups(current_user: SystemUserDep):
    """Retrieve list of existing database backups."""
    from app.core.backup_service import list_backups
    backups = await list_backups()
    return {"backups": backups}


@router.post("/backup/create", summary="Create on-demand SQLite hot backup")
async def create_backup(current_user: SystemUserDep):
    """Trigger online SQLite hot backup."""
    from app.core.backup_service import create_hot_backup
    res = await create_hot_backup()
    return res

