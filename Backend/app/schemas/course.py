from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


# ── Lesson ─────────────────────────────────────────────────────────────────────

class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    order: int = 0
    duration_seconds: int = 0

    model_config = {"str_strip_whitespace": True}


class LessonCreate(LessonBase):
    module_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or len(v) > 255:
            raise ValueError("Title must be between 1 and 255 characters")
        return v


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    order: Optional[int] = None
    duration_seconds: Optional[int] = None

    model_config = {"str_strip_whitespace": True}


class LessonResponse(LessonBase):
    id: int
    module_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Module ─────────────────────────────────────────────────────────────────────

class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0

    model_config = {"str_strip_whitespace": True}


class ModuleCreate(ModuleBase):
    course_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or len(v) > 255:
            raise ValueError("Title must be between 1 and 255 characters")
        return v


class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

    model_config = {"str_strip_whitespace": True}


class ModuleResponse(ModuleBase):
    id: int
    course_id: int
    lessons: list[LessonResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Course ─────────────────────────────────────────────────────────────────────

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None

    model_config = {"str_strip_whitespace": True}


class CourseCreate(CourseBase):
    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or len(v) > 255:
            raise ValueError("Title must be between 1 and 255 characters")
        return v


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    model_config = {"str_strip_whitespace": True}


class PublishToggleRequest(BaseModel):
    is_published: bool


# ── Course Response ────────────────────────────────────────────────────────────

class CourseResponse(CourseBase):
    id: int
    instructor_id: int
    is_published: bool
    modules: list[ModuleResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseDetailResponse(CourseResponse):
    """Detailed course response with all nested data"""
    pass


class CourseListResponse(BaseModel):
    """Lightweight course list response"""
    id: int
    title: str
    description: Optional[str] = None
    instructor_id: int
    is_published: bool
    created_at: datetime

    model_config = {"from_attributes": True}

