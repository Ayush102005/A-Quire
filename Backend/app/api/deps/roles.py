"""
app/api/deps/roles.py
─────────────────────
FastAPI dependencies for role-based access control.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from app.api.deps.auth import get_current_user
from app.models.student import User


def get_instructor_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user is an instructor (or admin)."""
    if current_user.role not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Instructor role required.",
        )
    return current_user


def get_student_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user is a student (or admin)."""
    if current_user.role not in ("student", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Student role required.",
        )
    return current_user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user is an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin role required.",
        )
    return current_user
