from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class OnboardingStepEnum(str, enum.Enum):
    ROLE_SELECTION = "role_selection"
    PROFILE_SETUP = "profile_setup"
    PREFERENCES = "preferences"
    COMPLETED = "completed"


class Onboarding(Base):
    __tablename__ = "onboarding"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Progress tracking
    current_step = Column(Enum(OnboardingStepEnum), default=OnboardingStepEnum.ROLE_SELECTION, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    role_set = Column(Boolean, default=False, nullable=False)  # Track if role has been selected
    
    # Step completion flags
    role_completed = Column(Boolean, default=False, nullable=False)
    profile_completed = Column(Boolean, default=False, nullable=False)
    preferences_completed = Column(Boolean, default=False, nullable=False)
    
    # Data storage for onboarding session
    profile_data = Column(String(1000), nullable=True)  # JSON string
    preferences_data = Column(String(1000), nullable=True)  # JSON string
    
    # Timestamps
    started_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Onboarding id={self.id} user_id={self.user_id} current_step={self.current_step}>"
