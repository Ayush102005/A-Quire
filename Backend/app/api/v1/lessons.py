from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user_id, require_role
from app.models.course import Module, Lesson
from app.schemas.course import (
    ModuleCreate, ModuleResponse,
    LessonCreate, LessonResponse,
)
from app.utils.exceptions import NotFoundException

router = APIRouter()


# ── Modules ────────────────────────────────────────────────────────────────────

@router.post("/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    payload: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_role("admin", "instructor")),
):
    """Create a new module inside a course."""
    module = Module(
        course_id=payload.course_id,
        title=payload.title,
        description=payload.description,
        order=payload.order,
    )
    db.add(module)
    await db.commit()
    
    # Reload with lessons eager loaded to prevent Pydantic serialization errors
    stmt = (
        select(Module)
        .options(selectinload(Module.lessons))
        .where(Module.id == module.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/modules/{module_id}", response_model=ModuleResponse)
async def get_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get module with its lessons."""
    stmt = (
        select(Module)
        .options(selectinload(Module.lessons))
        .where(Module.id == module_id)
    )
    result = await db.execute(stmt)
    module = result.scalar_one_or_none()
    if not module:
        raise NotFoundException("Module not found")
    return module


# ── Lessons ────────────────────────────────────────────────────────────────────

@router.post("/lessons", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    payload: LessonCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_role("admin", "instructor")),
):
    """Create a lesson inside a module."""
    # Verify module exists
    stmt = select(Module).where(Module.id == payload.module_id)
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise NotFoundException("Module not found")

    lesson = Lesson(
        module_id=payload.module_id,
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


@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a lesson by ID."""
    stmt = select(Lesson).where(Lesson.id == lesson_id)
    result = await db.execute(stmt)
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")
    return lesson


@router.put("/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    payload: LessonCreate,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_role("admin", "instructor")),
):
    """Update lesson metadata."""
    stmt = select(Lesson).where(Lesson.id == lesson_id)
    result = await db.execute(stmt)
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    lesson.title = payload.title
    lesson.description = payload.description
    lesson.video_url = payload.video_url
    lesson.order = payload.order
    lesson.duration_seconds = payload.duration_seconds

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_role("admin", "instructor")),
):
    """Delete a lesson."""
    stmt = select(Lesson).where(Lesson.id == lesson_id)
    result = await db.execute(stmt)
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundException("Lesson not found")

    await db.delete(lesson)
    await db.commit()
