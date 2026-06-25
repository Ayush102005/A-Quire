from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.websocket.manager import manager

logger = logging.getLogger(__name__)


class NotificationService:

    @staticmethod
    async def create_notification(
        user_id: int,
        title: str,
        message: str,
        notification_type: str = "info",
        db: AsyncSession | None = None,
    ) -> Notification:
        """
        Persist a notification and push it to the user's active WebSocket connections.

        :param user_id: Target user
        :param title: Short notification title
        :param message: Full notification body
        :param notification_type: info | warning | success | error
        :param db: Async DB session; if None the notification is only pushed over WS
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        if db:
            db.add(notification)
            await db.commit()
            await db.refresh(notification)

        logger.info(f"Notification created for user {user_id}: {title}")

        # Push real-time update over WebSocket (best-effort)
        try:
            await manager.broadcast_to_user(
                user_id,
                {
                    "type": "notification",
                    "data": {
                        "id": notification.id,
                        "title": title,
                        "message": message,
                        "notification_type": notification_type,
                        "is_read": False,
                    },
                },
            )
        except Exception as exc:
            logger.warning(f"WS push failed for user {user_id}: {exc}")

        return notification

    @staticmethod
    async def send_email_notification(
        email: str,
        subject: str,
        body: str,
    ) -> bool:
        """
        Send an email notification.
        Currently stubbed — integrate with SendGrid / SES when ready.
        """
        logger.info(f"[STUB] Email → {email} | Subject: {subject}")
        # TODO: integrate with email provider
        return True
