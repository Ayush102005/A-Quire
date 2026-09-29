"""app/api/v1/struggle_monitor.py — Struggle monitoring endpoints."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_student_user
from app.core.rate_limit import rate_limit
from app.models.lesson import Lesson
from app.models.notification import Notification
from app.models.student import User
from app.schemas.struggle_monitor import (
    HintRequest,
    HintResponse,
    StruggleEventResponse,
    StruggleMonitorInput,
    StruggleMonitorResult,
)
from app.services.mentor_service import generate_hint
from app.services.problem_bank import get_problem
from app.services.struggle_monitor import (
    get_student_struggle_events,
    get_struggle_event,
    monitor_learning_activity,
)

router = APIRouter(prefix="/struggle", tags=["Struggle Monitoring"])


@router.post("/monitor", response_model=StruggleMonitorResult, status_code=status.HTTP_200_OK)
async def monitor_struggle(
    payload: StruggleMonitorInput,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> StruggleMonitorResult:
    if payload.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student ID must match authenticated user.",
        )
    return await monitor_learning_activity(db, payload, background_tasks)


@router.get("/events", response_model=list[StruggleEventResponse])
async def list_struggle_events(
    lesson_id: int | None = Query(default=None),
    problem_id: str | None = Query(default=None),
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> list[StruggleEventResponse]:
    events = await get_student_struggle_events(db, current_user.id)
    if lesson_id is not None:
        events = [event for event in events if event.lesson_id == lesson_id]
    if problem_id is not None:
        events = [event for event in events if event.problem_id == problem_id]

    # Resolve a real display title per event — StudentDashboard.jsx
    # previously built its own "Lesson #{lesson_id}" fallback client-side,
    # which rendered literally "Lesson #null" for any problem_id-keyed (DSA
    # bank-linked) event, since lesson_id is always null there (see
    # StruggleEvent's exactly-one-target constraint).
    lesson_ids_needed = {e.lesson_id for e in events if e.lesson_id}
    lesson_titles: dict[int, str] = {}
    if lesson_ids_needed:
        rows = (await db.execute(
            select(Lesson.id, Lesson.title).where(Lesson.id.in_(lesson_ids_needed))
        )).all()
        lesson_titles = dict(rows)

    def _title_for(event) -> str:
        if event.lesson_id:
            return lesson_titles.get(event.lesson_id, f"Lesson #{event.lesson_id}")
        if event.problem_id:
            # get_problem() never throws — unknown slugs get a generic
            # fallback title derived from the slug (see
            # app/services/problem_bank.py).
            return get_problem(event.problem_id)["title"]
        return "Untitled"

    return [
        StruggleEventResponse.model_validate(event, from_attributes=True).model_copy(
            update={"title": _title_for(event)}
        )
        for event in events
    ]


@router.get("/events/{event_id}", response_model=StruggleEventResponse)
async def get_struggle_event_detail(
    event_id: int,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> StruggleEventResponse:
    event = await get_struggle_event(db, event_id)
    if event is None or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Struggle event not found.")
    return event


@router.post("/events/{event_id}/hint", response_model=HintResponse, status_code=status.HTTP_200_OK)
async def get_struggle_hint(
    event_id: int,
    body: HintRequest,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(15, 60),  # 15 hints / minute per IP — each costs a Claude + Polly call
) -> HintResponse:
    event = await get_struggle_event(db, event_id)
    if event is None or event.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Struggle event not found.")

    # generate_hint() persists `hint_text` onto the event itself and pushes
    # the WS "hint" message — this endpoint used to redundantly re-do both
    # (working around generate_hint's now-fixed persistence/WS-shape bugs;
    # see its docstring). Only the Notification below is genuinely
    # endpoint-specific — auto-triggered hints (from struggle_monitor.py's
    # service layer) intentionally skip creating one, since the student is
    # already shown the intervention overlay in that flow.
    hint_text, audio_base64 = await generate_hint(
        event_id=event_id,
        db=db,
        hint_level=body.hint_level,
        custom_message=body.custom_message,
        language=body.language,
        conversation_history=body.conversation_history,
    )

    notification = Notification(
        user_id=current_user.id,
        title="AI Mentor Hint",
        message=hint_text,
    )
    db.add(notification)
    await db.commit()

    return HintResponse(
        event_id=event_id,
        hint_text=hint_text,
        hint_level=body.hint_level,
        audio_base64=audio_base64,
    )
