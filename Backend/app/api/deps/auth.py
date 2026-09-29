"""
app/api/deps/auth.py
─────────────────────
FastAPI dependency that authenticates requests via our own JWT access tokens.

Flow:
    Frontend sends: Authorization: Bearer <access_token>
    We decode the JWT → get user_id → load User from DB → return User object

Usage:
    from app.api.deps import get_current_user

    @router.get("/protected")
    async def route(user: User = Depends(get_current_user)):
        return {"id": user.id, "role": user.role}
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.student import User

_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    http_creds: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode the Bearer JWT, load the corresponding User from the DB.

    Raises HTTP 401 for:
    - Missing or malformed Authorization header
    - Invalid / expired JWT
    - Wrong token type (refresh token used as access token)
    - User not found or deactivated
    """
    token = http_creds.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Use a valid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 'sub' claim must be a valid user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user: User | None = await db.get(User, user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account is deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
