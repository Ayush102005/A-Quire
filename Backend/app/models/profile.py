from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class LanguageEnum(str, enum.Enum):
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    CHINESE = "zh"
    JAPANESE = "ja"
    HINDI = "hi"
    HINGLISH = "hinglish"


class ReminderFrequencyEnum(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    NONE = "none"


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Preferences
    language = Column(Enum(LanguageEnum), default=LanguageEnum.ENGLISH, nullable=False)
    timezone = Column(String(50), default="UTC", nullable=False)
    
    # Goals and interests
    goals = Column(Text, nullable=True)  # JSON-like text or comma-separated
    interests = Column(Text, nullable=True)  # JSON-like text or comma-separated
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True, nullable=False)
    reminder_frequency = Column(Enum(ReminderFrequencyEnum), default=ReminderFrequencyEnum.WEEKLY, nullable=False)
    
    # Metadata
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Profile id={self.id} user_id={self.user_id}>"
