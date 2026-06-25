from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.onboarding import (
    FinalizeOnboardingRequest,
    OnboardingResponse,
    OnboardingSummary,
    OnboardingStatus,
    PreferencesData,
    ProfileData,
    RoleSelectionRequest,
    SavePreferencesRequest,
    SaveProfileRequest,
)
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get(
    "/status",
    response_model=OnboardingSummary,
    summary="Get onboarding status and data",
)
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingSummary:
    """
    Get the current onboarding status for the authenticated user.
    
    Returns:
    - Current step in the onboarding process
    - Completion flags for each step
    - Associated profile and preferences data
    """
    onboarding, profile = await OnboardingService.get_status(db, current_user.id)
    
    profile_data = None
    if profile and (profile.goals or profile.interests):
        profile_data = ProfileData(
            goals=profile.goals,
            interests=profile.interests,
        )
    
    preferences_data = None
    if profile:
        preferences_data = PreferencesData(
            language=profile.language,
            timezone=profile.timezone,
            email_notifications=profile.email_notifications,
            reminder_frequency=profile.reminder_frequency,
        )
    
    return OnboardingSummary(
        status=OnboardingStatus.model_validate(onboarding),
        profile=profile_data,
        preferences=preferences_data,
    )


@router.post(
    "/set-role",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    summary="Set user role (one-time only)",
)
async def set_role(
    payload: RoleSelectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    """
    Set the user's role during onboarding. This can only be done once.
    
    - **role**: `student` or `instructor`
    
    Returns:
    - Updated onboarding status
    - Error if role has already been set
    """
    onboarding = await OnboardingService.set_role(db, current_user, payload)
    
    return OnboardingResponse(
        message="Role set successfully",
        status=OnboardingStatus.model_validate(onboarding),
    )


@router.post(
    "/save-profile",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    summary="Save profile information",
)
async def save_profile(
    payload: SaveProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    """
    Save profile information including goals and interests.
    
    - **goals**: User's learning or teaching goals
    - **interests**: User's areas of interest
    
    Returns:
    - Updated onboarding status
    """
    profile = await OnboardingService.save_profile(db, current_user.id, payload)
    onboarding = await OnboardingService.get_or_create_onboarding(db, current_user.id)
    
    return OnboardingResponse(
        message="Profile saved successfully",
        status=OnboardingStatus.model_validate(onboarding),
    )


@router.post(
    "/save-preferences",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    summary="Save user preferences",
)
async def save_preferences(
    payload: SavePreferencesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    """
    Save user preferences such as language, timezone, and notification settings.
    
    - **language**: Preferred language (en, es, fr, de, zh, ja)
    - **timezone**: User's timezone (e.g., UTC, America/New_York)
    - **email_notifications**: Enable/disable email notifications
    - **reminder_frequency**: Frequency of reminders (daily, weekly, monthly, none)
    
    Returns:
    - Updated onboarding status
    """
    profile = await OnboardingService.save_preferences(db, current_user.id, payload)
    onboarding = await OnboardingService.get_or_create_onboarding(db, current_user.id)
    
    return OnboardingResponse(
        message="Preferences saved successfully",
        status=OnboardingStatus.model_validate(onboarding),
    )


@router.post(
    "/finalize",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete the onboarding process",
)
async def finalize_onboarding(
    payload: FinalizeOnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingResponse:
    """
    Finalize and complete the onboarding process.
    
    Requirements:
    - Role must be set
    - Profile information must be saved
    - Preferences must be saved
    
    Returns:
    - Final onboarding status
    - Error if any step is incomplete
    """
    onboarding = await OnboardingService.finalize_onboarding(db, current_user)
    
    return OnboardingResponse(
        message="Onboarding completed successfully",
        status=OnboardingStatus.model_validate(onboarding),
    )
