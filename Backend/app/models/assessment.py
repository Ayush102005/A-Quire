"""
app/models/assessment.py
────────────────────────
Models for the Adaptive Engine (AMATTA).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.student import User
    from app.models.course import Course
    from app.models.lesson import Lesson


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    questions: Mapped[list[Question]] = relationship("Question", back_populates="topic", cascade="all, delete-orphan")
    learner_abilities: Mapped[list[LearnerAbility]] = relationship("LearnerAbility", back_populates="topic", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Topic id={self.id} name={self.name!r}>"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    
    content: Mapped[str] = mapped_column(Text, nullable=False, comment="Question text or JSON payload")
    options: Mapped[dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False, comment="JSON mapping option keys to values (e.g., {'A': 'Option 1', ...})")
    correct_option: Mapped[str] = mapped_column(String(10), nullable=False, comment="Key of the correct option (e.g., 'A')")
    
    # IRT Parameters — nullable because they can legitimately be unset/invalid
    # (e.g. an AI-generation pipeline that produced a question without a
    # calibrated difficulty yet, or a NaN/Inf from a bad estimate). Callers
    # must not assume these are always usable numbers — see
    # AdaptiveEngine.has_valid_irt_params(), which excludes such questions
    # from selection rather than crashing on them.
    #
    # Deliberately no `default=` here: SQLAlchemy applies a Python-side
    # column default whenever the attribute is None at flush time — including
    # when None was explicitly assigned, not just left unset — which would
    # silently turn an intentional "no calibrated value yet" back into a
    # (wrong) real number. Both real call sites (questions.py, generator_service.py)
    # always pass all three explicitly, so no code depends on a default here.
    difficulty_b: Mapped[float | None] = mapped_column(Float, nullable=True, comment="IRT difficulty parameter")
    discrimination_a: Mapped[float | None] = mapped_column(Float, nullable=True, comment="IRT discrimination parameter")
    guessing_c: Mapped[float | None] = mapped_column(Float, nullable=True, comment="IRT guessing parameter")
    
    # Quality and Usage Tracking (Phase 4)
    response_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Number of times answered")
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Number of correct answers")
    skip_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Number of times skipped/timed out")
    avg_response_time_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Average time to answer")
    is_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="Flagged for suspicious statistics")
    is_provisional: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, comment="LLM-produced b is a seed, not empirically validated")

    # Relationships
    topic: Mapped[Topic] = relationship("Topic", back_populates="questions")

    def __repr__(self) -> str:
        return f"<Question id={self.id} topic_id={self.topic_id} difficulty_b={self.difficulty_b}>"


class LearnerAbility(Base):
    __tablename__ = "learner_abilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    
    theta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, comment="Current ability estimate (theta)")
    standard_error: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Uncertainty estimate")
    response_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="Number of reliable responses submitted")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped[User] = relationship("User")
    topic: Mapped[Topic] = relationship("Topic", back_populates="learner_abilities")

    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uix_user_topic_ability"),
    )

    def __repr__(self) -> str:
        return f"<LearnerAbility user_id={self.user_id} topic_id={self.topic_id} theta={self.theta}>"


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    # Nullable: the AMATTA Topic/Question system has no inherent link to the
    # Course/Enrollment system — this records which course (if any) the quiz
    # was launched from, so instructor analytics can scope by it directly
    # instead of the old (buggy) "any enrolled student's activity on any
    # topic" join. Sessions created before this field existed, or started
    # outside a course context (e.g. standalone practice), are NULL and are
    # correctly excluded from any course-scoped analytics view.
    course_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Lesson (video) this quiz was launched from, if any — lets AI question
    # generation ground new questions in the lesson's transcript instead of
    # only the topic name. NULL for sessions started outside a lesson
    # context (e.g. standalone topic practice via SelfCheck).
    lesson_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    module_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True, index=True
    )

    current_theta: Mapped[float] = mapped_column(Float, nullable=False, comment="Theta at start or current snapshot")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped[User] = relationship("User")
    topic: Mapped[Topic] = relationship("Topic")
    course: Mapped["Course | None"] = relationship("Course")
    lesson: Mapped["Lesson | None"] = relationship("Lesson")
    responses: Mapped[list[QuizResponse]] = relationship("QuizResponse", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<QuizSession id={self.id} user_id={self.user_id} is_active={self.is_active}>"


class QuizResponse(Base):
    __tablename__ = "quiz_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    selected_option: Mapped[str | None] = mapped_column(String(10), nullable=True)
    confidence: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Student self-reported confidence (1-4)")
    difficulty: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Difficulty level at time of response (easy, medium, hard)")
    
    error_type: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="Concept, Procedural, Slip, etc.")
    student_explanation: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Student's reason for choosing this option")
    feedback_provided: Mapped[str | None] = mapped_column(Text, nullable=True, comment="AI generated targeted feedback")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    session: Mapped[QuizSession] = relationship("QuizSession", back_populates="responses")
    question: Mapped[Question] = relationship("Question")

    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uix_session_question"),
    )

    def __repr__(self) -> str:
        return f"<QuizResponse session_id={self.session_id} question_id={self.question_id} is_correct={self.is_correct}>"
