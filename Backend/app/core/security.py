"""
app/core/security.py
─────────────────────
JWT creation / verification and password hashing.

Tokens:
    access_token  — short-lived (30 min), type="access"
    refresh_token — long-lived  (7 days), type="refresh"

Payload shape:
    { "sub": "<user_id>", "type": "access"|"refresh", "exp": <unix_ts> }
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── Constants ──────────────────────────────────────────────────────────────
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
RESET_TOKEN_EXPIRE_HOURS = 24
VERIFY_TOKEN_EXPIRE_HOURS = 24


# ── Password hashing ───────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches the stored bcrypt hash."""
    return _pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash of the given password."""
    return _pwd_context.hash(password)


# ── JWT helpers ────────────────────────────────────────────────────────────

def _make_token(user_id: int, token_type: str, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "exp": expire,
    }
    is_refresh = (token_type == "refresh")
    secret = settings.SECRET_KEY
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def create_access_token(user_id: int) -> str:
    """Create a short-lived access JWT."""
    return _make_token(
        user_id, "access",
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int) -> str:
    """Create a long-lived refresh JWT."""
    return _make_token(
        user_id, "refresh",
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_reset_token(user_id: int) -> str:
    """Create a 24-hour password-reset JWT (type='reset')."""
    return _make_token(
        user_id, "reset",
        timedelta(hours=RESET_TOKEN_EXPIRE_HOURS),
    )


def create_verify_token(user_id: int) -> str:
    """
    Create a 24-hour email-verification JWT (type='verify').

    Previously /auth/register emailed a plain 30-minute access token for
    this — same lifetime as a login session, far too short for a link a
    user has to notice, open their inbox, and click, with no resend
    endpoint to get a fresh one after it expired. Matches create_reset_token's
    24-hour pattern instead, which fits the same "clicked from an email"
    use case.
    """
    return _make_token(
        user_id, "verify",
        timedelta(hours=VERIFY_TOKEN_EXPIRE_HOURS),
    )


def decode_token(token: str, is_refresh: bool = False) -> dict[str, Any]:
    """
    Decode and validate a JWT.
    Raises JWTError if invalid or expired.
    """
    secret = settings.SECRET_KEY
    return jwt.decode(token, secret, algorithms=[ALGORITHM])
