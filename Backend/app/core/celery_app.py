"""
app/core/celery_app.py
───────────────────────
Celery instance configuration.
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    # No result backend: nothing in this codebase ever calls .get() /
    # AsyncResult(...) on a task — every .delay() call is genuinely
    # fire-and-forget (see app/tasks/analytics.py). Configuring a backend
    # anyway made Celery maintain a Redis pub/sub result-consumer connection
    # that, when Redis is unreachable (no worker/Redis running — common in
    # dev), retries for MINUTES before giving up
    # (celery/backends/asynchronous.py's E_RETRY_LIMIT_EXCEEDED) — turning
    # every `log_learner_state.delay(...)` call in submit_answer
    # (assessments.py) into a multi-minute block on answer submission, even
    # though the caller wraps it in try/except (that only catches the
    # eventual exception — it can't stop Celery's own retry loop from
    # running first). Add a real backend URL here only if a future task
    # actually needs to fetch a result.
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_ignore_result=True,
    # Automatically discover tasks in our modules
    imports=[
        "app.tasks.analytics"
    ],
    # Bound the broker (task-publish) connection too, so an unreachable
    # broker fails fast rather than retrying at length.
    broker_connection_timeout=2,
    broker_connection_retry=True,
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
    broker_transport_options={
        "socket_connect_timeout": 2,
        "socket_timeout": 2,
        "max_retries": 1,
    },
)
