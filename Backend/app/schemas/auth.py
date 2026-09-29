"""app/schemas/auth.py — Request/response models for all /auth/* endpoints."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ── Requests ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100, strip_whitespace=True)
    # "admin" is deliberately excluded here: several endpoints (e.g.
    # _require_course_owner in courses.py, verify_course_access in
    # instructor_analytics.py) treat role == "admin" as a blanket bypass of
    # per-course ownership checks. Granting that role must go through a
    # separate, non-self-service flow — never directly from public signup.
    role: str = Field(default="student", pattern="^(student|instructor)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)


class FirebaseLoginRequest(BaseModel):
    id_token: str = Field(..., strip_whitespace=True)
    metadata: dict = Field(default_factory=dict)


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


# ── Responses ──────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    onboarding_complete: bool
    email_verified: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

    @field_validator("full_name", mode="before")
    @classmethod
    def sanitise_name(cls, v: str) -> str:
        """If full_name was accidentally stored as an email address, return a
        human-readable version derived from the local part instead."""
        if v and "@" in v:
            local = v.split("@")[0]
            return local.replace(".", " ").replace("_", " ").replace("-", " ").title()
        return v
