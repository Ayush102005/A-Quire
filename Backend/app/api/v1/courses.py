"""
app/api/v1/courses.py
──────────────────────
Course, module, and lesson management.

Student endpoints:
    GET  /courses/                       — list published courses
    GET  /courses/{id}                   — course detail with modules+lessons

Instructor endpoints (role=instructor):
    GET  /courses/my-courses             — instructor's own courses
    POST /courses                        — create course
    PUT  /courses/{id}                   — update course
    DELETE /courses/{id}                 — delete course
    POST /courses/{id}/publish
    POST /courses/{id}/unpublish
    POST /courses/{id}/modules           — create module
    PUT  /courses/modules/{id}           — update module
    DELETE /courses/modules/{id}         — delete module
    POST /courses/modules/{id}/lessons   — create lesson
    PUT  /courses/lessons/{id}           — update lesson
    DELETE /courses/lessons/{id}         — delete lesson
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_instructor_user
from app.core.rate_limit import rate_limit
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.student import User
from app.schemas.course import (
    CourseCreate,
    CourseListItem,
    CourseResponse,
    CourseUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    ModuleCreate,
    ModuleResponse,
    ModuleUpdate,
)
from app.utils.lesson_files import (
    MAX_PDF_SIZE_BYTES,
    delete_lesson_pdf,
    ensure_upload_dir,
    lesson_pdf_path,
    safe_display_filename,
)
from app.utils.youtube import fetch_youtube_transcript


async def _load_module_with_lessons(db: AsyncSession, module_id: int) -> Module:
    """Reload a module with its lessons eagerly so serialisation never triggers lazy loads."""
    result = await db.execute(
        select(Module)
        .options(selectinload(Module.lessons))
        .where(Module.id == module_id)
    )
    return result.scalar_one()


async def _load_module_with_course(db: AsyncSession, module_id: int) -> Module:
    """Load a module together with its parent course, for ownership checks."""
    result = await db.execute(
        select(Module).options(selectinload(Module.course)).where(Module.id == module_id)
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Module not found.")
    return module


async def _load_lesson_with_course(db: AsyncSession, lesson_id: int) -> Lesson:
    """Load a lesson together with its module and parent course, for ownership checks."""
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.module).selectinload(Module.course))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    return lesson

router = APIRouter(prefix="/courses", tags=["Courses"])





def _require_course_owner(course: Course, user: User) -> None:
    if user.role != "admin" and course.instructor_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this course.")


async def _load_course(db: AsyncSession, course_id: int, with_content: bool = False) -> Course:
    if with_content:
        result = await db.execute(
            select(Course)
            .options(
                selectinload(Course.modules).selectinload(Module.lessons),
                selectinload(Course.instructor)
            )
            .where(Course.id == course_id)
        )
    else:
        result = await db.execute(
            select(Course)
            .options(selectinload(Course.instructor))
            .where(Course.id == course_id)
        )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course


# ── Student: list & detail ─────────────────────────────────────────────────

@router.get("/", response_model=list[CourseListItem], summary="List published courses")
async def list_courses(category: str | None = None, db: AsyncSession = Depends(get_db)) -> list[Course]:
    stmt = select(Course).options(selectinload(Course.instructor)).where(Course.is_published == True)
    if category and category.lower() != "all":
        stmt = stmt.where(Course.exam_category == category)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/my-courses", response_model=list[CourseResponse], summary="Instructor's own courses")
async def my_courses(
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
) -> list[Course]:
    result = await db.execute(
        select(Course)
        .options(
            selectinload(Course.modules).selectinload(Module.lessons),
            selectinload(Course.instructor)
        )
        .where(Course.instructor_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{course_id}", response_model=CourseResponse, summary="Course detail with modules")
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
) -> Course:
    return await _load_course(db, course_id, with_content=True)


# ── Instructor: course CRUD ────────────────────────────────────────────────

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED,
             summary="Create a course")
async def create_course(
    body: CourseCreate,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Course:
    course = Course(title=body.title, description=body.description, exam_category=body.exam_category, instructor_id=current_user.id)
    db.add(course)
    await db.flush()
    return await _load_course(db, course.id, with_content=True)


@router.put("/{course_id}", response_model=CourseResponse, summary="Update a course")
async def update_course(
    course_id: int,
    body: CourseUpdate,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Course:
    course = await _load_course(db, course_id, with_content=True)
    _require_course_owner(course, current_user)
    if body.title is not None:
        course.title = body.title
    if body.description is not None:
        course.description = body.description
    if body.exam_category is not None:
        course.exam_category = body.exam_category
    await db.flush()
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None, summary="Delete a course")
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> None:
    course = await _load_course(db, course_id)
    _require_course_owner(course, current_user)
    await db.delete(course)


@router.post("/{course_id}/publish", response_model=CourseResponse, summary="Publish a course")
async def publish_course(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Course:
    course = await _load_course(db, course_id, with_content=True)
    _require_course_owner(course, current_user)
    course.is_published = True
    await db.flush()
    return course


@router.post("/{course_id}/unpublish", response_model=CourseResponse, summary="Unpublish a course")
async def unpublish_course(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Course:
    course = await _load_course(db, course_id, with_content=True)
    _require_course_owner(course, current_user)
    course.is_published = False
    await db.flush()
    return course


# ── Instructor: module CRUD ────────────────────────────────────────────────

@router.post("/{course_id}/modules", response_model=ModuleResponse,
             status_code=status.HTTP_201_CREATED, summary="Add a module to a course")
async def create_module(
    course_id: int,
    body: ModuleCreate,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Module:
    course = await _load_course(db, course_id)
    _require_course_owner(course, current_user)
    module = Module(course_id=course_id, title=body.title, description=body.description, order=body.order)
    db.add(module)
    await db.flush()
    # Reload with lessons so response serialisation never triggers a lazy load
    return await _load_module_with_lessons(db, module.id)


@router.put("/modules/{module_id}", response_model=ModuleResponse, summary="Update a module")
async def update_module(
    module_id: int,
    body: ModuleUpdate,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Module:
    module = await _load_module_with_course(db, module_id)
    _require_course_owner(module.course, current_user)
    if body.title is not None:
        module.title = body.title
    if body.description is not None:
        module.description = body.description
    if body.order is not None:
        module.order = body.order
    await db.flush()
    return await _load_module_with_lessons(db, module.id)


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None,
               summary="Delete a module")
async def delete_module(
    module_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> None:
    module = await _load_module_with_course(db, module_id)
    _require_course_owner(module.course, current_user)
    await db.delete(module)


# ── Instructor: lesson CRUD ────────────────────────────────────────────────

@router.post("/modules/{module_id}/lessons", response_model=LessonResponse,
             status_code=status.HTTP_201_CREATED, summary="Add a lesson to a module")
async def create_lesson(
    module_id: int,
    body: LessonCreate,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Lesson:
    module = await _load_module_with_course(db, module_id)
    _require_course_owner(module.course, current_user)
    lesson = Lesson(
        module_id=module_id, title=body.title, video_url=body.video_url,
        description=body.description, order=body.order, duration_seconds=body.duration_seconds,
        lesson_type=body.lesson_type, problem_id=body.problem_id,
        category=body.category, difficulty=body.difficulty, topic=body.topic,
        problem_statement=body.problem_statement, examples=body.examples,
        constraints=body.constraints, approaches=body.approaches,
        code_solutions=body.code_solutions, complexity_time=body.complexity_time,
        complexity_space=body.complexity_space, external_links=body.external_links
    )
    
    if lesson.video_url:
        transcript = fetch_youtube_transcript(lesson.video_url)
        if transcript:
            lesson.transcript = transcript

    db.add(lesson)
    await db.flush()
    return lesson


@router.put("/lessons/{lesson_id}", response_model=LessonResponse, summary="Update a lesson")
async def update_lesson(
    lesson_id: int,
    body: LessonUpdate,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Lesson:
    lesson = await _load_lesson_with_course(db, lesson_id)
    _require_course_owner(lesson.module.course, current_user)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(lesson, field, value)
        
    if "video_url" in body.model_dump(exclude_none=True) and lesson.video_url:
        transcript = fetch_youtube_transcript(lesson.video_url)
        if transcript:
            lesson.transcript = transcript
            
    await db.flush()
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None,
               summary="Delete a lesson")
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> None:
    lesson = await _load_lesson_with_course(db, lesson_id)
    _require_course_owner(lesson.module.course, current_user)
    await db.delete(lesson)

@router.post("/lessons/{lesson_id}/fetch-transcript", response_model=LessonResponse,
             summary="Fetch actual transcript for a YouTube video lesson")
async def fetch_transcript(
    lesson_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(5, 60),
) -> Lesson:
    lesson = await _load_lesson_with_course(db, lesson_id)
    _require_course_owner(lesson.module.course, current_user)

    if not lesson.video_url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Lesson has no video URL.")
        
    transcript = fetch_youtube_transcript(lesson.video_url)
    if not transcript:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Could not fetch transcript. Make sure the URL is a valid YouTube video with closed captions.")
        
    lesson.transcript = transcript
    await db.flush()
    return lesson


@router.post("/lessons/{lesson_id}/pdf", response_model=LessonResponse,
             summary="Upload (or replace) a lesson's study material PDF")
async def upload_lesson_pdf(
    lesson_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(10, 60),
) -> Lesson:
    lesson = await _load_lesson_with_course(db, lesson_id)
    _require_course_owner(lesson.module.course, current_user)

    content_type_ok = (file.content_type or "").lower() == "application/pdf"
    filename_ok = (file.filename or "").lower().endswith(".pdf")
    if not (content_type_ok or filename_ok):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted.")

    ensure_upload_dir()
    dest = lesson_pdf_path(lesson_id)

    size = 0
    try:
        with open(dest, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_PDF_SIZE_BYTES:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"PDF exceeds the {MAX_PDF_SIZE_BYTES // (1024 * 1024)}MB limit.",
                    )
                out.write(chunk)
    finally:
        await file.close()

    lesson.pdf_path = str(dest)
    lesson.pdf_filename = safe_display_filename(file.filename)
    await db.flush()
    return lesson


@router.delete("/lessons/{lesson_id}/pdf", response_model=LessonResponse,
               summary="Remove a lesson's study material PDF")
async def remove_lesson_pdf(
    lesson_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
) -> Lesson:
    lesson = await _load_lesson_with_course(db, lesson_id)
    _require_course_owner(lesson.module.course, current_user)

    delete_lesson_pdf(lesson_id)
    lesson.pdf_path = None
    lesson.pdf_filename = None
    await db.flush()
    return lesson
