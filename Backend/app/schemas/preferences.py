"""app/schemas/preferences.py — Schemas for User Preferences."""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class NotificationPreferences(BaseModel):
    in_app_enabled: bool = True
    email_enabled: bool = False
    student_help_requests: bool = True
    high_risk_alerts: bool = True
    enrollment_requests: bool = True
    assessment_updates: bool = True
    ai_question_review: bool = True
    weekly_summary: bool = True

    model_config = ConfigDict(extra="forbid")


class TeachingPreferences(BaseModel):
    default_subject: str = Field(default="", max_length=100)
    default_exam_type: str = Field(default="DSA / Programming", max_length=50)
    default_course_visibility: str = Field(default="draft", pattern="^(draft|published)$")
    default_assessment_difficulty: str = Field(default="adaptive", pattern="^(easy|medium|hard|adaptive)$")
    default_transcript_language: str = Field(default="en", max_length=10)
    adaptive_learning_enabled: bool = True
    ai_hints_enabled: bool = True
    ai_question_generation_enabled: bool = True
    ai_question_review_required: bool = True

    model_config = ConfigDict(extra="forbid")


class PrivacyPreferences(BaseModel):
    aggregated_attention_insights_enabled: bool = True
    individual_attention_with_consent_enabled: bool = False

    model_config = ConfigDict(extra="forbid")


class ProfileExtras(BaseModel):
    institution: str = Field(default="", max_length=200)
    department: str = Field(default="", max_length=200)
    primary_subject: str = Field(default="", max_length=200)
    bio: str = Field(default="", max_length=1000)
    timezone: str = Field(default="Asia/Kolkata", max_length=64)

    model_config = ConfigDict(extra="forbid")


class UserPreferencesUpdate(BaseModel):
    notification_preferences: Optional[NotificationPreferences] = None
    teaching_preferences: Optional[TeachingPreferences] = None
    privacy_preferences: Optional[PrivacyPreferences] = None
    profile_extras: Optional[ProfileExtras] = None

    model_config = ConfigDict(extra="forbid")


class UserPreferencesResponse(BaseModel):
    version: int = 1
    notification_preferences: NotificationPreferences
    teaching_preferences: TeachingPreferences
    privacy_preferences: PrivacyPreferences
    profile_extras: ProfileExtras

    @classmethod
    def from_dict(cls, data: dict | None) -> "UserPreferencesResponse":
        if not data:
            data = {}
        return cls(
            version=1,
            notification_preferences=NotificationPreferences(**data.get("notification_preferences", {})),
            teaching_preferences=TeachingPreferences(**data.get("teaching_preferences", {})),
            privacy_preferences=PrivacyPreferences(**data.get("privacy_preferences", {})),
            profile_extras=ProfileExtras(**data.get("profile_extras", {})),
        )
