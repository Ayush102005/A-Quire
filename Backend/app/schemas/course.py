"""app/schemas/course.py — Schemas for courses, modules, and lessons."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ── Lesson schemas ─────────────────────────────────────────────────────────

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, strip_whitespace=True)
    video_url: str | None = Field(None, max_length=2000, strip_whitespace=True)
    description: str | None = Field(None, max_length=2000, strip_whitespace=True)
    order: int = Field(default=1, ge=1)
    duration_seconds: int = Field(default=0, ge=0)
    # Must match Lesson.lesson_type's actual documented/used values (see
    # app/models/lesson.py) — this pattern previously allowed
    # video/reading/interactive, none of which "interactive" or "reading"
    # anything in the app ever sends, while "dsa" (which the instructor
    # dashboard's DSA-lesson form actually sends — see LessonList in
    # InstructorDashboard.jsx) was rejected outright, breaking every DSA
    # lesson creation with a 422.
    lesson_type: str = Field(default="video", pattern="^(video|dsa|jee|neet)$")
    problem_id: str | None = Field(None, max_length=50, strip_whitespace=True)
    category: str | None = Field(None, max_length=50, strip_whitespace=True)
    difficulty: str | None = Field(None, pattern="^(Easy|Medium|Hard)$")
    topic: str | None = Field(None, max_length=50, strip_whitespace=True)
    problem_statement: str | None = Field(None, strip_whitespace=True)
    examples: str | None = Field(None, strip_whitespace=True)
    constraints: str | None = Field(None, strip_whitespace=True)
    approaches: str | None = Field(None, strip_whitespace=True)
    code_solutions: str | None = Field(None, strip_whitespace=True)
    complexity_time: str | None = Field(None, max_length=50, strip_whitespace=True)
    complexity_space: str | None = Field(None, max_length=50, strip_whitespace=True)
    external_links: str | None = Field(None, strip_whitespace=True)
    transcript: list[dict] | None = None
    notes_content: str | None = Field(None, strip_whitespace=True)


class LessonUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255, strip_whitespace=True)
    video_url: str | None = Field(None, max_length=2000, strip_whitespace=True)
    description: str | None = Field(None, max_length=2000, strip_whitespace=True)
    order: int | None = Field(None, ge=1)
    duration_seconds: int | None = Field(None, ge=0)
    lesson_type: str | None = Field(None, pattern="^(video|dsa|jee|neet)$")
    problem_id: str | None = Field(None, max_length=50, strip_whitespace=True)
    category: str | None = Field(None, max_length=50, strip_whitespace=True)
    difficulty: str | None = Field(None, pattern="^(Easy|Medium|Hard)$")
    topic: str | None = Field(None, max_length=50, strip_whitespace=True)
    problem_statement: str | None = Field(None, strip_whitespace=True)
    examples: str | None = Field(None, strip_whitespace=True)
    constraints: str | None = Field(None, strip_whitespace=True)
    approaches: str | None = Field(None, strip_whitespace=True)
    code_solutions: str | None = Field(None, strip_whitespace=True)
    complexity_time: str | None = Field(None, max_length=50, strip_whitespace=True)
    complexity_space: str | None = Field(None, max_length=50, strip_whitespace=True)
    external_links: str | None = Field(None, strip_whitespace=True)
    transcript: list[dict] | None = None
    notes_content: str | None = Field(None, strip_whitespace=True)


class LessonResponse(BaseModel):
    id: int
    module_id: int
    title: str
    video_url: str | None
    description: str | None
    order: int
    duration_seconds: int
    lesson_type: str
    problem_id: str | None
    category: str | None = None
    difficulty: str | None = None
    topic: str | None = None
    problem_statement: str | None = None
    examples: str | None = None
    constraints: str | None = None
    approaches: str | None = None
    code_solutions: str | None = None
    complexity_time: str | None = None
    complexity_space: str | None = None
    external_links: str | None = None
    transcript: list[dict] | None = None
    pdf_filename: str | None = None
    notes_content: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ContentLessonResponse(BaseModel):
    id: int
    module_id: int
    title: str
    video_url: str | None
    description: str | None
    order: int
    duration_seconds: int
    lesson_type: str
    problem_id: str | None
    category: str | None = None
    difficulty: str | None = None
    topic: str | None = None
    problem_statement: str | None = None
    examples: str | None = None
    constraints: str | None = None
    approaches: str | None = None
    code_solutions: str | None = None
    complexity_time: str | None = None
    complexity_space: str | None = None
    external_links: str | None = None
    transcript: list[dict] | None = None
    pdf_filename: str | None = None
    notes_content: str | None = None
    module_title: str | None
    course_title: str | None
    # Was missing entirely — LessonPlayer.jsx already reads
    # lessonRef.current?.course_id (falling back to a route param when
    # absent), but this field never actually existed on the response, so
    # that read was always undefined. DsaProblemPage.tsx never had a
    # course_id source at all (its route, /dsa/:id, carries no courseId
    # param), so every struggle-monitor call it made left
    # StruggleEvent.course_id NULL — invisible to every instructor
    # dashboard query that filters by course_id (Recent Activity, Total
    # Struggles, AI Interventions, Resolution Rate, At-Risk Students all
    # do). The lesson-hotspot table was unaffected (it joins through
    # lesson_id/problem_id, not course_id), which is why Two Sum could show
    # up there but never in Recent Activity.
    course_id: int | None = None
    is_owner: bool = False
    model_config = ConfigDict(from_attributes=True)


# ── Module schemas ─────────────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, strip_whitespace=True)
    description: str | None = Field(None, max_length=2000, strip_whitespace=True)
    order: int = Field(default=1, ge=1)


class ModuleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255, strip_whitespace=True)
    description: str | None = Field(None, max_length=2000, strip_whitespace=True)
    order: int | None = Field(None, ge=1)


class ModuleResponse(BaseModel):
    id: int
    course_id: int
    title: str
    description: str | None
    order: int
    lessons: list[LessonResponse] = []
    model_config = ConfigDict(from_attributes=True)


# ── Course schemas ─────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, strip_whitespace=True)
    description: str | None = Field(None, max_length=2000, strip_whitespace=True)
    exam_category: str = Field(default="Other", max_length=50, strip_whitespace=True)
    is_published: bool = Field(default=False)


class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255, strip_whitespace=True)
    description: str | None = Field(None, max_length=2000, strip_whitespace=True)
    exam_category: str | None = Field(None, max_length=50, strip_whitespace=True)


class CourseResponse(BaseModel):
    id: int
    title: str
    description: str | None
    exam_category: str
    is_published: bool
    instructor_id: int | None
    instructor_name: str | None = None
    created_at: datetime
    modules: list[ModuleResponse] = []
    model_config = ConfigDict(from_attributes=True)


class CourseListItem(BaseModel):
    """Lightweight course summary for list endpoints."""
    id: int
    title: str
    description: str | None
    exam_category: str
    is_published: bool
    instructor_id: int | None
    instructor_name: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
