"""
app/api/v1/analytics.py
────────────────────────
Student analytics endpoints for ProgressAnalytics and StruggleAnalytics pages.

GET /analytics/student          — summary stats
GET /analytics/student/progress — per-course progress breakdown
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_student_user
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.progress import Progress
from app.models.struggle_event import StruggleEvent
from app.models.student import User
from app.models.assessment import QuizSession, QuizResponse, Topic
from sqlalchemy.orm import joinedload

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/student", summary="Student summary stats")
async def student_summary(
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """High-level stats for the student dashboard widgets."""

    # Enrolled courses count
    enrolled_count = await db.scalar(
        select(func.count(Enrollment.id)).where(Enrollment.user_id == current_user.id)
    ) or 0

    # Completed lessons count
    completed_lessons = await db.scalar(
        select(func.count(Progress.id)).where(
            Progress.user_id == current_user.id,
            Progress.is_completed == True,
        )
    ) or 0

    # Average completion across ALL lessons in enrolled courses
    # (unstarted lessons count as 0%, not excluded)
    enrolled_course_ids_result = await db.execute(
        select(Enrollment.course_id).where(Enrollment.user_id == current_user.id)
    )
    enrolled_course_ids = [r[0] for r in enrolled_course_ids_result.all()]

    if enrolled_course_ids:
        total_lesson_ids_result = await db.execute(
            select(Lesson.id)
            .join(Module, Module.id == Lesson.module_id)
            .where(Module.course_id.in_(enrolled_course_ids))
        )
        all_lesson_ids = [r[0] for r in total_lesson_ids_result.all()]
        total_lesson_count = len(all_lesson_ids)

        if total_lesson_count > 0:
            progress_sum = await db.scalar(
                select(func.sum(Progress.completion_percent)).where(
                    Progress.user_id == current_user.id,
                    Progress.lesson_id.in_(all_lesson_ids),
                )
            ) or 0.0
            avg_completion = round(float(progress_sum) / total_lesson_count, 1)
        else:
            avg_completion = 0.0
    else:
        avg_completion = 0.0

    # Total struggle events
    struggle_count = await db.scalar(
        select(func.count(StruggleEvent.id)).where(
            StruggleEvent.user_id == current_user.id
        )
    ) or 0

    # Hints received
    hints_count = await db.scalar(
        select(func.count(StruggleEvent.id)).where(
            StruggleEvent.user_id == current_user.id,
            StruggleEvent.hint_text.isnot(None),
        )
    ) or 0

    # Total watched seconds
    total_watched_seconds = await db.scalar(
        select(func.sum(Progress.watched_seconds)).where(
            Progress.user_id == current_user.id
        )
    ) or 0

    # Lessons in progress
    in_progress_count = await db.scalar(
        select(func.count(Progress.id)).where(
            Progress.user_id == current_user.id,
            Progress.is_completed == False,
            Progress.watched_seconds > 0
        )
    ) or 0

    # Average confidence score
    avg_confidence = await db.scalar(
        select(func.avg(QuizResponse.confidence))
        .join(QuizSession, QuizResponse.session_id == QuizSession.id)
        .where(QuizSession.user_id == current_user.id)
    )
    avg_confidence = round(float(avg_confidence or 0.0), 1)

    # Misconception breakdown (count by error_type)
    misconceptions_query = (
        select(QuizResponse.error_type, func.count(QuizResponse.id))
        .join(QuizSession, QuizResponse.session_id == QuizSession.id)
        .where(
            QuizSession.user_id == current_user.id,
            QuizResponse.error_type.isnot(None)
        )
        .group_by(QuizResponse.error_type)
    )
    misconceptions_result = await db.execute(misconceptions_query)
    misconception_breakdown = {row[0]: row[1] for row in misconceptions_result.all()}

    return {
        "enrolled_courses": enrolled_count,
        "completed_lessons": completed_lessons,
        "avg_completion_percent": avg_completion,
        "struggle_events": struggle_count,
        "hints_received": hints_count,
        "total_watched_seconds": total_watched_seconds,
        "total_lessons_in_progress": in_progress_count,
        "avg_confidence_score": avg_confidence,
        "misconception_breakdown": misconception_breakdown,
    }


@router.get("/student/progress", summary="Course-level progress breakdown")
async def student_progress(
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return completion stats per enrolled course."""
    enrolled_rows = await db.execute(
        select(Enrollment.course_id).where(Enrollment.user_id == current_user.id)
    )
    course_ids = [row[0] for row in enrolled_rows.all()]

    if not course_ids:
        return []

    results = []
    for course_id in course_ids:
        course: Course | None = await db.get(Course, course_id)
        if not course:
            continue

        # All lesson IDs in this course
        lesson_ids_result = await db.execute(
            select(Lesson.id)
            .join(Module, Module.id == Lesson.module_id)
            .where(Module.course_id == course_id)
        )
        lesson_ids = [row[0] for row in lesson_ids_result.all()]
        total_lessons = len(lesson_ids)

        if total_lessons == 0:
            results.append({
                "course_id": course_id,
                "course_title": course.title,
                "total_lessons": 0,
                "completed_lessons": 0,
                "completion_percent": 0.0,
            })
            continue

        progress_result = await db.execute(
            select(Progress).where(
                Progress.user_id == current_user.id,
                Progress.lesson_id.in_(lesson_ids),
            )
        )
        progress_rows = progress_result.scalars().all()
        completed = sum(1 for p in progress_rows if p.is_completed)
        avg_pct = sum(p.completion_percent for p in progress_rows) / total_lessons

        results.append({
            "course_id": course_id,
            "course_title": course.title,
            "total_lessons": total_lessons,
            "completed_lessons": completed,
            "completion_percent": round(avg_pct, 1),
        })

    return results


