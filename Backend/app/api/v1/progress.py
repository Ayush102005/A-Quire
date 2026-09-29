"""
app/api/v1/progress.py
───────────────────────
Lesson-level progress tracking — matches the frontend api.js progress calls exactly.

POST /progress/{lesson_id}          — upsert progress (watched_seconds, completion_percent, is_completed)
GET  /progress/lesson/{lesson_id}   — get progress for a specific lesson
GET  /progress/course/{course_id}   — aggregated progress for a whole course
GET  /progress/continue-learning    — in-progress lessons for the dashboard
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_student_user
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.progress import Progress
from app.models.student import User
from app.schemas.progress import ContinueLearningItem, ProgressResponse, ProgressUpsert

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.post("/{lesson_id}", response_model=ProgressResponse,
             summary="Upsert lesson progress")
async def upsert_progress(
    lesson_id: int,
    body: ProgressUpsert,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> Progress:
    """Create or update progress for the given lesson."""
    lesson: Lesson | None = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found.")

    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.lesson_id == lesson_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        progress = Progress(user_id=current_user.id, lesson_id=lesson_id)
        db.add(progress)

    progress.watched_seconds = body.watched_seconds

    # Once a lesson is marked complete, don't let a later raw-playhead ping
    # (the 15s auto-save in LessonPlayer.jsx, which reports actual watched%
    # and never sends is_completed) silently drag completion_percent back
    # down while is_completed stays true — that's the "30% / 1 of 1 lessons
    # completed" inconsistency. Only an explicit is_completed from the
    # caller may change a lesson's completed state once set.
    if progress.is_completed and body.is_completed is not False:
        progress.completion_percent = max(progress.completion_percent, body.completion_percent)
    else:
        progress.completion_percent = body.completion_percent

    if body.is_completed is not None:
        progress.is_completed = body.is_completed
    elif body.completion_percent >= 100.0:
        progress.is_completed = True

    await db.flush()
    return progress


@router.get("/lesson/{lesson_id}", response_model=ProgressResponse,
            summary="Get progress for a lesson")
async def get_lesson_progress(
    lesson_id: int,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> Progress:
    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.lesson_id == lesson_id,
        )
    )
    progress = result.scalar_one_or_none()
    if not progress:
        # Return a default empty progress object instead of 404 to simplify client-side handling.
        default = Progress(
            id=0,
            user_id=current_user.id,
            lesson_id=lesson_id,
            watched_seconds=0,
            completion_percent=0.0,
            is_completed=False,
            updated_at=datetime.now(timezone.utc),
        )
        return default
    return progress


@router.get("/course/{course_id}", summary="Get aggregated progress for a course")
async def get_course_progress(
    course_id: int,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return average completion % across all lessons in the course."""
    # Get all lesson IDs for this course
    result = await db.execute(
        select(Lesson.id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id == course_id)
    )
    lesson_ids = [row[0] for row in result.all()]

    if not lesson_ids:
        return {"course_id": course_id, "total_lessons": 0, "completion_percent": 0.0, "completed_lessons": 0}

    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.lesson_id.in_(lesson_ids),
        )
    )
    progress_rows = result.scalars().all()

    completed = sum(1 for p in progress_rows if p.is_completed)
    avg_pct = (
        sum(p.completion_percent for p in progress_rows) / len(lesson_ids)
        if lesson_ids else 0.0
    )

    return {
        "course_id": course_id,
        "total_lessons": len(lesson_ids),
        "completed_lessons": completed,
        "completion_percent": round(avg_pct, 1),
    }


@router.get("/continue-learning", response_model=list[ContinueLearningItem],
            summary="In-progress lessons for the dashboard")
async def continue_learning(
    limit: int = 10,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return the most recently accessed incomplete lessons."""
    result = await db.execute(
        select(Progress, Lesson, Module, Course)
        .join(Lesson, Lesson.id == Progress.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .where(
            Progress.user_id == current_user.id,
            Progress.is_completed == False,
        )
        .order_by(Progress.updated_at.desc())
        .limit(limit)
    )
    rows = result.all()

    return [
        {
            "lesson_id": row.Progress.lesson_id,
            "lesson_title": row.Lesson.title,
            "lesson_type": row.Lesson.lesson_type,
            "course_id": row.Course.id,
            "course_title": row.Course.title,
            "completion_percent": row.Progress.completion_percent,
            "watched_seconds": row.Progress.watched_seconds,
            "updated_at": row.Progress.updated_at,
        }
        for row in rows
    ]
