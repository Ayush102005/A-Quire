from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user_id
from app.schemas.progress import (
    ProgressUpdateRequest,
    ProgressResponse,
    CourseProgressSummary,
    ContinueLearning,
)
from app.services.progress_service import ProgressService

router = APIRouter()


@router.post("/{lesson_id}", response_model=ProgressResponse, summary="Update lesson progress")
async def update_progress(
    lesson_id: int,
    progress_update: ProgressUpdateRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ProgressResponse:
    """
    Upsert lesson progress for the authenticated student.

    - **watched_seconds**: Total seconds watched so far
    - **completion_percent**: 0–100 completion percentage
    - **is_completed**: Explicit override; auto-set to True when percent ≥ 100 if omitted
    """
    return await ProgressService.update_progress(db, user_id, lesson_id, progress_update)


@router.get("/lesson/{lesson_id}", response_model=ProgressResponse, summary="Get lesson progress")
async def get_lesson_progress(
    lesson_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ProgressResponse:
    """
    Get the authenticated student's progress for a specific lesson.
    Creates a blank progress record if none exists yet.
    """
    return await ProgressService.get_lesson_progress(db, user_id, lesson_id)


@router.get("/course/{course_id}", response_model=CourseProgressSummary, summary="Get course progress")
async def get_course_progress(
    course_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> CourseProgressSummary:
    """
    Full progress breakdown for a course, grouped by module and lesson.
    Creates blank progress records for lessons with no activity.
    """
    return await ProgressService.get_course_progress(db, user_id, course_id)


@router.get("/continue-learning", response_model=ContinueLearning, summary="Continue learning feed")
async def get_continue_learning(
    limit: int = 10,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ContinueLearning:
    """
    Returns lessons grouped into **in_progress**, **not_started**, and **completed** buckets.
    Ordered by most recently updated.
    """
    return await ProgressService.get_continue_learning(db, user_id, limit=limit)
