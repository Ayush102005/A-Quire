"""
app/api/v1/content.py
──────────────────────
Student-facing content delivery (read-only lesson access).

GET /content/lessons/{lesson_id}          — fetch lesson detail for the player
GET /content/lessons/{lesson_id}/pdf      — stream the lesson's study material PDF
GET /content/lessons/{lesson_id}/my-note  — get the caller's personal notes for a lesson
PUT /content/lessons/{lesson_id}/my-note  — save the caller's personal notes for a lesson
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.student import User
from app.models.student_note import StudentNote
from app.schemas.course import ContentLessonResponse
from app.schemas.student_note import StudentNoteResponse, StudentNoteUpdate

router = APIRouter(prefix="/content", tags=["Content"])


async def _load_lesson_for_access_check(db: AsyncSession, lesson_id: int) -> Lesson:
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.module).selectinload(Module.course))
        .where(Lesson.id == lesson_id)
    )
    lesson: Lesson | None = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    return lesson


def _is_owner_or_admin(lesson: Lesson, current_user: User) -> bool:
    course = lesson.module.course if lesson.module else None
    return current_user.role == "admin" or (
        current_user.role == "instructor" and course is not None and course.instructor_id == current_user.id
    )


async def _check_lesson_access(db: AsyncSession, lesson: Lesson, current_user: User) -> bool:
    """Raises 403 if current_user may not view this lesson. Returns whether
    they're the owning instructor/admin (vs. an enrolled student), so
    callers can expose that to the frontend without a second lookup."""
    is_owner_or_admin = _is_owner_or_admin(lesson, current_user)
    if is_owner_or_admin:
        return True

    course = lesson.module.course if lesson.module else None
    enrollment = None
    if course is not None:
        enrollment = (
            await db.execute(
                select(Enrollment).where(
                    Enrollment.user_id == current_user.id,
                    Enrollment.course_id == course.id,
                )
            )
        ).scalar_one_or_none()
    if enrollment is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to view this lesson.",
        )
    return False


@router.get("/lessons/{lesson_id}", response_model=ContentLessonResponse,
            summary="Get lesson for the player")
async def get_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    """Return full lesson data for the LessonPlayer component."""
    lesson = await _load_lesson_for_access_check(db, lesson_id)
    is_owner = await _check_lesson_access(db, lesson, current_user)

    # Convert ORM object to dictionary so we don't drop fields like transcript or DSA properties
    lesson_dict = {c.name: getattr(lesson, c.name) for c in lesson.__table__.columns}
    lesson_dict["module_title"] = lesson.module.title if lesson.module else None
    lesson_dict["course_title"] = lesson.module.course.title if lesson.module and lesson.module.course else None
    lesson_dict["course_id"] = lesson.module.course.id if lesson.module and lesson.module.course else None
    lesson_dict["is_owner"] = is_owner

    return lesson_dict


@router.get("/lessons/{lesson_id}/pdf", summary="Download the lesson's study material PDF")
async def get_lesson_pdf(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    lesson = await _load_lesson_for_access_check(db, lesson_id)
    await _check_lesson_access(db, lesson, current_user)

    if not lesson.pdf_path or not Path(lesson.pdf_path).is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="This lesson has no PDF material.")

    return FileResponse(
        lesson.pdf_path,
        media_type="application/pdf",
        filename=lesson.pdf_filename or "material.pdf",
    )


@router.get("/lessons/{lesson_id}/my-note", response_model=StudentNoteResponse,
            summary="Get the caller's personal notes for a lesson")
async def get_my_note(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentNoteResponse:
    lesson = await _load_lesson_for_access_check(db, lesson_id)
    await _check_lesson_access(db, lesson, current_user)

    note = (
        await db.execute(
            select(StudentNote).where(
                StudentNote.user_id == current_user.id,
                StudentNote.lesson_id == lesson_id,
            )
        )
    ).scalar_one_or_none()

    if note is None:
        from datetime import datetime, timezone
        return StudentNoteResponse(lesson_id=lesson_id, content="", updated_at=datetime.now(timezone.utc))
    return note


@router.put("/lessons/{lesson_id}/my-note", response_model=StudentNoteResponse,
            summary="Save the caller's personal notes for a lesson")
async def update_my_note(
    lesson_id: int,
    body: StudentNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentNote:
    lesson = await _load_lesson_for_access_check(db, lesson_id)
    await _check_lesson_access(db, lesson, current_user)

    note = (
        await db.execute(
            select(StudentNote).where(
                StudentNote.user_id == current_user.id,
                StudentNote.lesson_id == lesson_id,
            )
        )
    ).scalar_one_or_none()

    if note is None:
        note = StudentNote(user_id=current_user.id, lesson_id=lesson_id, content=body.content)
        db.add(note)
    else:
        note.content = body.content

    await db.flush()
    return note
