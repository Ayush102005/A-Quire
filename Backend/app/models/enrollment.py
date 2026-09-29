"""
app/models/enrollment.py
─────────────────────────
Tracks which users are enrolled in which courses.
One row per (user, course) pair.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.student import User


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ───────────────────────────────────────────────────────
    user: Mapped[User] = relationship("User", back_populates="enrollments", lazy="select")
    course: Mapped[Course] = relationship("Course", back_populates="enrollments", lazy="select")

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_enrollment_user_course"),
        Index("ix_enrollment_user_course", "user_id", "course_id"),
    )

    def __repr__(self) -> str:
        return f"<Enrollment id={self.id} user_id={self.user_id} course_id={self.course_id}>"
