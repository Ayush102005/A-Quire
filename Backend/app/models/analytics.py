"""
app/models/analytics.py
───────────────────────
Models for storing background analytics and learner state logs.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.student import User
    from app.models.assessment import QuizSession, Topic


class LearnerStateLog(Base):
    __tablename__ = "learner_state_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("quiz_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    topic_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    
    theta: Mapped[float] = mapped_column(Float, nullable=False, comment="User ability at the time of log")
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="E.g., 'answer_submitted', 'session_start'")
    
    metrics: Mapped[dict[str, Any]] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=True, comment="JSON containing various session metrics")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped[User] = relationship("User")
    session: Mapped["QuizSession"] = relationship("QuizSession")
    topic: Mapped["Topic"] = relationship("Topic")

    def __repr__(self) -> str:
        return f"<LearnerStateLog id={self.id} user_id={self.user_id} theta={self.theta}>"
