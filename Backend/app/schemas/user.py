from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models.user import RoleEnum


# ── Base ──────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum = RoleEnum.STUDENT

    model_config = {"str_strip_whitespace": True}


# ── Create (registration) ─────────────────────────────────────────────────────

class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name cannot be blank")
        return v


# ── Update ────────────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_onboarded: Optional[bool] = None

    model_config = {"str_strip_whitespace": True}


# ── Response (never exposes password_hash) ────────────────────────────────────

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_onboarded: bool
    created_at: datetime

    model_config = {
        "from_attributes": True,   # Pydantic v2 replacement for orm_mode
    }
