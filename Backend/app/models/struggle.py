from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class StruggleEvent(Base):
    __tablename__ = "struggle_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    client_event_id = Column(String, unique=True, index=True, nullable=False)  # For deduplication

    # Derived metrics only (no raw video/images)
    struggle_score = Column(Float, default=0.0)       # 0.0 to 1.0
    lesson_timestamp_ms = Column(Integer, nullable=False)  # Position in video
    fixation_duration_ms = Column(Integer, default=0)
    inactivity_duration_ms = Column(Integer, default=0)
    transcript_window_id = Column(String, nullable=True)   # Reference to transcript window

    # Mentor response
    mentor_hint = Column(String, nullable=True)
    mentor_hint_level = Column(String, default="basic")   # basic, intermediate, advanced, hinglish, analogy
    mentor_generated_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="struggle_events")
    lesson = relationship("Lesson", back_populates="struggle_events")
    mentor_responses = relationship("MentorResponse", back_populates="struggle_event", cascade="all, delete-orphan")


class MentorResponse(Base):
    __tablename__ = "mentor_responses"

    id = Column(Integer, primary_key=True, index=True)
    struggle_event_id = Column(Integer, ForeignKey("struggle_events.id", ondelete="CASCADE"), nullable=False, index=True)
    response_text = Column(String, nullable=False)
    response_type = Column(String, default="hint")     # hint, explanation, analogy, hinglish
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    struggle_event = relationship("StruggleEvent", back_populates="mentor_responses")
