from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, Module, Lesson
from app.models.user import User, RoleEnum
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    ModuleCreate,
    ModuleUpdate,
    LessonCreate,
    LessonUpdate,
)


class CourseService:

    # ── Course Queries ────────────────────────────────────────────────────────

    @staticmethod
    def _course_query_with_modules():
        """Build eager-load query for course with modules and lessons"""
        return select(Course).options(
            selectinload(Course.modules).selectinload(Module.lessons)
        )

    @staticmethod
    async def get_course_by_id(db: AsyncSession, course_id: int) -> Course | None:
        """Get course by ID with eager-loaded relationships"""
        result = await db.execute(
            CourseService._course_query_with_modules().where(Course.id == course_id)
        )
        return result.scalar_one_or_none()

    # ── Course CRUD ───────────────────────────────────────────────────────────

    @staticmethod
    async def create_course(
        db: AsyncSession,
        instructor: User,
        payload: CourseCreate,
    ) -> Course:
        """Create a new course (instructor/admin only)"""
        if instructor.role not in [RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only instructors and admins can create courses",
            )

        course = Course(
            instructor_id=instructor.id,
            title=payload.title,
            description=payload.description,
            is_published=False,
        )
        db.add(course)
        await db.commit()
        return await CourseService.get_course_by_id(db, course.id)

    @staticmethod
    async def update_course(
        db: AsyncSession,
        course_id: int,
        user: User,
        payload: CourseUpdate,
    ) -> Course:
        """Update course (instructor owner or admin only)"""
        course = await CourseService.get_course_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Check authorization
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own courses",
            )

        if payload.title is not None:
            course.title = payload.title
        if payload.description is not None:
            course.description = payload.description

        db.add(course)
        await db.commit()
        return await CourseService.get_course_by_id(db, course.id)

    @staticmethod
    async def delete_course(
        db: AsyncSession,
        course_id: int,
        user: User,
    ) -> None:
        """Delete course (instructor owner or admin only)"""
        course = await CourseService.get_course_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Check authorization
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own courses",
            )

        await db.delete(course)
        await db.commit()

    # ── Course Publishing ─────────────────────────────────────────────────────

    @staticmethod
    async def publish_course(
        db: AsyncSession,
        course_id: int,
        user: User,
    ) -> Course:
        """Publish a course (instructor owner or admin only)"""
        course = await CourseService.get_course_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Check authorization
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only publish your own courses",
            )

        course.is_published = True
        db.add(course)
        await db.commit()
        return await CourseService.get_course_by_id(db, course.id)

    @staticmethod
    async def unpublish_course(
        db: AsyncSession,
        course_id: int,
        user: User,
    ) -> Course:
        """Unpublish a course (instructor owner or admin only)"""
        course = await CourseService.get_course_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Check authorization
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only unpublish your own courses",
            )

        course.is_published = False
        db.add(course)
        await db.commit()
        return await CourseService.get_course_by_id(db, course.id)

    # ── List Courses ──────────────────────────────────────────────────────────

    @staticmethod
    async def list_published_courses(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Course]:
        """List all published courses (for students)"""
        result = await db.execute(
            CourseService._course_query_with_modules()
            .where(Course.is_published == True)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def list_my_courses(
        db: AsyncSession,
        instructor: User,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Course]:
        """List courses created by instructor"""
        if instructor.role not in [RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only instructors can access their courses",
            )

        result = await db.execute(
            CourseService._course_query_with_modules()
            .where(Course.instructor_id == instructor.id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    # ── Module Management ─────────────────────────────────────────────────────

    @staticmethod
    async def create_module(
        db: AsyncSession,
        course_id: int,
        user: User,
        payload: ModuleCreate,
    ) -> Module:
        """Create a module in a course (instructor owner or admin only)"""
        course = await CourseService.get_course_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )

        # Check authorization
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add modules to your own courses",
            )

        module = Module(
            course_id=course_id,
            title=payload.title,
            description=payload.description,
            order=payload.order,
        )
        db.add(module)
        await db.commit()
        result = await db.execute(
            select(Module)
            .options(selectinload(Module.lessons))
            .where(Module.id == module.id)
        )
        return result.scalar_one()

    @staticmethod
    async def update_module(
        db: AsyncSession,
        module_id: int,
        user: User,
        payload: ModuleUpdate,
    ) -> Module:
        """Update a module (course owner or admin only)"""
        result = await db.execute(select(Module).where(Module.id == module_id))
        module = result.scalar_one_or_none()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # Check authorization
        course = await CourseService.get_course_by_id(db, module.course_id)
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update modules in your own courses",
            )

        if payload.title is not None:
            module.title = payload.title
        if payload.description is not None:
            module.description = payload.description
        if payload.order is not None:
            module.order = payload.order

        db.add(module)
        await db.commit()
        result = await db.execute(
            select(Module)
            .options(selectinload(Module.lessons))
            .where(Module.id == module.id)
        )
        return result.scalar_one()

    @staticmethod
    async def delete_module(
        db: AsyncSession,
        module_id: int,
        user: User,
    ) -> None:
        """Delete a module (course owner or admin only)"""
        result = await db.execute(select(Module).where(Module.id == module_id))
        module = result.scalar_one_or_none()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # Check authorization
        course = await CourseService.get_course_by_id(db, module.course_id)
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete modules from your own courses",
            )

        await db.delete(module)
        await db.commit()

    # ── Lesson Management ─────────────────────────────────────────────────────

    @staticmethod
    async def create_lesson(
        db: AsyncSession,
        module_id: int,
        user: User,
        payload: LessonCreate,
    ) -> Lesson:
        """Create a lesson in a module (course owner or admin only)"""
        result = await db.execute(select(Module).where(Module.id == module_id))
        module = result.scalar_one_or_none()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # Check authorization
        course = await CourseService.get_course_by_id(db, module.course_id)
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only add lessons to modules in your own courses",
            )

        lesson = Lesson(
            module_id=module_id,
            title=payload.title,
            description=payload.description,
            video_url=payload.video_url,
            order=payload.order,
            duration_seconds=payload.duration_seconds,
        )
        db.add(lesson)
        await db.commit()
        await db.refresh(lesson)
        return lesson

    @staticmethod
    async def update_lesson(
        db: AsyncSession,
        lesson_id: int,
        user: User,
        payload: LessonUpdate,
    ) -> Lesson:
        """Update a lesson (course owner or admin only)"""
        result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = result.scalar_one_or_none()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found",
            )

        # Check authorization
        module_result = await db.execute(select(Module).where(Module.id == lesson.module_id))
        module = module_result.scalar_one_or_none()
        course = await CourseService.get_course_by_id(db, module.course_id)
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update lessons in your own courses",
            )

        if payload.title is not None:
            lesson.title = payload.title
        if payload.description is not None:
            lesson.description = payload.description
        if payload.video_url is not None:
            lesson.video_url = payload.video_url
        if payload.order is not None:
            lesson.order = payload.order
        if payload.duration_seconds is not None:
            lesson.duration_seconds = payload.duration_seconds

        db.add(lesson)
        await db.commit()
        await db.refresh(lesson)
        return lesson

    @staticmethod
    async def delete_lesson(
        db: AsyncSession,
        lesson_id: int,
        user: User,
    ) -> None:
        """Delete a lesson (course owner or admin only)"""
        result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
        lesson = result.scalar_one_or_none()
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson not found",
            )

        # Check authorization
        module_result = await db.execute(select(Module).where(Module.id == lesson.module_id))
        module = module_result.scalar_one_or_none()
        course = await CourseService.get_course_by_id(db, module.course_id)
        if user.role not in [RoleEnum.ADMIN] and course.instructor_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete lessons from your own courses",
            )

        await db.delete(lesson)
        await db.commit()
