"""
app/models/struggle_event.py
─────────────────────────────
Records a student struggle detection event during a lesson.
Privacy-first: no raw video — only derived metrics.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.lesson import Lesson
    from app.models.mentor_intervention import MentorIntervention
    from app.models.student import User


class StruggleEvent(Base):
    __tablename__ = "struggle_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    course_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )

    # Exactly one of lesson_id / problem_id is set — see the check constraint
    # below. lesson_id covers video-lesson struggle events; problem_id covers
    # DSA problem struggle events (problems aren't a DB table yet — see
    # app/services/problem_bank.py — so this is a plain string slug, not a FK).
    lesson_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )

    problem_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True,
    )

    event_type: Mapped[str] = mapped_column(String(64), nullable=False, default="general_confusion")
    severity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="new")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Idempotency key sent by the client (prevents duplicate events on retry)
    client_event_id: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False, index=True,
    )

    # Derived struggle metrics (no raw video stored — privacy-first)
    struggle_score: Mapped[float] = mapped_column(Float, nullable=False)
    lesson_timestamp_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    fixation_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    inactivity_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gaze_off_screen_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0,
        comment="Cumulative ms gaze was off-screen (derived in-browser, no raw video stored)")
    transcript_window_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Context: which surface the struggle occurred on
    context_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="video", server_default="video",
        comment="video | dsa | jee | neet",
    )

    # AI Mentor hint — populated after /hint is called
    hint_text: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ───────────────────────────────────────────────────────
    user: Mapped[User] = relationship("User", back_populates="struggle_events", lazy="select")
    course: Mapped["Course | None"] = relationship("Course", back_populates="struggle_events", lazy="select")
    lesson: Mapped["Lesson | None"] = relationship("Lesson", back_populates="struggle_events", lazy="select")
    mentor_interventions: Mapped[list["MentorIntervention"]] = relationship(
        "MentorIntervention",
        back_populates="struggle_event",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        Index("ix_struggle_student_lesson", "user_id", "lesson_id"),
        Index("ix_struggle_student_problem", "user_id", "problem_id"),
        CheckConstraint(
            "(lesson_id IS NOT NULL) != (problem_id IS NOT NULL)",
            name="ck_struggle_event_exactly_one_target",
        ),
    )

    def __repr__(self) -> str:
        return f"<StruggleEvent id={self.id} user={self.user_id} score={self.struggle_score}>"

    @property
    def student_id(self) -> int:
        return self.user_id

    @property
    def detected_at(self) -> datetime:
        return self.created_at
