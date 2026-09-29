"""app/services/struggle_monitor.py — Rule-based struggle detection service."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mentor_intervention import MentorIntervention
from app.models.struggle_event import StruggleEvent
from app.schemas.struggle_monitor import (
    StruggleEventCreate,
    StruggleMonitorInput,
    StruggleMonitorResult,
)

logger = logging.getLogger(__name__)


def calculate_severity(
    rewatch_count: int,
    pause_count: int,
    quiz_score: int | None,
    idle_seconds: int,
    completion_percent: float,
    failed_attempts: int,
    fixation_duration_ms: int = 0,
    gaze_off_screen_ms: int = 0,
) -> float:
    """Map rule-based signals to a severity score in [0.0, 1.0].

    Signals include both behavioural (pauses, rewatches) and gaze-derived
    (fixation duration, off-screen time) metrics.
    """
    score = 0.0

    # ── Behavioural signals ────────────────────────────────────────────────
    if rewatch_count >= 2:
        score += 0.25
    if pause_count >= 2:
        score += 0.20
    if quiz_score is not None and quiz_score < 40:
        score += 0.30
    if failed_attempts > 2:
        score += 0.20
    if idle_seconds > 300 and completion_percent < 60:
        score += 0.20
    if completion_percent < 30 and idle_seconds > 120:
        score += 0.10

    # ── Gaze-derived signals (Steps 16–17 of gaze tracking algorithm) ─────
    # Long fixation on one spot → student is staring at confusing content
    if fixation_duration_ms > 8000:
        score += 0.25
    elif fixation_duration_ms > 5000:
        score += 0.12

    # Student looked away from the screen → disengaged / frustrated
    if gaze_off_screen_ms > 10000:
        score += 0.20
    elif gaze_off_screen_ms > 5000:
        score += 0.10

    return min(score, 1.0)


def determine_event_type(
    rewatch_count: int,
    pause_count: int,
    quiz_score: int | None,
    idle_seconds: int,
    failed_attempts: int,
    fixation_duration_ms: int = 0,
    gaze_off_screen_ms: int = 0,
    context_type: str = "video",
) -> str:
    """Choose the best struggle type based on the strongest rule match."""
    if quiz_score is not None and quiz_score < 40:
        return "low_quiz_score"
    if failed_attempts > 2:
        return "repeated_failed_attempts"
    if fixation_duration_ms > 8000:
        return "gaze_fixation_spike"
    if gaze_off_screen_ms > 10000:
        return "gaze_off_screen"
    # >= 2, matching should_create_struggle()'s own detection threshold
    # below — these previously required > 3, so a rewatch/pause burst that
    # was already enough to *detect* a struggle (frontend fires at exactly
    # rewatch_count/pause_count == 2 — see LessonPlayer.jsx) could never
    # actually be *classified* as "rewatch_spike"/"pause_frequent": it fell
    # through every check here and landed on the generic "general_confusion"
    # fallback instead, every single time.
    if rewatch_count >= 2:
        return "rewatch_spike"
    if pause_count >= 2:
        return "pause_frequent"
    if idle_seconds > 300:
        return "idle_without_progress"
    # Context-aware fallbacks
    if context_type == "dsa":
        return "dsa_stuck"
    if context_type in ("jee", "neet"):
        return "question_confusion"
    return "general_confusion"


def should_create_struggle(input_data: StruggleMonitorInput) -> bool:
    """Return True when the activity data meets any configured struggle rule."""
    if input_data.manual_trigger:
        return True
    if input_data.rewatch_count >= 2:
        return True
    if input_data.pause_count >= 2:
        return True
    if input_data.quiz_score is not None and input_data.quiz_score < 40:
        return True
    if input_data.failed_attempts > 2:
        return True
    if input_data.idle_seconds > 300 and input_data.completion_percent < 60:
        return True
    # Gaze-derived triggers (Steps 16–17 of gaze algorithm)
    if input_data.fixation_duration_ms > 8000:
        return True
    if input_data.gaze_off_screen_ms > 10000:
        return True
    return False


async def save_struggle_event(
    db: AsyncSession,
    event_data: StruggleEventCreate,
) -> StruggleEvent:
    """Store a StruggleEvent record in the database."""
    event = StruggleEvent(
        user_id=event_data.student_id,
        course_id=event_data.course_id,
        lesson_id=event_data.lesson_id,
        problem_id=event_data.problem_id,
        event_type=event_data.event_type,
        severity=event_data.severity,
        confidence_score=event_data.confidence_score,
        status=event_data.status,
        notes=event_data.notes,
        client_event_id=event_data.client_event_id,
        struggle_score=event_data.struggle_score,
        lesson_timestamp_ms=event_data.lesson_timestamp_ms,
        fixation_duration_ms=event_data.fixation_duration_ms,
        inactivity_duration_ms=event_data.inactivity_duration_ms,
        gaze_off_screen_ms=event_data.gaze_off_screen_ms,
        context_type=event_data.context_type,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


async def create_mentor_intervention(
    db: AsyncSession,
    struggle_event_id: int,
    action: str,
    notes: str | None = None,
) -> MentorIntervention:
    """Persist a follow-up mentor intervention for a struggle event."""
    intervention = MentorIntervention(
        struggle_event_id=struggle_event_id,
        action=action,
        notes=notes,
        status="pending",
    )
    db.add(intervention)
    await db.flush()
    await db.refresh(intervention)
    return intervention


async def _generate_auto_hint(event_id: int) -> None:
    """
    Background task: generate and persist a hint for an auto-detected
    struggle event, using a fresh DB session.

    Must NOT reuse the request's `db` session — FastAPI's BackgroundTasks
    run after the response has already been sent, by which point the
    request-scoped session from `get_db()` has been committed and closed
    (see app/db/session.py). Mirrors the pattern already used for
    fire-and-forget DB work in app/tasks/analytics.py.
    """
    from app.db.session import AsyncSessionLocal
    from app.services.mentor_service import generate_hint

    try:
        async with AsyncSessionLocal() as db:
            await generate_hint(event_id=event_id, db=db, hint_level="basic")
    except Exception:
        # Best-effort: a failed auto-hint (e.g. Anthropic API down) must
        # never surface as a broken request — the struggle event itself is
        # already saved by the time this runs. generate_hint() already
        # falls back to a static template on API failure, so this except
        # only catches something more fundamental (DB down, event deleted
        # between save and this task running, etc.).
        logger.exception(f"Auto-hint generation failed for struggle event {event_id}")


async def monitor_learning_activity(
    db: AsyncSession,
    input_data: StruggleMonitorInput,
    background_tasks: BackgroundTasks | None = None,
) -> StruggleMonitorResult:
    """Detect struggle based on activity payload and persist as needed."""
    detected = should_create_struggle(input_data)

    if not detected:
        return StruggleMonitorResult(
            detected=False,
            status="no_struggle",
            message="No struggle conditions were triggered.",
        )

    severity = calculate_severity(
        rewatch_count=input_data.rewatch_count,
        pause_count=input_data.pause_count,
        quiz_score=input_data.quiz_score,
        idle_seconds=input_data.idle_seconds,
        completion_percent=input_data.completion_percent,
        failed_attempts=input_data.failed_attempts,
        fixation_duration_ms=input_data.fixation_duration_ms,
        gaze_off_screen_ms=input_data.gaze_off_screen_ms,
    )
    confidence_score = min(1.0, 0.4 + severity * 0.6)
    event_type = determine_event_type(
        rewatch_count=input_data.rewatch_count,
        pause_count=input_data.pause_count,
        quiz_score=input_data.quiz_score,
        idle_seconds=input_data.idle_seconds,
        failed_attempts=input_data.failed_attempts,
        fixation_duration_ms=input_data.fixation_duration_ms,
        gaze_off_screen_ms=input_data.gaze_off_screen_ms,
        context_type=input_data.context_type,
    )

    event_payload = StruggleEventCreate(
        student_id=input_data.student_id,
        course_id=input_data.course_id,
        lesson_id=input_data.lesson_id,
        problem_id=input_data.problem_id,
        event_type=input_data.event_type or event_type,
        severity=severity,
        confidence_score=confidence_score,
        detected_at=datetime.now(timezone.utc),
        status="new",
        notes=input_data.notes,
        client_event_id=input_data.client_event_id or f"monitor-{uuid.uuid4()}",
        struggle_score=input_data.struggle_score if input_data.struggle_score is not None else severity,
        lesson_timestamp_ms=input_data.lesson_timestamp_ms or 0,
        fixation_duration_ms=input_data.fixation_duration_ms,
        inactivity_duration_ms=input_data.inactivity_duration_ms,
        gaze_off_screen_ms=input_data.gaze_off_screen_ms,
        context_type=input_data.context_type,
    )

    event = await save_struggle_event(db, event_payload)

    await create_mentor_intervention(
        db,
        struggle_event_id=event.id,
        action="suggest_mentor_hint",
        notes=f"Auto-generated intervention after struggle detection (context={input_data.context_type}).",
    )

    # Every detected struggle gets a hint generated automatically — the
    # "basic" level, matching the overlay's default action — rather than
    # only when the student explicitly clicks a hint-level button.
    # Previously a struggle event could sit with `hint_text=None`
    # indefinitely if the student dismissed/ignored the intervention
    # overlay (Resume/Replay), which is exactly the "No Hint Yet" state
    # that showed up repeatedly in the student dashboard's Recent
    # Interventions list. Scheduled as a background task (not awaited here)
    # so this endpoint stays fast — the request-scoped `db` session is
    # committed by the time the task runs (see get_db() in
    # app/db/session.py), so `_generate_auto_hint` opens its own session
    # rather than reusing this one. The frontend picks up the result via
    # the existing WebSocket "hint" push (see generate_hint()), so no
    # frontend change was needed for delivery — LessonPlayer.jsx already
    # listens for it.
    if background_tasks is not None:
        background_tasks.add_task(_generate_auto_hint, event.id)

    return StruggleMonitorResult(
        detected=True,
        event_id=event.id,
        event_type=event.event_type,
        severity=event.severity,
        confidence_score=event.confidence_score,
        status=event.status,
        message="Struggle event detected and saved.",
    )


async def get_student_struggle_events(
    db: AsyncSession,
    student_id: int,
) -> list[StruggleEvent]:
    query = select(StruggleEvent).where(StruggleEvent.user_id == student_id).order_by(StruggleEvent.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def get_struggle_event(
    db: AsyncSession,
    event_id: int,
) -> StruggleEvent | None:
    return await db.get(StruggleEvent, event_id)
