"""app/schemas/onboarding.py — Onboarding step request/response models."""
from __future__ import annotations

from pydantic import BaseModel, Field


class OnboardingStatusResponse(BaseModel):
    onboarding_complete: bool
    role: str


class SetRoleRequest(BaseModel):
    # "admin" excluded: several endpoints treat role == "admin" as a
    # blanket bypass of per-course ownership checks (see
    # _require_course_owner in courses.py, verify_course_access in
    # instructor_analytics.py). It must never be self-grantable by an
    # already-authenticated user through onboarding.
    role: str = Field(..., pattern="^(student|instructor)$")


class SaveProfileRequest(BaseModel):
    goals: str | None = Field(None, max_length=1000, strip_whitespace=True)
    interests: str | None = Field(None, max_length=1000, strip_whitespace=True)


class SavePreferencesRequest(BaseModel):
    language: str | None = Field("en", max_length=10, strip_whitespace=True)
    timezone: str | None = Field(None, max_length=50, strip_whitespace=True)
    email_notifications: bool = True
    reminder_frequency: str | None = Field(None, pattern="^(daily|weekly|never)$")


class OnboardingCompleteResponse(BaseModel):
    message: str
    onboarding_complete: bool
