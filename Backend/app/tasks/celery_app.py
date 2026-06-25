"""
A-Quire Celery Application

Tasks:
  - generate_mentor_hint_task: Run Bedrock AI mentor hint generation off the
    request thread. Pushes result via WebSocket when complete.
  - send_notification_task: Placeholder for notification delivery (email, push).

Worker startup:
  celery -A app.tasks.celery_app worker --loglevel=info
"""
from __future__ import annotations

import asyncio
import logging

from celery import Celery

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Celery application ─────────────────────────────────────────────────────────

celery_app = Celery(
    "aquire",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=5 * 60,       # Hard limit: 5 min (Bedrock should be faster)
    task_soft_time_limit=4 * 60,  # Soft limit: 4 min (triggers SoftTimeLimitExceeded)
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks (memory hygiene)
)


# ── Mentor hint task ──────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="aquire.tasks.generate_mentor_hint",
    max_retries=2,
    default_retry_delay=5,
    acks_late=True,
)
def generate_mentor_hint_task(
    self,
    struggle_event_id: int,
    hint_level: str = "basic",
) -> dict:
    """
    Celery task: generate a mentor hint via AWS Bedrock for a struggle event.

    Runs the async generate_mentor_hint() in a fresh event loop so the
    Celery worker (sync) can call the async service layer.

    Automatically retries up to 2 times on transient failures.
    """
    logger.info(
        f"[Task] generate_mentor_hint: event_id={struggle_event_id} "
        f"level={hint_level}"
    )

    async def _run() -> str:
        from app.core.database import AsyncSessionLocal
        from app.services.mentor_service import generate_mentor_hint

        async with AsyncSessionLocal() as db:
            return await generate_mentor_hint(
                event_id=struggle_event_id,
                db=db,
                hint_level=hint_level,
            )

    try:
        hint = asyncio.run(_run())
        logger.info(
            f"[Task] Hint complete for event_id={struggle_event_id}: "
            f"{hint[:60]}..."
        )
        return {"event_id": struggle_event_id, "hint_level": hint_level, "status": "success"}

    except Exception as exc:
        logger.error(
            f"[Task] generate_mentor_hint failed for event_id={struggle_event_id}: {exc}"
        )
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.error(
                f"[Task] Max retries exceeded for event_id={struggle_event_id}"
            )
            return {"event_id": struggle_event_id, "status": "failed", "error": str(exc)}


# ── Notification task ─────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="aquire.tasks.send_notification",
    max_retries=3,
    default_retry_delay=10,
)
def send_notification_task(
    self,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
) -> dict:
    """
    Celery task: persist a notification and push it via WebSocket.

    Used for async notifications that shouldn't block the request cycle,
    e.g. course enrollment confirmations, instructor messages.
    """
    logger.info(f"[Task] send_notification: user_id={user_id} type={notification_type}")

    async def _run() -> None:
        from app.core.database import AsyncSessionLocal
        from app.models.notification import Notification
        from app.websocket.manager import manager

        async with AsyncSessionLocal() as db:
            notif = Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
            )
            db.add(notif)
            await db.commit()
            await db.refresh(notif)

            await manager.broadcast_to_user(
                user_id,
                {
                    "type": "notification",
                    "data": {
                        "id": notif.id,
                        "title": title,
                        "message": message,
                        "notification_type": notification_type,
                    },
                },
            )

    try:
        asyncio.run(_run())
        return {"user_id": user_id, "status": "sent"}
    except Exception as exc:
        logger.error(f"[Task] send_notification failed for user_id={user_id}: {exc}")
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {"user_id": user_id, "status": "failed", "error": str(exc)}
