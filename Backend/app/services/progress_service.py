from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, Module, Lesson
from app.models.progress import Progress
from app.models.user import User, RoleEnum
from app.schemas.progress import (
    ProgressUpdateRequest,
    CourseProgressSummary,
    ContinueLearning,
    ContinueLearningItem,
    LessonProgressSummary,
    ModuleProgressSummary,
    ProgressResponse,
)


class ProgressService:

    # ── Progress Queries ──────────────────────────────────────────────────────

    @staticmethod
    async def get_progress(
        db: AsyncSession,
        user_id: int,
        lesson_id: int,
    ) -> Progress | None:
        """Get progress record for a user and lesson"""
        result = await db.execute(
            select(Progress).where(
                (Progress.user_id == user_id) & (Progress.lesson_id == lesson_id)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_or_create_progress(
        db: AsyncSession,
        user_id: int,
        lesson_id: int,
    ) -> Progress:
        """Get existing progress or create new one"""
        # First verify that the lesson exists
        lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        if not lesson_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found",
            )

        progress = await ProgressService.get_progress(db, user_id, lesson_id)
        if not progress:
            progress = Progress(user_id=user_id, lesson_id=lesson_id)
            db.add(progress)
            await db.commit()
            await db.refresh(progress)
        return progress

    # ── Update Progress ───────────────────────────────────────────────────────

    @staticmethod
    async def update_progress(
        db: AsyncSession,
        user_id: int,
        lesson_id: int,
        payload: ProgressUpdateRequest,
    ) -> Progress:
        """Update lesson progress (authenticated student only)"""
        progress = await ProgressService.get_or_create_progress(db, user_id, lesson_id)

        # Update watched seconds
        progress.watched_seconds = payload.watched_seconds

        # Clamp completion percent between 0 and 100
        progress.completion_percent = max(0.0, min(100.0, payload.completion_percent))

        # Update completion status
        if payload.is_completed is not None:
            progress.is_completed = payload.is_completed
        else:
            # Auto-complete if percentage is >= 90
            progress.is_completed = progress.completion_percent >= 90.0

        db.add(progress)
        await db.commit()
        await db.refresh(progress)
        return progress

    # ── Fetch Progress ────────────────────────────────────────────────────────

    @staticmethod
    async def get_lesson_progress(
        db: AsyncSession,
        user_id: int,
        lesson_id: int,
    ) -> ProgressResponse:
        """Fetch lesson progress for a student"""
        progress = await ProgressService.get_or_create_progress(db, user_id, lesson_id)
        return ProgressResponse.model_validate(progress)

    # ── Course Progress Summary ───────────────────────────────────────────────

    @staticmethod
    async def get_course_progress(
        db: AsyncSession,
        user_id: int,
        course_id: int,
    ) -> CourseProgressSummary:
        """Fetch course progress summary with all modules and lessons"""
        # Get course with modules and lessons
        result = await db.execute(
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.modules).selectinload(Module.lessons)
            )
        )
        course = result.scalar_one_or_none()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Get all progress records for user in this course
        progress_result = await db.execute(
            select(Progress)
            .join(Lesson)
            .join(Module)
            .where(
                (Progress.user_id == user_id) & (Module.course_id == course_id)
            )
        )
        progress_records = progress_result.scalars().all()
        progress_map = {p.lesson_id: p for p in progress_records}

        # Build module summaries
        total_lessons = 0
        completed_lessons = 0
        total_completion = 0.0
        module_summaries = []

        for module in course.modules:
            lesson_summaries = []
            module_completed = 0
            module_total = 0
            module_completion = 0.0

            for lesson in module.lessons:
                total_lessons += 1
                module_total += 1

                progress = progress_map.get(lesson.id)
                if progress:
                    if progress.is_completed:
                        completed_lessons += 1
                        module_completed += 1
                    module_completion += progress.completion_percent
                    total_completion += progress.completion_percent
                else:
                    # Create progress record if doesn't exist
                    progress = Progress(user_id=user_id, lesson_id=lesson.id)
                    db.add(progress)

                lesson_summaries.append(
                    LessonProgressSummary(
                        lesson_id=lesson.id,
                        lesson_title=lesson.title,
                        watched_seconds=progress.watched_seconds if progress else 0,
                        completion_percent=progress.completion_percent if progress else 0.0,
                        is_completed=progress.is_completed if progress else False,
                        updated_at=progress.updated_at if progress else course.created_at,
                    )
                )

            # Calculate module average
            module_avg = (module_completion / module_total) if module_total > 0 else 0.0

            module_summaries.append(
                ModuleProgressSummary(
                    module_id=module.id,
                    module_title=module.title,
                    total_lessons=module_total,
                    completed_lessons=module_completed,
                    average_completion=module_avg,
                    lessons=lesson_summaries,
                )
            )

        await db.commit()

        # Calculate course average
        course_avg = (total_completion / total_lessons) if total_lessons > 0 else 0.0

        return CourseProgressSummary(
            course_id=course.id,
            course_title=course.title,
            total_modules=len(course.modules),
            total_lessons=total_lessons,
            completed_lessons=completed_lessons,
            average_completion=course_avg,
            modules=module_summaries,
        )

    # ── Continue Learning Summary ─────────────────────────────────────────────

    @staticmethod
    async def get_continue_learning(
        db: AsyncSession,
        user_id: int,
        limit: int = 10,
    ) -> ContinueLearning:
        """Get continue learning summary grouped by status"""
        # Get all published courses with progress
        result = await db.execute(
            select(Course, Module, Lesson, Progress)
            .join(Module, Module.course_id == Course.id)
            .join(Lesson, Lesson.module_id == Module.id)
            .outerjoin(
                Progress,
                (Progress.lesson_id == Lesson.id) & (Progress.user_id == user_id),
            )
            .where(Course.is_published == True)
            .order_by(Progress.updated_at.desc())
        )

        rows = result.fetchall()

        # Organize by status
        in_progress = []
        not_started = []
        completed = []

        seen = set()  # Avoid duplicates

        for course, module, lesson, progress in rows:
            key = f"{course.id}-{lesson.id}"
            if key in seen:
                continue
            seen.add(key)

            item = ContinueLearningItem(
                course_id=course.id,
                course_title=course.title,
                lesson_id=lesson.id,
                lesson_title=lesson.title,
                module_title=module.title,
                completion_percent=progress.completion_percent if progress else 0.0,
                last_updated=progress.updated_at if progress else course.created_at,
            )

            if progress:
                if progress.is_completed:
                    completed.append(item)
                else:
                    in_progress.append(item)
            else:
                not_started.append(item)

        # Return limited results
        return ContinueLearning(
            in_progress=in_progress[:limit],
            not_started=not_started[:limit],
            completed=completed[:limit],
        )
