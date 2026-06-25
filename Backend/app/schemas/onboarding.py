from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.user import RoleEnum
from app.models.profile import LanguageEnum, ReminderFrequencyEnum
from app.models.onboarding import OnboardingStepEnum


# ── Preferences ───────────────────────────────────────────────────────────────

class PreferencesData(BaseModel):
    language: LanguageEnum = LanguageEnum.ENGLISH
    timezone: str = "UTC"
    email_notifications: bool = True
    reminder_frequency: ReminderFrequencyEnum = ReminderFrequencyEnum.WEEKLY
    
    model_config = {"str_strip_whitespace": True}


# ── Profile Data ──────────────────────────────────────────────────────────────

class ProfileData(BaseModel):
    goals: Optional[str] = None
    interests: Optional[str] = None
    
    model_config = {"str_strip_whitespace": True}


# ── Role Selection ────────────────────────────────────────────────────────────

class RoleSelectionRequest(BaseModel):
    role: RoleEnum
    
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: RoleEnum) -> RoleEnum:
        if v not in [RoleEnum.STUDENT, RoleEnum.INSTRUCTOR]:
            raise ValueError("Role must be either 'student' or 'instructor'")
        return v
    
    model_config = {"str_strip_whitespace": True}


# ── Save Profile ──────────────────────────────────────────────────────────────

class SaveProfileRequest(BaseModel):
    goals: Optional[str] = None
    interests: Optional[str] = None
    
    model_config = {"str_strip_whitespace": True}


# ── Save Preferences ──────────────────────────────────────────────────────────

class SavePreferencesRequest(BaseModel):
    language: LanguageEnum = LanguageEnum.ENGLISH
    timezone: str = "UTC"
    email_notifications: bool = True
    reminder_frequency: ReminderFrequencyEnum = ReminderFrequencyEnum.WEEKLY
    
    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        if not v or len(v) > 50:
            raise ValueError("Timezone must be between 1 and 50 characters")
        return v
    
    model_config = {"str_strip_whitespace": True}


# ── Finalize Onboarding ───────────────────────────────────────────────────────

class FinalizeOnboardingRequest(BaseModel):
    pass


# ── Onboarding Status Response ────────────────────────────────────────────────

class OnboardingStatus(BaseModel):
    id: int
    user_id: int
    current_step: OnboardingStepEnum
    is_completed: bool
    role_set: bool
    role_completed: bool
    profile_completed: bool
    preferences_completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    updated_at: datetime
    
    model_config = {"from_attributes": True}


# ── Onboarding Summary Response ───────────────────────────────────────────────

class OnboardingSummary(BaseModel):
    status: OnboardingStatus
    profile: Optional[ProfileData] = None
    preferences: Optional[PreferencesData] = None
    
    model_config = {"from_attributes": True}


# ── Success Response ──────────────────────────────────────────────────────────

class OnboardingResponse(BaseModel):
    message: str
    status: OnboardingStatus
    
    model_config = {"from_attributes": True}
