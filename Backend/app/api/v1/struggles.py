from __future__ import annotations

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db, AsyncSessionLocal
from app.api.deps import get_current_user_id
from app.models.struggle import StruggleEvent, MentorResponse
from app.schemas.struggle import (
    StruggleEventCreate,
    StruggleEventResponse,
    MentorHintRequest,
    MentorHintResponse,
)
from app.utils.exceptions import NotFoundException, ConflictException

router = APIRouter()


# ── Background task helper (uses its own session, not the request session) ────

async def _generate_hint_task(event_id: int, hint_level: str = "basic") -> None:
    """Background task that opens its own DB session to generate a mentor hint."""
    from app.services.mentor_service import generate_mentor_hint

    async with AsyncSessionLocal() as db:
        try:
            await generate_mentor_hint(event_id, db, hint_level=hint_level)
        except Exception:
            pass  # Errors in background tasks must not crash the worker


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/events",
    response_model=StruggleEventResponse,
    status_code=200,
    summary="Ingest a struggle event",
)
async def create_struggle_event(
    event: StruggleEventCreate,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> StruggleEventResponse:
    """
    Ingest a learner struggle event and kick off async AI mentor hint generation.

    - **client_event_id**: Unique client-side ID for idempotency / deduplication
    - **lesson_id**: The lesson where the struggle occurred
    - **lesson_timestamp_ms**: Video position in milliseconds
    - **struggle_score**: 0.0 (no struggle) → 1.0 (severe struggle)
    - **fixation_duration_ms**: Eye fixation metric
    - **inactivity_duration_ms**: Inactivity metric
    """
    # Idempotency — reject duplicate events
    stmt = select(StruggleEvent).where(
        StruggleEvent.client_event_id == event.client_event_id
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise ConflictException("Event already processed")

    # Persist derived metrics only (no raw biometric data)
    struggle = StruggleEvent(
        user_id=user_id,
        lesson_id=event.lesson_id,
        client_event_id=event.client_event_id,
        struggle_score=event.struggle_score,
        lesson_timestamp_ms=event.lesson_timestamp_ms,
        fixation_duration_ms=event.fixation_duration_ms,
        inactivity_duration_ms=event.inactivity_duration_ms,
        transcript_window_id=event.transcript_window_id,
    )
    db.add(struggle)
    await db.commit()
    await db.refresh(struggle)

    # Kick off hint generation in background (own session lifecycle)
    background_tasks.add_task(_generate_hint_task, struggle.id)

    # Auto-suggest hint if struggle score exceeds threshold (non-blocking)
    from app.services.mentor_service import auto_trigger_hint_if_threshold
    background_tasks.add_task(_auto_trigger_task, struggle.id, struggle.user_id,
                              struggle.lesson_id, struggle.lesson_timestamp_ms,
                              float(struggle.struggle_score or 0.0))

    return struggle


async def _auto_trigger_task(
    event_id: int,
    user_id: int,
    lesson_id: int,
    lesson_timestamp_ms: int,
    struggle_score: float,
) -> None:
    """Background task: push hint suggestion via WebSocket if score ≥ threshold."""
    from app.core.config import settings
    from app.websocket.manager import manager
    import logging
    _log = logging.getLogger(__name__)

    if struggle_score < settings.STRUGGLE_HINT_THRESHOLD:
        return

    try:
        await manager.broadcast_to_user(
            user_id,
            {
                "type": "hint_suggestion",
                "data": {
                    "struggle_event_id": event_id,
                    "lesson_id": lesson_id,
                    "lesson_timestamp_ms": lesson_timestamp_ms,
                    "struggle_score": struggle_score,
                    "message": (
                        "It looks like you might be stuck here. "
                        "Would you like an AI mentor hint?"
                    ),
                },
            },
        )
        _log.info(
            f"Auto-hint suggestion pushed: event_id={event_id} "
            f"user_id={user_id} score={struggle_score:.2f}"
        )
    except Exception as exc:
        _log.warning(f"Auto-hint WS push failed: {exc}")


@router.get(
    "/events/{event_id}",
    response_model=StruggleEventResponse,
    summary="Get a struggle event",
)
async def get_struggle_event(
    event_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> StruggleEventResponse:
    """Get a struggle event by ID (owner only)."""
    stmt = select(StruggleEvent).where(
        StruggleEvent.id == event_id,
        StruggleEvent.user_id == user_id,
    )
    result = await db.execute(stmt)
    struggle = result.scalar_one_or_none()

    if not struggle:
        raise NotFoundException("Struggle event not found")

    return struggle


@router.post(
    "/events/{event_id}/hint",
    response_model=MentorHintResponse,
    summary="Request a mentor hint",
)
async def get_mentor_hint(
    event_id: int,
    hint_request: MentorHintRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MentorHintResponse:
    """
    Request (or re-request) a mentor hint for a struggle event.

    - **hint_level**: `basic` | `intermediate` | `advanced` | `analogy` | `hinglish`
    """
    import time
    from app.services.mentor_service import generate_mentor_hint

    stmt = select(StruggleEvent).where(
        StruggleEvent.id == event_id,
        StruggleEvent.user_id == user_id,
    )
    result = await db.execute(stmt)
    struggle = result.scalar_one_or_none()

    if not struggle:
        raise NotFoundException("Struggle event not found")

    t0 = time.monotonic()
    hint = await generate_mentor_hint(event_id, db, hint_level=hint_request.hint_level)
    latency_ms = int((time.monotonic() - t0) * 1000)

    return MentorHintResponse(
        hint=hint,
        hint_level=hint_request.hint_level,
        latency_ms=latency_ms,
    )


@router.get(
    "/events",
    response_model=list[StruggleEventResponse],
    summary="List my struggle events",
)
async def list_struggle_events(
    lesson_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[StruggleEventResponse]:
    """
    List the authenticated user's struggle events, optionally filtered by lesson.
    """
    stmt = select(StruggleEvent).where(StruggleEvent.user_id == user_id)
    if lesson_id is not None:
        stmt = stmt.where(StruggleEvent.lesson_id == lesson_id)
    stmt = stmt.order_by(StruggleEvent.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()
