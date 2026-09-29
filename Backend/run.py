"""
run.py
───────
Development entry-point.

Usage:
    python run.py           # uses defaults from .env
    uvicorn app.main:app --reload   # alternative, same effect
"""
import uvicorn

from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
