"""app/schemas/student_note.py — Schemas for a student's personal lesson notes."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentNoteUpdate(BaseModel):
    content: str = Field(default="", max_length=50_000)


class StudentNoteResponse(BaseModel):
    lesson_id: int
    content: str
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
