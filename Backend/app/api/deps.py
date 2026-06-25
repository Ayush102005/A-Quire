from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)


# ── Core auth dependency ──────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate Bearer token → return the authenticated User ORM object.
    Raises 401 on any failure so callers never see a None.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is malformed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# ── Convenience extractors ────────────────────────────────────────────────────

async def get_current_user_id(
    current_user: User = Depends(get_current_user),
) -> int:
    return current_user.id


async def get_current_user_role(
    current_user: User = Depends(get_current_user),
) -> str:
    return current_user.role.value


# ── Role guard factory ────────────────────────────────────────────────────────

def require_role(*roles: str):
    """
    Usage:
        Depends(require_role("admin", "instructor"))

    Returns the authenticated User if their role is in *roles,
    otherwise raises 403 Forbidden.
    """
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {' or '.join(roles)}",
            )
        return current_user

    return _check
