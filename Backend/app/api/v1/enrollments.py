"""
app/api/v1/enrollments.py
──────────────────────────
Course enrollment management.

POST   /enrollments/{course_id}  — enroll in a course
DELETE /enrollments/{course_id}  — unenroll from a course
GET    /enrollments/             — list enrolled courses
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_student_user
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.student import User
from app.schemas.course import CourseListItem

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.get("/", response_model=list[CourseListItem], summary="List enrolled courses")
async def list_enrolled(
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    # CourseListItem.instructor_name reads Course.instructor (a lazy="select"
    # relationship) during Pydantic serialization, outside any awaited DB
    # call — without eager-loading it here that raises MissingGreenlet
    # ("greenlet_spawn has not been called"), turning every request into a
    # 500 for any user with at least one enrollment. list_courses() in
    # courses.py already eager-loads this correctly; this endpoint just
    # never did.
    result = await db.execute(
        select(Course)
        .options(selectinload(Course.instructor))
        .join(Enrollment, Enrollment.course_id == Course.id)
        .where(Enrollment.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/{course_id}", status_code=status.HTTP_201_CREATED, summary="Enroll in a course")
async def enroll(
    course_id: int,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Verify course exists and is published
    course: Course | None = await db.get(Course, course_id)
    if not course or not course.is_published:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found or not published.")

    # Check not already enrolled
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Already enrolled in this course.")

    enrollment = Enrollment(user_id=current_user.id, course_id=course_id)
    db.add(enrollment)
    await db.flush()
    return {"message": f"Successfully enrolled in course {course_id}."}


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None, summary="Unenroll from a course")
async def unenroll(
    course_id: int,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Not enrolled in this course.")
    await db.delete(enrollment)
    # Explicit flush for consistency with every other mutating endpoint in
    # this file (enroll() etc.) — without it this delete only reaches the DB
    # whenever something else happens to flush/commit the session (in
    # production, get_db()'s commit-on-success wrapper does so after the
    # request returns, so this was masked there; a caller sharing one
    # session across multiple requests, e.g. this file's own test suite,
    # would see the "deleted" enrollment as still present until then).
    await db.flush()
