"""
app/models/student_note.py
────────────────────────────
A student's own personal notes for a lesson. One row per (user, lesson)
pair — distinct from Lesson.notes_content, which is the instructor-authored
reading material shown to every student.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

if TYPE_CHECKING:
    pass


class StudentNote(Base):
    __tablename__ = "student_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    lesson_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    content: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_student_notes_user_lesson"),
    )

    def __repr__(self) -> str:
        return f"<StudentNote id={self.id} user={self.user_id} lesson={self.lesson_id}>"
