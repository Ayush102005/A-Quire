from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Rate limiter (key = client IP address)
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Create a new account.

    - **email**: must be unique
    - **password**: minimum 8 characters
    - **role**: `student` (default) | `instructor` | `admin`

    A verification email is sent automatically. The user cannot log in
    until their email is verified.
    """
    user = await AuthService.register(db, payload)

    # Send verification email (non-blocking, best-effort)
    try:
        await email_service.send_verification_email(
            to=user.email,
            full_name=user.full_name,
            token=user.email_verify_token,
        )
    except Exception as exc:
        logger.warning(f"Verification email failed for user {user.id}: {exc}")

    return user


@router.get(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email address via token link",
)
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Verify a user's email address using the one-time token sent in the
    verification email. Returns 400 if the token is invalid or expired.
    """
    await AuthService.verify_email(db, token)
    return MessageResponse(message="Email verified successfully. You can now log in.")


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT tokens",
)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
async def login(
    request: Request,
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Exchange email + password for an **access token** (30 min) and a
    **refresh token** (7 days).

    Rate limited to `{LOGIN_RATE_LIMIT}` per IP to prevent brute-force attacks.
    Unverified accounts receive 403 with a clear message.
    """
    return await AuthService.login(db, credentials)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Issue a new token pair from a valid refresh token",
)
async def refresh(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Supply a non-expired **refresh token** to obtain a fresh access + refresh
    pair. Access tokens are explicitly rejected here.
    """
    return await AuthService.refresh(db, payload.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Requires a valid **Bearer access token**.
    Returns the authenticated user's profile — password hash is never exposed.
    """
    return current_user


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Send a password reset email",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Send a one-time password reset link to the given email address.

    **Always returns 200** regardless of whether the email exists — this prevents
    user enumeration attacks. If the email is registered, a reset link is sent.
    The link expires in 1 hour and can only be used once.
    """
    user = await AuthService.request_password_reset(db, payload.email)

    if user is not None:
        try:
            await email_service.send_password_reset_email(
                to=user.email,
                full_name=user.full_name,
                token=user.password_reset_token,
            )
        except Exception as exc:
            logger.warning(f"Password reset email failed for user {user.id}: {exc}")

    # Always return same message to prevent enumeration
    return MessageResponse(
        message="If an account with that email exists, a reset link has been sent. "
                "Check your inbox (and spam folder)."
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using a one-time token",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Set a new password using the one-time token from the reset email.

    Returns 400 if the token is invalid or expired.
    The token is invalidated after successful use.
    """
    await AuthService.reset_password(db, payload.token, payload.new_password)
    return MessageResponse(message="Password reset successfully. You can now log in.")
