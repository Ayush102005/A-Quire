"""app/schemas/progress.py — Lesson-level progress schemas matching frontend payload."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProgressUpsert(BaseModel):
    """Body for POST /progress/{lesson_id} — matches api.js progress.update()."""
    watched_seconds: int = Field(..., ge=0)
    completion_percent: float = Field(..., ge=0.0, le=100.0)
    is_completed: bool | None = None


class ProgressResponse(BaseModel):
    id: int
    user_id: int
    lesson_id: int
    watched_seconds: int
    completion_percent: float
    is_completed: bool
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ContinueLearningItem(BaseModel):
    """One item from GET /progress/continue-learning."""
    lesson_id: int
    lesson_title: str
    lesson_type: str
    course_id: int
    course_title: str
    completion_percent: float
    watched_seconds: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