@router.get("/student/theta-history", summary="Theta progression over time")
async def student_theta_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Returns the user's theta (ability) over time, grouped by topic."""
    # Fetch all quiz sessions for this user, ordered by topic and created_at
    query = (
        select(QuizSession)
        .options(joinedload(QuizSession.topic))
        .where(QuizSession.user_id == current_user.id)
        .order_by(QuizSession.topic_id, QuizSession.created_at)
    )
    result = await db.execute(query)
    sessions = result.scalars().all()

    # Group by topic_id (name alone isn't enough to build a /adaptive-quiz?topic=
    # link back to this topic, and isn't guaranteed unique)
    history_by_topic: dict[int, dict] = {}
    for s in sessions:
        topic_id = s.topic_id
        topic_name = s.topic.name if s.topic else "Unknown Topic"
        if topic_id not in history_by_topic:
            history_by_topic[topic_id] = {
                "topic_id": topic_id,
                "topic": topic_name,
                "history": [],
            }

        history_by_topic[topic_id]["history"].append({
            "session_id": s.id,
            "theta": round(s.current_theta, 2),
            "date": s.created_at.isoformat()
        })

    return list(history_by_topic.values())


@router.get("/student/misconceptions", summary="Recent misconceptions and feedback")
async def student_misconceptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Returns recent wrong answers where diagnostic feedback was provided."""
    # Join QuizResponse -> QuizSession (to filter by user) and Question (to get text)
    query = (
        select(QuizResponse)
        .join(QuizSession, QuizResponse.session_id == QuizSession.id)
        .options(joinedload(QuizResponse.question), joinedload(QuizResponse.session).joinedload(QuizSession.topic))
        .where(
            QuizSession.user_id == current_user.id,
            QuizResponse.error_type.isnot(None)
        )
        .order_by(QuizResponse.created_at.desc())
        .limit(20)
    )
    result = await db.execute(query)
    responses = result.scalars().all()
    
    formatted_result = []
    for r in responses:
        topic_name = r.session.topic.name if (r.session and r.session.topic) else "Unknown Topic"
        formatted_result.append({
            "id": r.id,
            "topic": topic_name,
            "error_type": r.error_type,
            "student_explanation": r.student_explanation,
            "feedback_provided": r.feedback_provided,
            "date": r.created_at.isoformat()
        })
        
    return formatted_result
