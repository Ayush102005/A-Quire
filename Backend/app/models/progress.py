"""
app/models/progress.py
───────────────────────
Lesson-level progress tracking.
One row per (user, lesson) pair.
Frontend fields: watched_seconds, completion_percent, is_completed.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index,
    Integer, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.lesson import Lesson
    from app.models.student import User


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    lesson_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    watched_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
    )

    completion_percent: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0, server_default="0",
        comment="Completion percentage [0.0, 100.0]",
    )

    is_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ───────────────────────────────────────────────────────
    user: Mapped[User] = relationship("User", back_populates="progress_records", lazy="select")
    lesson: Mapped[Lesson] = relationship("Lesson", back_populates="progress_records", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_progress_user_lesson"),
        Index("ix_progress_user_lesson", "user_id", "lesson_id"),
    )

    def __repr__(self) -> str:
        return f"<Progress id={self.id} user={self.user_id} lesson={self.lesson_id} pct={self.completion_percent}>"
