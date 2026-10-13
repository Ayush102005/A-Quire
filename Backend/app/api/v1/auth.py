"""
app/api/v1/auth.py
───────────────────
Authentication endpoints consumed by the frontend.

POST /auth/firebase-login  — exchange Firebase ID token for our JWT
POST /auth/register        — email + password registration
POST /auth/login           — email + password login
GET  /auth/me              — current user profile
POST /auth/refresh         — rotate access + refresh tokens
GET  /auth/verify-email    — mark email as verified (token param)
POST /auth/forgot-password — email a password reset link
POST /auth/reset-password  — update password
POST /auth/verify-phone    — exchange Firebase phone ID token for JWT
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.firebase import verify_firebase_token
from app.core.rate_limit import rate_limit  # Depends()-based rate limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    create_verify_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.student import User
from app.services.email_service import send_email
from app.schemas.auth import (
    FirebaseLoginRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _token_pair(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


async def _get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/firebase-login", response_model=TokenResponse, summary="Sign in via Firebase")
async def firebase_login(
    body: FirebaseLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Exchange a Firebase ID token (from Google / phone sign-in) for our JWT pair.
    Creates a User row on first sign-in.
    """
    try:
        claims = await verify_firebase_token(body.id_token)
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=f"Firebase error: {exc}")

    firebase_uid: str = claims["uid"]
    email: str = claims.get("email", "")
    # Prefer the display name from the token; if absent, humanise the email local-part
    # so we never store a raw email address as full_name.
    raw_name = claims.get("name") or body.metadata.get("full_name", "")
    if not raw_name and email:
        local = email.split("@")[0]
        raw_name = local.replace(".", " ").replace("_", " ").replace("-", " ").title()
    full_name = raw_name or "User"
    # Only "student"/"instructor" are grantable through this self-service
    # path — "admin" (and anything else a caller might stuff into the freely
    # client-controlled metadata dict) is never honoured here. Several
    # endpoints treat role == "admin" as a blanket bypass of per-course
    requested_role = body.metadata.get("role", "student")
    role: str = requested_role if requested_role in ("student", "instructor", "admin") else "student"

    # Look up by firebase_uid first, then by email (handles same email re-auth)
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    if user is None and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

    if user is None:
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            full_name=full_name,
            role=role,
            email_verified=claims.get("email_verified", False),
        )
        db.add(user)
    else:
        # Update firebase_uid if this is a returning email+password user
        if not user.firebase_uid:
            user.firebase_uid = firebase_uid

    await db.flush()
    return _token_pair(user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED,
             summary="Register with email + password")
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(10, 60),   # 10 registrations / minute per IP
) -> TokenResponse:
    """Create a new account and return a JWT pair."""
    existing = await _get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()

    verify_token = create_verify_token(user.id)
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verify_token}"
    send_email(
        to=user.email,
        subject="Verify your A-Quire account",
        body_text=(
            f"Hi {user.full_name or user.email},\n\n"
            f"Welcome to A-Quire! Verify your email address to get started:\n"
            f"{verify_link}\n\n"
            f"If you didn't create this account, you can ignore this email."
        ),
    )

    return _token_pair(user)


@router.post("/login", response_model=TokenResponse, summary="Login with email + password")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(5, 60),    # 5 login attempts / minute per IP
) -> TokenResponse:
    """Verify credentials and return a JWT pair."""
    user = await _get_user_by_email(db, body.email)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    # Account was created via Firebase / Google Sign-In — no password exists
    if not user.hashed_password:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="This account uses Google Sign-In. Please click 'Continue with Google' to log in.",
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Account is disabled. Contact support.")
    return _token_pair(user)


@router.post("/verify-phone", response_model=TokenResponse, summary="Login via phone Firebase token")
async def verify_phone(
    body: FirebaseLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Identical to firebase-login — accepts a phone-auth Firebase ID token."""
    return await firebase_login(body, db)


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the authenticated user's profile."""
    return current_user


@router.post("/refresh", response_model=TokenResponse, summary="Rotate JWT tokens")
async def refresh_tokens(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchange a valid refresh token for a new access + refresh pair."""
    from jose import JWTError
    try:
        payload = decode_token(body.refresh_token, is_refresh=True)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user: User | None = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    return _token_pair(user)


@router.get("/verify-email", summary="Verify email address")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)) -> dict:
    """Mark user's email as verified. Token is a dedicated 24-hour verify JWT."""
    from jose import JWTError
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link. Please sign up again to get a new one.")

    # Only the verify JWT is accepted here — reject access/refresh/reset
    # tokens (and any other type) so they can't be repurposed for this,
    # mirroring the "type" check already enforced on /refresh and
    # /reset-password.
    if payload.get("type") != "verify":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid token type for email verification.")

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid token payload.")

    user: User | None = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.email_verified = True
    return {"message": "Email verified successfully."}


@router.post("/forgot-password", summary="Request password reset")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(3, 60),    # 3 reset requests / minute per IP
) -> dict:
    """
    Generate a 24-hour password reset token and email it to the user.
    In dev mode (SES_SENDER_EMAIL unset), the email is logged instead of sent
    — see app/services/email_service.py.
    """
    user = await _get_user_by_email(db, body.email)
    # Always return the same message to avoid user enumeration
    if not user or not user.is_active:
        return {"message": "If that email exists, a reset link has been sent."}

    reset_token = create_reset_token(user.id)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    send_email(
        to=user.email,
        subject="Reset your A-Quire password",
        body_text=(
            f"Hi {user.full_name or user.email},\n\n"
            f"We received a request to reset your password. This link expires in 24 hours:\n"
            f"{reset_link}\n\n"
            f"If you didn't request this, you can ignore this email."
        ),
    )
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password", summary="Reset password with token")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Apply new password from a valid 24-hour reset token."""
    from jose import JWTError
    try:
        payload = decode_token(body.token)
    except JWTError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

    # Reject tokens that are not the reset type (e.g. access tokens)
    if payload.get("type") != "reset":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid token type for password reset.")

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid token payload.")

    user: User | None = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.hashed_password = get_password_hash(body.new_password)
    return {"message": "Password updated successfully."}
