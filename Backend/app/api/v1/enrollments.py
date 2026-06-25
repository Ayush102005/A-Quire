from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.course import Course, student_courses
from app.models.user import User
from app.schemas.course import CourseDetailResponse, CourseListResponse

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


@router.post(
    "/{course_id}",
    status_code=status.HTTP_201_CREATED,
    summary="Enroll in a course",
)
async def enroll_in_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Enroll the authenticated student in a published course.

    - Instructors and admins cannot enroll.
    - Re-enrollment returns 200 without error.
    """
    if current_user.role.value not in ("student",):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can enroll in courses",
        )

    # Verify course exists and is published
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.students))
        .where(Course.id == course_id, Course.is_published == True)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or not published",
        )

    # Check if already enrolled
    if any(s.id == current_user.id for s in course.students):
        return {"detail": "Already enrolled", "course_id": course_id}

    course.students.append(current_user)
    await db.commit()

    return {"detail": "Enrolled successfully", "course_id": course_id}


@router.delete(
    "/{course_id}",
    status_code=status.HTTP_200_OK,
    summary="Unenroll from a course",
)
async def unenroll_from_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Unenroll the authenticated student from a course."""
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.students))
        .where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if not any(s.id == current_user.id for s in course.students):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not enrolled in this course")

    course.students.remove(current_user)
    await db.commit()

    return {"detail": "Unenrolled successfully", "course_id": course_id}


@router.get(
    "/",
    response_model=list[CourseListResponse],
    summary="List enrolled courses",
)
async def list_enrolled_courses(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CourseListResponse]:
    """List all courses the authenticated user is enrolled in."""
    result = await db.execute(
        select(Course)
        .join(student_courses, student_courses.c.course_id == Course.id)
        .where(student_courses.c.student_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    courses = result.scalars().all()
    return [CourseListResponse.model_validate(c) for c in courses]
