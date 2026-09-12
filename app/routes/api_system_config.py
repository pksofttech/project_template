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


class NotificationConfigModel(BaseModel):
    line_enabled: bool = False
    line_token: str = ""
    line_messaging_token: str = ""
    line_target_id: str = ""
    telegram_enabled: bool = False
    telegram_token: str = ""
    telegram_chat_id: str = ""
    webhook_enabled: bool = False
    webhook_url: str = ""
    alert_on_duress: bool = True
    alert_on_fire_alarm: bool = True
    alert_on_lockdown: bool = True
    alert_on_denied_limit: bool = True


class TestNotificationRequest(BaseModel):
    channel: str = "all"
    message: str = ""


@router.get("/notifications", summary="Get Multi-Channel Notification Configuration")
async def get_notification_config(current_user: SystemUserDep):
    """Retrieve multi-channel notification settings."""
    from app.module.notification_service import notification_service
    return await notification_service.get_config()


@router.post("/notifications", summary="Update Multi-Channel Notification Configuration")
async def update_notification_config(
    payload: NotificationConfigModel,
    current_user: SystemUserDep,
    db: AsyncDbDep,
):
    """Update multi-channel notification configurations."""
    configs_to_save = {
        "notify_line_enabled": str(payload.line_enabled),
        "notify_line_token": payload.line_token.strip(),
        "notify_line_messaging_token": payload.line_messaging_token.strip(),
        "notify_line_target_id": payload.line_target_id.strip(),
        "notify_telegram_enabled": str(payload.telegram_enabled),
        "notify_telegram_bot_token": payload.telegram_token.strip(),
        "notify_telegram_chat_id": payload.telegram_chat_id.strip(),
        "notify_webhook_enabled": str(payload.webhook_enabled),
        "notify_webhook_url": payload.webhook_url.strip(),
        "alert_on_duress": str(payload.alert_on_duress),
        "alert_on_fire_alarm": str(payload.alert_on_fire_alarm),
        "alert_on_lockdown": str(payload.alert_on_lockdown),
        "alert_on_denied_limit": str(payload.alert_on_denied_limit),
    }
    for key, val in configs_to_save.items():
        await set_configurations(db, key, val)

    print_success(f"User '{current_user.username}' updated notification settings")
    return {"message": "Notification configurations updated successfully", "configs": configs_to_save}


@router.post("/notifications/test", summary="Send Test Notification to Multi-Channel Alert System")
async def test_notification(
    payload: TestNotificationRequest,
    current_user: SystemUserDep,
):
    """Send test notification via LINE, Telegram, or Webhook."""
    from app.module.notification_service import notification_service
    res = await notification_service.send_test_alert(channel=payload.channel, custom_message=payload.message)
    return res


