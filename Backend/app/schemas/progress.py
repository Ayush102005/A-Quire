from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


# ── Progress Update Request ────────────────────────────────────────────────────

class ProgressUpdateRequest(BaseModel):
    watched_seconds: int = 0
    completion_percent: float = 0.0
    is_completed: Optional[bool] = None

    @field_validator("watched_seconds")
    @classmethod
    def validate_watched_seconds(cls, v: int) -> int:
        if v < 0:
            raise ValueError("watched_seconds cannot be negative")
        return v

    @field_validator("completion_percent")
    @classmethod
    def validate_completion_percent(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("completion_percent must be between 0 and 100")
        return v

    model_config = {"str_strip_whitespace": True}


# ── Progress Response ──────────────────────────────────────────────────────────

class ProgressResponse(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    watched_seconds: int
    completion_percent: float
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Lesson Progress Summary ────────────────────────────────────────────────────

class LessonProgressSummary(BaseModel):
    lesson_id: int
    lesson_title: str
    watched_seconds: int
    completion_percent: float
    is_completed: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Module Progress Summary ────────────────────────────────────────────────────

class ModuleProgressSummary(BaseModel):
    module_id: int
    module_title: str
    total_lessons: int
    completed_lessons: int
    average_completion: float
    lessons: list[LessonProgressSummary] = []

    model_config = {"from_attributes": True}


# ── Course Progress Summary ────────────────────────────────────────────────────

class CourseProgressSummary(BaseModel):
    course_id: int
    course_title: str
    total_modules: int
    total_lessons: int
    completed_lessons: int
    average_completion: float
    modules: list[ModuleProgressSummary] = []

    model_config = {"from_attributes": True}


# ── Continue Learning Summary ─────────────────────────────────────────────────

class ContinueLearningItem(BaseModel):
    course_id: int
    course_title: str
    lesson_id: int
    lesson_title: str
    module_title: str
    completion_percent: float
    last_updated: datetime

    model_config = {"from_attributes": True}


class ContinueLearning(BaseModel):
    in_progress: list[ContinueLearningItem] = []
    not_started: list[ContinueLearningItem] = []
    completed: list[ContinueLearningItem] = []

    model_config = {"from_attributes": True}
