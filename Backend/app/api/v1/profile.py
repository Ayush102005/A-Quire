"""
app/api/v1/profile.py
──────────────────────
Protected profile endpoints.

GET  /profile/me             — get current user profile
PUT  /profile/me             — update full_name (and other editable fields)
POST /profile/change-password — change password (requires current password)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import get_password_hash, verify_password
from app.models.student import User
from app.schemas.auth import UserResponse
from app.schemas.preferences import UserPreferencesResponse, UserPreferencesUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


# ── Schemas ────────────────────────────────────────────────────────────────

class ProfileResponse(UserResponse):
    preferences: UserPreferencesResponse


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255, strip_whitespace=True)
    language: str | None = Field(default=None, max_length=10, strip_whitespace=True)
    timezone: str | None = Field(default=None, max_length=64, strip_whitespace=True)
    email_notifications: bool | None = None
    reminder_frequency: str | None = Field(default=None, max_length=20, strip_whitespace=True)
    preferences: UserPreferencesUpdate | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


def merge_user_preferences(existing: dict | None, update: UserPreferencesUpdate) -> dict:
    if not existing:
        existing = {}
    
    update_data = update.model_dump(exclude_unset=True)
    
    for key, val in update_data.items():
        if isinstance(val, dict):
            # Deep merge the sub-dictionaries
            existing[key] = {**(existing.get(key) or {}), **val}
        else:
            existing[key] = val
            
    return existing

# ── Routes ─────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=ProfileResponse,
    summary="Get current user profile",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Return the authenticated user's profile from the DB."""
    # We must construct a dict that pydantic can parse into ProfileResponse
    # ProfileResponse inherits from UserResponse, so we can just return an object
    # that has the properties, or return a dict. Pydantic v2 from_attributes will handle it if we attach preferences.
    # We will use from_dict for the preferences parsing.
    resp = UserResponse.model_validate(current_user).model_dump()
    resp["preferences"] = UserPreferencesResponse.from_dict(current_user.preferences)
    return resp


@router.patch(
    "/me",
    response_model=ProfileResponse,
    summary="Update current user profile",
)
async def update_my_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Update editable profile fields and preferences for the authenticated user."""
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.language is not None:
        current_user.language = body.language
    if body.timezone is not None:
        current_user.timezone = body.timezone
    if body.email_notifications is not None:
        current_user.email_notifications = body.email_notifications
    if body.reminder_frequency is not None:
        current_user.reminder_frequency = body.reminder_frequency
        
    if body.preferences is not None:
        # Merge the preferences safely
        from sqlalchemy.orm.attributes import flag_modified
        current_user.preferences = merge_user_preferences(current_user.preferences, body.preferences)
        flag_modified(current_user, "preferences")

    await db.commit()
    await db.refresh(current_user)
    
    resp = UserResponse.model_validate(current_user).model_dump()
    resp["preferences"] = UserPreferencesResponse.from_dict(current_user.preferences)
    return resp


@router.post(
    "/change-password",
    summary="Change password (requires current password)",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Verify current password then set a new one."""
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google Sign-In and has no password to change.",
        )
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    await db.commit()
    return {"message": "Password changed successfully."}
