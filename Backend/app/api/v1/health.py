from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Liveness + readiness probe.
    Returns 200 if the API is up and the database is reachable.
    """
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "database": db_status,
    }
