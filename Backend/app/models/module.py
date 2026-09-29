"""
app/models/module.py
─────────────────────
A Course is split into ordered Modules, each containing Lessons.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.lesson import Lesson


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # ── Relationships ───────────────────────────────────────────────────────
    course: Mapped[Course] = relationship("Course", back_populates="modules", lazy="select")

    lessons: Mapped[list[Lesson]] = relationship(
        "Lesson", back_populates="module",
        cascade="all, delete-orphan",
        order_by="Lesson.order",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Module id={self.id} course_id={self.course_id} order={self.order}>"
