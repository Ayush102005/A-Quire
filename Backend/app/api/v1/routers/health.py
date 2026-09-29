"""
app/api/v1/routers/health.py
─────────────────────────────
Public health-check endpoints — no auth required.
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check() -> dict:
    """Returns 200 OK so load-balancers / uptime monitors can verify the service."""
    return {"status": "ok"}
