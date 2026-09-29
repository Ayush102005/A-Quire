"""
app/models/student.py
──────────────────────
Unified User model — covers students, instructors, and admins.
Table name: users
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Index, Integer, String, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from app.models.notification import Notification
    from app.models.progress import Progress
    from app.models.struggle_event import StruggleEvent


class User(Base):
    __tablename__ = "users"

    # ── Identity ───────────────────────────────────────────────────────────
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    firebase_uid: Mapped[str | None] = mapped_column(
        String(128), unique=True, nullable=True, index=True,
        comment="Firebase UID — set for Google / phone sign-ins",
    )

    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False, index=True,
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    hashed_password: Mapped[str | None] = mapped_column(
        String(128), nullable=True,
        comment="bcrypt hash — only set for email+password users",
    )

    # ── Role & status ──────────────────────────────────────────────────────
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="student", server_default="student",
        comment="student | instructor | admin",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true",
    )

    email_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )

    # ── Onboarding ─────────────────────────────────────────────────────────
    onboarding_complete: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
    )

    # Optional onboarding fields persisted after /onboarding/save-profile
    goals: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    interests: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # Optional preference fields persisted after /onboarding/save-preferences
    language: Mapped[str | None] = mapped_column(String(10), nullable=True, default="en")
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email_notifications: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true",
    )
    reminder_frequency: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Preferences ────────────────────────────────────────────────────────
    preferences: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict, server_default="{}"
    )

    # ── Timestamps ─────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ───────────────────────────────────────────────────────
    taught_courses: Mapped[list[Course]] = relationship(
        "Course", back_populates="instructor",
        foreign_keys="Course.instructor_id", lazy="select",
    )
    enrollments: Mapped[list[Enrollment]] = relationship(
        "Enrollment", back_populates="user",
        cascade="all, delete-orphan", lazy="select",
    )
    progress_records: Mapped[list[Progress]] = relationship(
        "Progress", back_populates="user",
        cascade="all, delete-orphan", lazy="select",
    )
    struggle_events: Mapped[list[StruggleEvent]] = relationship(
        "StruggleEvent", back_populates="user",
        cascade="all, delete-orphan", lazy="select",
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user",
        cascade="all, delete-orphan", lazy="select",
    )

    __table_args__ = (
        Index("ix_users_email_role", "email", "role"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"
