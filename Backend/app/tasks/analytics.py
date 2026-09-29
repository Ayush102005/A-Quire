"""
app/tasks/analytics.py
───────────────────────
Celery tasks for logging and analytics.
"""
import asyncio
from typing import Any, Dict, Optional

from app.core.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.models.analytics import LearnerStateLog


async def _async_log_learner_state(
    user_id: int, 
    session_id: Optional[int], 
    topic_id: Optional[int], 
    theta: float, 
    event_type: str, 
    metrics: Dict[str, Any]
):
    async with AsyncSessionLocal() as db:
        log_entry = LearnerStateLog(
            user_id=user_id,
            session_id=session_id,
            topic_id=topic_id,
            theta=theta,
            event_type=event_type,
            metrics=metrics
        )
        db.add(log_entry)
        await db.commit()


@celery_app.task(name="tasks.log_learner_state")
def log_learner_state(
    user_id: int, 
    session_id: Optional[int], 
    topic_id: Optional[int], 
    theta: float, 
    event_type: str, 
    metrics: Optional[Dict[str, Any]] = None
):
    """
    Background task to log learner state and analytics.
    Since Celery tasks are synchronous by default, we use asyncio.run to execute the async DB insert.
    """
    if metrics is None:
        metrics = {}
        
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If a loop is already running, create a new task
            loop.create_task(_async_log_learner_state(user_id, session_id, topic_id, theta, event_type, metrics))
        else:
            loop.run_until_complete(_async_log_learner_state(user_id, session_id, topic_id, theta, event_type, metrics))
    except RuntimeError:
        asyncio.run(_async_log_learner_state(user_id, session_id, topic_id, theta, event_type, metrics))
