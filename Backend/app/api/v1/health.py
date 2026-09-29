"""
app/api/v1/health.py
─────────────────────
Public health-check router — no authentication required.
Mounted at GET /api/v1/health by the v1 API router.
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check() -> dict:
    """
    Returns HTTP 200 with status 'ok'.
    Used by load-balancers, uptime monitors, and deployment pipelines
    to confirm the service is reachable.
    """
    return {"status": "ok"}
