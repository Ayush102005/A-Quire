"""
app/models/course.py
─────────────────────
SQLAlchemy 2.0 ORM model for the courses table.
Extended with instructor_id, is_published, and module/enrollment relationships.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.enrollment import Enrollment
    from app.models.module import Module
    from app.models.student import User


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    instructor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    exam_category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Other", server_default="Other"
    )

    is_published: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ───────────────────────────────────────────────────────
    instructor: Mapped[User | None] = relationship(
        "User", back_populates="taught_courses",
        foreign_keys=[instructor_id], lazy="select",
    )

    modules: Mapped[list[Module]] = relationship(
        "Module", back_populates="course",
        cascade="all, delete-orphan",
        order_by="Module.order",
        lazy="select",
    )

    enrollments: Mapped[list[Enrollment]] = relationship(
        "Enrollment", back_populates="course",
        cascade="all, delete-orphan", lazy="select",
    )

    struggle_events: Mapped[list["StruggleEvent"]] = relationship(
        "StruggleEvent",
        back_populates="course",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Course id={self.id} title={self.title!r} published={self.is_published}>"

    @property
    def instructor_name(self) -> str | None:
        return self.instructor.full_name if self.instructor else None
