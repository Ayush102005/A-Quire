"""
app/api/v1/onboarding.py
─────────────────────────
Protected onboarding flow endpoints.

GET  /onboarding/status
POST /onboarding/set-role
POST /onboarding/save-profile
POST /onboarding/save-preferences
POST /onboarding/finalize
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.student import User
from app.schemas.onboarding import (
    OnboardingCompleteResponse,
    OnboardingStatusResponse,
    SavePreferencesRequest,
    SaveProfileRequest,
    SetRoleRequest,
)

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.get("/status", response_model=OnboardingStatusResponse)
async def onboarding_status(current_user: User = Depends(get_current_user)) -> dict:
    return {"onboarding_complete": current_user.onboarding_complete, "role": current_user.role}


@router.post("/set-role", response_model=OnboardingStatusResponse)
async def set_role(
    body: SetRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    current_user.role = body.role
    await db.flush()
    return {"onboarding_complete": current_user.onboarding_complete, "role": current_user.role}


@router.post("/save-profile", response_model=OnboardingStatusResponse)
async def save_profile(
    body: SaveProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.goals is not None:
        current_user.goals = body.goals
    if body.interests is not None:
        current_user.interests = body.interests
    await db.flush()
    return {"onboarding_complete": current_user.onboarding_complete, "role": current_user.role}


@router.post("/save-preferences", response_model=OnboardingStatusResponse)
async def save_preferences(
    body: SavePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    current_user.language = body.language
    current_user.timezone = body.timezone
    current_user.email_notifications = body.email_notifications
    current_user.reminder_frequency = body.reminder_frequency
    await db.flush()
    return {"onboarding_complete": current_user.onboarding_complete, "role": current_user.role}


@router.post("/finalize", response_model=OnboardingCompleteResponse)
async def finalize(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    current_user.onboarding_complete = True
    await db.flush()
    return {"message": "Onboarding complete!", "onboarding_complete": True}
