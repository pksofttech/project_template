"""Multi-Channel Alert & Notification Service (LINE, Telegram, Webhook).

Provides asynchronous, non-blocking alert dispatching for:
- Duress PIN (Silent hostage alarm)
- Fire Alarm Evacuation & Global Lockdown
- Repeated Access Denied / Security Breaches
- Door Forced Open / Sensor Alarms
"""

import asyncio
import json
from datetime import datetime
from typing import Any
import httpx
from sqlmodel import select

from app.core.database import AsyncSessionLocal, get_configurations
from app.stdio import print_error, print_info, print_success, print_warning, time_now


class NotificationService:
    """Enterprise multi-channel notification dispatcher."""

    @staticmethod
    async def get_config() -> dict[str, Any]:
        """Fetch current notification settings from App_Configurations."""
        async with AsyncSessionLocal() as session:
            line_enabled = (await get_configurations(session, "notify_line_enabled")) == "True"
            line_token = await get_configurations(session, "notify_line_token") or ""
            line_msg_token = await get_configurations(session, "notify_line_messaging_token") or ""
            line_target_id = await get_configurations(session, "notify_line_target_id") or ""

            telegram_enabled = (await get_configurations(session, "notify_telegram_enabled")) == "True"
            telegram_token = await get_configurations(session, "notify_telegram_bot_token") or ""
            telegram_chat_id = await get_configurations(session, "notify_telegram_chat_id") or ""

            webhook_enabled = (await get_configurations(session, "notify_webhook_enabled")) == "True"
            webhook_url = await get_configurations(session, "notify_webhook_url") or ""

            alert_duress = (await get_configurations(session, "alert_on_duress") or "True") == "True"
            alert_fire = (await get_configurations(session, "alert_on_fire_alarm") or "True") == "True"
            alert_lockdown = (await get_configurations(session, "alert_on_lockdown") or "True") == "True"
            alert_denied = (await get_configurations(session, "alert_on_denied_limit") or "True") == "True"

            return {
                "line_enabled": line_enabled,
                "line_token": line_token,
                "line_messaging_token": line_msg_token,
                "line_target_id": line_target_id,
                "telegram_enabled": telegram_enabled,
                "telegram_token": telegram_token,
                "telegram_chat_id": telegram_chat_id,
                "webhook_enabled": webhook_enabled,
                "webhook_url": webhook_url,
                "alert_on_duress": alert_duress,
                "alert_on_fire_alarm": alert_fire,
                "alert_on_lockdown": alert_lockdown,
                "alert_on_denied_limit": alert_denied,
            }

    @classmethod
    def dispatch_alert_background(cls, event_type: str, title: str, message: str, metadata: dict | None = None):
        """Non-blocking background launcher to dispatch alerts without blocking event handlers."""
        async def _safe_send():
            try:
                await cls.send_alert(event_type, title, message, metadata)
            except Exception as exc:
                print_error(f"Error in background alert dispatch [{event_type}]: {exc}")

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_safe_send())
        except RuntimeError:
            # Fallback if called outside an active event loop
            asyncio.run(_safe_send())

    @classmethod
    async def send_alert(cls, event_type: str, title: str, message: str, metadata: dict | None = None) -> dict:
        """Send notifications to all configured & enabled channels."""
        config = await cls.get_config()
        meta = metadata or {}
        now = time_now().strftime("%Y-%m-%d %H:%M:%S")

        # Check policy toggles
        if event_type == "DURESS_PIN" and not config["alert_on_duress"]:
            return {"status": "skipped", "reason": "Duress alerts disabled"}
        if event_type == "FIRE_ALARM" and not config["alert_on_fire_alarm"]:
            return {"status": "skipped", "reason": "Fire Alarm alerts disabled"}
        if event_type == "LOCKDOWN" and not config["alert_on_lockdown"]:
            return {"status": "skipped", "reason": "Lockdown alerts disabled"}
        if event_type == "DENIED_LIMIT" and not config["alert_on_denied_limit"]:
            return {"status": "skipped", "reason": "Denied limit alerts disabled"}
        if event_type == "EMERGENCY_RESET" and not (config["alert_on_fire_alarm"] or config["alert_on_lockdown"]):
            return {"status": "skipped", "reason": "Emergency alerts disabled"}

        results = {}

        # 1. Dispatch LINE Notification
        if config["line_enabled"]:
            if config["line_token"]:
                results["line_notify"] = await cls._send_line_notify(
                    config["line_token"], f"\n[{title}]\n{message}\nTime: {now}"
                )
            if config["line_messaging_token"] and config["line_target_id"]:
                results["line_messaging"] = await cls._send_line_messaging_api(
                    config["line_messaging_token"],
                    config["line_target_id"],
                    f"🔔 {title}\n{message}\n\n🕒 {now}",
                )

        # 2. Dispatch Telegram Notification
        if config["telegram_enabled"] and config["telegram_token"] and config["telegram_chat_id"]:
            results["telegram"] = await cls._send_telegram(
                config["telegram_token"],
                config["telegram_chat_id"],
                f"<b>🚨 {title}</b>\n\n{message}\n\n<i>🕒 {now}</i>",
            )

        # 3. Dispatch Webhook (SIEM / Discord / Slack / Custom)
        if config["webhook_enabled"] and config["webhook_url"]:
            results["webhook"] = await cls._send_webhook(
                config["webhook_url"],
                {
                    "event": event_type,
                    "title": title,
                    "message": message,
                    "timestamp": now,
                    "metadata": meta,
                },
            )

        print_info(f"📢 Notification dispatched for [{event_type}]: {results}")
        return {"status": "dispatched", "results": results}

    @classmethod
    async def send_test_alert(cls, channel: str = "all", custom_message: str = "") -> dict:
        """Send a test notification to verify channel credentials."""
        config = await cls.get_config()
        now = time_now().strftime("%Y-%m-%d %H:%M:%S")
        test_msg = custom_message.strip() or f"Test alert from PKS Access Control System.\nTimestamp: {now}"
        results = {}

        if channel in ("all", "line"):
            if config["line_token"]:
                results["line_notify"] = await cls._send_line_notify(
                    config["line_token"], f"\n[PKS TEST ALERT]\n{test_msg}"
                )
            if config["line_messaging_token"] and config["line_target_id"]:
                results["line_messaging"] = await cls._send_line_messaging_api(
                    config["line_messaging_token"],
                    config["line_target_id"],
                    f"🧪 [PKS TEST ALERT]\n{test_msg}",
                )

        if channel in ("all", "telegram"):
            if config["telegram_token"] and config["telegram_chat_id"]:
                results["telegram"] = await cls._send_telegram(
                    config["telegram_token"],
                    config["telegram_chat_id"],
                    f"<b>🧪 PKS TEST ALERT</b>\n\n{test_msg}\n\n<i>🕒 {now}</i>",
                )

        if channel in ("all", "webhook"):
            if config["webhook_url"]:
                results["webhook"] = await cls._send_webhook(
                    config["webhook_url"],
                    {
                        "event": "TEST_ALERT",
                        "title": "PKS Test Alert",
                        "message": test_msg,
                        "timestamp": now,
                        "metadata": {"channel": channel, "test": True},
                    },
                )

        status_str = "success" if results else "no_channels_configured"
        return {
            "status": status_str,
            "channel": channel,
            "results": results,
            "timestamp": now,
        }

    @staticmethod
    async def _send_line_notify(token: str, message: str) -> dict[str, Any]:
        """Send via LINE Notify API."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    "https://notify-api.line.me/api/notify",
                    headers={"Authorization": f"Bearer {token}"},
                    data={"message": message},
                )
                return {"success": res.status_code == 200, "status_code": res.status_code}
        except Exception as e:
            print_error(f"LINE Notify error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def _send_line_messaging_api(token: str, target_id: str, message: str) -> dict[str, Any]:
        """Send via LINE Messaging API Push."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    "https://api.line.me/v2/bot/message/push",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": target_id,
                        "messages": [{"type": "text", "text": message}],
                    },
                )
                return {"success": res.status_code == 200, "status_code": res.status_code}
        except Exception as e:
            print_error(f"LINE Messaging API error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def _send_telegram(bot_token: str, chat_id: str, html_text: str) -> dict[str, Any]:
        """Send via Telegram Bot API."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                res = await client.post(
                    url,
                    json={
                        "chat_id": chat_id,
                        "text": html_text,
                        "parse_mode": "HTML",
                    },
                )
                return {"success": res.status_code == 200, "status_code": res.status_code}
        except Exception as e:
            print_error(f"Telegram Bot error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def _send_webhook(url: str, payload: dict) -> dict[str, Any]:
        """Send via Generic HTTP Webhook."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                return {"success": res.status_code in (200, 201, 202, 204), "status_code": res.status_code}
        except Exception as e:
            print_error(f"Webhook dispatch error: {e}")
            return {"success": False, "error": str(e)}


notification_service = NotificationService()
