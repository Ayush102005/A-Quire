from __future__ import annotations

from pydantic import BaseModel, EmailStr, field_validator


# ── Request schemas ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = {"str_strip_whitespace": True}


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    model_config = {"str_strip_whitespace": True}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ── Response schemas ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str
