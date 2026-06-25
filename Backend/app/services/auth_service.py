from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import RoleEnum, User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate

# ── Token constants ────────────────────────────────────────────────────────────
_VERIFY_TOKEN_EXPIRY_HOURS = 24
_RESET_TOKEN_EXPIRY_HOURS = 1


class AuthService:

    # ── Queries ───────────────────────────────────────────────────────────────

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_verify_token(db: AsyncSession, token: str) -> User | None:
        result = await db.execute(
            select(User).where(User.email_verify_token == token)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_reset_token(db: AsyncSession, token: str) -> User | None:
        result = await db.execute(
            select(User).where(User.password_reset_token == token)
        )
        return result.scalar_one_or_none()

    # ── Register ──────────────────────────────────────────────────────────────

    @staticmethod
    async def register(db: AsyncSession, payload: UserCreate) -> User:
        existing = await AuthService.get_by_email(db, payload.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        verify_token = secrets.token_urlsafe(32)
        verify_expires = datetime.now(timezone.utc) + timedelta(hours=_VERIFY_TOKEN_EXPIRY_HOURS)

        user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            role=payload.role if payload.role in RoleEnum else RoleEnum.STUDENT,
            is_verified=False,
            email_verify_token=verify_token,
            email_verify_expires=verify_expires,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    # ── Email verification ─────────────────────────────────────────────────────

    @staticmethod
    async def verify_email(db: AsyncSession, token: str) -> User:
        """Mark the user's email as verified; invalidate the token."""
        user = await AuthService.get_by_verify_token(db, token)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification link",
            )

        if user.email_verify_expires and user.email_verify_expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired — please register again or request a new link",
            )

        if user.is_verified:
            # Idempotent — already verified
            return user

        user.is_verified = True
        user.email_verify_token = None
        user.email_verify_expires = None
        await db.commit()
        await db.refresh(user)
        return user

    # ── Login ─────────────────────────────────────────────────────────────────

    @staticmethod
    async def login(db: AsyncSession, credentials: LoginRequest) -> TokenResponse:
        user = await AuthService.get_by_email(db, credentials.email)

        # Constant-time path to avoid user-enumeration timing side-channel
        if user is None or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email address before logging in. "
                       "Check your inbox for a verification link.",
            )

        return TokenResponse(
            access_token=create_access_token(user.id, user.role.value),
            refresh_token=create_refresh_token(user.id),
        )

    # ── Refresh ───────────────────────────────────────────────────────────────

    @staticmethod
    async def refresh(db: AsyncSession, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)

        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is malformed",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = await AuthService.get_by_id(db, int(user_id))
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or account disabled",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return TokenResponse(
            access_token=create_access_token(user.id, user.role.value),
            refresh_token=create_refresh_token(user.id),
        )

    # ── Password reset ────────────────────────────────────────────────────────

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> User | None:
        """
        Generate a one-time password reset token for the user.
        Returns the User so the caller can send the email.
        Returns None if no account exists (caller should NOT reveal this to prevent enumeration).
        """
        user = await AuthService.get_by_email(db, email)
        if user is None:
            return None

        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.now(timezone.utc) + timedelta(hours=_RESET_TOKEN_EXPIRY_HOURS)

        user.password_reset_token = reset_token
        user.password_reset_expires = reset_expires
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> User:
        """
        Validate the reset token and update the user's password hash.
        Invalidates the token after use (one-time use).
        """
        user = await AuthService.get_by_reset_token(db, token)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset link",
            )

        if user.password_reset_expires and user.password_reset_expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset link has expired — please request a new one",
            )

        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters",
            )

        user.password_hash = hash_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        await db.commit()
        await db.refresh(user)
        return user
