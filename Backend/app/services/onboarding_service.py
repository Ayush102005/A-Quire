from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.onboarding import Onboarding, OnboardingStepEnum
from app.models.profile import Profile, LanguageEnum, ReminderFrequencyEnum
from app.models.user import User, RoleEnum
from app.schemas.onboarding import (
    PreferencesData,
    ProfileData,
    SavePreferencesRequest,
    SaveProfileRequest,
    RoleSelectionRequest,
)


class OnboardingService:

    # ── Queries ───────────────────────────────────────────────────────────────

    @staticmethod
    async def get_onboarding(db: AsyncSession, user_id: int) -> Onboarding | None:
        """Get onboarding record by user ID"""
        result = await db.execute(
            select(Onboarding).where(Onboarding.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_or_create_onboarding(db: AsyncSession, user_id: int) -> Onboarding:
        """Get existing onboarding or create new one"""
        onboarding = await OnboardingService.get_onboarding(db, user_id)
        if not onboarding:
            onboarding = Onboarding(
                user_id=user_id,
                current_step=OnboardingStepEnum.ROLE_SELECTION,
            )
            db.add(onboarding)
            await db.commit()
            await db.refresh(onboarding)
        return onboarding

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: int) -> Profile | None:
        """Get user profile by user ID"""
        result = await db.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_or_create_profile(db: AsyncSession, user_id: int) -> Profile:
        """Get existing profile or create new one"""
        profile = await OnboardingService.get_profile(db, user_id)
        if not profile:
            profile = Profile(
                user_id=user_id,
                language=LanguageEnum.ENGLISH,
                reminder_frequency=ReminderFrequencyEnum.WEEKLY,
            )
            db.add(profile)
            await db.commit()
            await db.refresh(profile)
        return profile

    # ── Role Selection ────────────────────────────────────────────────────────

    @staticmethod
    async def set_role(
        db: AsyncSession,
        user: User,
        payload: RoleSelectionRequest,
    ) -> Onboarding:
        """Set user role during onboarding (one-time only)"""
        onboarding = await OnboardingService.get_or_create_onboarding(db, user.id)
        
        # Check if role has already been set
        if onboarding.role_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role has already been set. Cannot change it.",
            )
        
        # Update user role
        user.role = payload.role
        
        # Mark role as set
        onboarding.role_set = True
        onboarding.role_completed = True
        onboarding.current_step = OnboardingStepEnum.PROFILE_SETUP
        
        db.add(user)
        db.add(onboarding)
        await db.commit()
        await db.refresh(onboarding)
        
        return onboarding

    # ── Profile Management ────────────────────────────────────────────────────

    @staticmethod
    async def save_profile(
        db: AsyncSession,
        user_id: int,
        payload: SaveProfileRequest,
    ) -> Profile:
        """Save or update user profile data"""
        profile = await OnboardingService.get_or_create_profile(db, user_id)
        
        if payload.goals is not None:
            profile.goals = payload.goals
        if payload.interests is not None:
            profile.interests = payload.interests
        
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Update onboarding progress
        onboarding = await OnboardingService.get_or_create_onboarding(db, user_id)
        onboarding.profile_completed = True
        onboarding.current_step = OnboardingStepEnum.PREFERENCES
        db.add(onboarding)
        await db.commit()
        
        return profile

    # ── Preferences Management ────────────────────────────────────────────────

    @staticmethod
    async def save_preferences(
        db: AsyncSession,
        user_id: int,
        payload: SavePreferencesRequest,
    ) -> Profile:
        """Save or update user preferences"""
        profile = await OnboardingService.get_or_create_profile(db, user_id)
        
        profile.language = payload.language
        profile.timezone = payload.timezone
        profile.email_notifications = payload.email_notifications
        profile.reminder_frequency = payload.reminder_frequency
        
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        
        # Update onboarding progress
        onboarding = await OnboardingService.get_or_create_onboarding(db, user_id)
        onboarding.preferences_completed = True
        db.add(onboarding)
        await db.commit()
        
        return profile

    # ── Finalize Onboarding ───────────────────────────────────────────────────

    @staticmethod
    async def finalize_onboarding(
        db: AsyncSession,
        user: User,
    ) -> Onboarding:
        """Complete the onboarding process"""
        onboarding = await OnboardingService.get_or_create_onboarding(db, user.id)
        
        # Check if all required steps are completed
        if not (onboarding.role_completed and onboarding.profile_completed and onboarding.preferences_completed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All onboarding steps must be completed before finalization",
            )
        
        # Mark onboarding as completed
        onboarding.is_completed = True
        onboarding.current_step = OnboardingStepEnum.COMPLETED
        onboarding.completed_at = datetime.now(timezone.utc)
        
        # Update user's is_onboarded flag
        user.is_onboarded = True
        
        db.add(onboarding)
        db.add(user)
        await db.commit()
        await db.refresh(onboarding)
        
        return onboarding

    # ── Onboarding Status ─────────────────────────────────────────────────────

    @staticmethod
    async def get_status(
        db: AsyncSession,
        user_id: int,
    ) -> tuple[Onboarding, Optional[Profile]]:
        """Get complete onboarding status with profile data"""
        onboarding = await OnboardingService.get_or_create_onboarding(db, user_id)
        profile = await OnboardingService.get_or_create_profile(db, user_id)
        
        return onboarding, profile
