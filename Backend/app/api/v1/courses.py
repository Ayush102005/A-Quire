from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseDetailResponse,
    CourseListResponse,
    CourseResponse,
    CourseUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    ModuleCreate,
    ModuleResponse,
    ModuleUpdate,
    PublishToggleRequest,
)
from app.services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["courses"])


# ── Course Endpoints ──────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
)
async def create_course(
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    """
    Create a new course (instructor/admin only).
    
    - **title**: Course title (required)
    - **description**: Course description (optional)
    """
    course = await CourseService.create_course(db, current_user, payload)
    return CourseResponse.model_validate(course)


@router.get(
    "",
    response_model=list[CourseListResponse],
    summary="List published courses",
)
async def list_courses(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
) -> list[CourseListResponse]:
    """
    List all published courses for students.
    
    - **skip**: Number of courses to skip (default: 0)
    - **limit**: Maximum number of courses to return (default: 20)
    """
    courses = await CourseService.list_published_courses(db, skip=skip, limit=limit)
    return [CourseListResponse.model_validate(c) for c in courses]


@router.get(
    "/my-courses",
    response_model=list[CourseResponse],
    summary="List my courses",
)
async def list_my_courses(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CourseResponse]:
    """
    List courses created by the current instructor.
    
    - **skip**: Number of courses to skip (default: 0)
    - **limit**: Maximum number of courses to return (default: 20)
    """
    courses = await CourseService.list_my_courses(db, current_user, skip=skip, limit=limit)
    return [CourseResponse.model_validate(c) for c in courses]


@router.get(
    "/{course_id}",
    response_model=CourseDetailResponse,
    summary="Get course detail",
)
async def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseDetailResponse:
    """
    Get course details with all modules and lessons.
    
    Access rules:
    - Published courses: visible to all authenticated users
    - Unpublished courses: visible to instructor/admin only
    """
    course = await CourseService.get_course_by_id(db, course_id)
    if not course:
        from app.utils.exceptions import NotFoundException
        raise NotFoundException("Course not found")
    
    # Access control
    if not course.is_published:
        from fastapi import HTTPException
        if current_user.role.value != "admin" and course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own unpublished courses",
            )
    
    return CourseDetailResponse.model_validate(course)


@router.put(
    "/{course_id}",
    response_model=CourseResponse,
    summary="Update course",
)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    """
    Update course details (instructor owner or admin only).
    
    - **title**: New course title (optional)
    - **description**: New course description (optional)
    """
    course = await CourseService.update_course(db, course_id, current_user, payload)
    return CourseResponse.model_validate(course)


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete course",
)
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a course (instructor owner or admin only).
    """
    await CourseService.delete_course(db, course_id, current_user)


@router.post(
    "/{course_id}/publish",
    response_model=CourseResponse,
    summary="Publish course",
)
async def publish_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    """
    Publish a course (instructor owner or admin only).
    Published courses are visible to all students.
    """
    course = await CourseService.publish_course(db, course_id, current_user)
    return CourseResponse.model_validate(course)


@router.post(
    "/{course_id}/unpublish",
    response_model=CourseResponse,
    summary="Unpublish course",
)
async def unpublish_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    """
    Unpublish a course (instructor owner or admin only).
    Unpublished courses are only visible to the instructor.
    """
    course = await CourseService.unpublish_course(db, course_id, current_user)
    return CourseResponse.model_validate(course)


# ── Module Endpoints ──────────────────────────────────────────────────────────

@router.post(
    "/{course_id}/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a module",
)
async def create_module(
    course_id: int,
    payload: ModuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModuleResponse:
    """
    Create a module in a course (instructor owner or admin only).
    
    - **title**: Module title (required)
    - **description**: Module description (optional)
    - **order**: Module order/sequence (default: 0)
    """
    module = await CourseService.create_module(db, course_id, current_user, payload)
    return ModuleResponse.model_validate(module)


@router.put(
    "/modules/{module_id}",
    response_model=ModuleResponse,
    summary="Update a module",
)
async def update_module(
    module_id: int,
    payload: ModuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ModuleResponse:
    """
    Update a module (course owner or admin only).
    """
    module = await CourseService.update_module(db, module_id, current_user, payload)
    return ModuleResponse.model_validate(module)


@router.delete(
    "/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a module",
)
async def delete_module(
    module_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a module (course owner or admin only).
    """
    await CourseService.delete_module(db, module_id, current_user)


# ── Lesson Endpoints ──────────────────────────────────────────────────────────

@router.post(
    "/modules/{module_id}/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lesson",
)
async def create_lesson(
    module_id: int,
    payload: LessonCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonResponse:
    """
    Create a lesson in a module (course owner or admin only).
    
    - **title**: Lesson title (required)
    - **description**: Lesson description (optional)
    - **video_url**: Video URL (optional)
    - **order**: Lesson order/sequence (default: 0)
    - **duration_seconds**: Video duration in seconds (default: 0)
    """
    lesson = await CourseService.create_lesson(db, module_id, current_user, payload)
    return LessonResponse.model_validate(lesson)


@router.put(
    "/lessons/{lesson_id}",
    response_model=LessonResponse,
    summary="Update a lesson",
)
async def update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonResponse:
    """
    Update a lesson (course owner or admin only).
    """
    lesson = await CourseService.update_lesson(db, lesson_id, current_user, payload)
    return LessonResponse.model_validate(lesson)


@router.delete(
    "/lessons/{lesson_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a lesson",
)
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a lesson (course owner or admin only).
    """
    await CourseService.delete_lesson(db, lesson_id, current_user)
