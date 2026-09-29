"""
app/api/deps/__init__.py
Re-export most-used dependencies for clean import paths.
"""
from app.api.deps.auth import get_current_user
from app.db.session import get_db

__all__ = ["get_current_user", "get_db"]
