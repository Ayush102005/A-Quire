"""
app/core/rate_limit.py
──────────────────────
FastAPI-compatible rate limiting via Depends().

Uses a Depends() factory instead of decorators so that route function
signatures are never wrapped — FastAPI's body/query parsing stays intact.

Usage in a route:
    from app.core.rate_limit import rate_limit

    @router.post("/login")
    async def login(
        body: LoginRequest,
        db: AsyncSession = Depends(get_db),
        _: None = rate_limit(5, 60),      # 5 requests per 60 s per IP
    ) -> TokenResponse:

Testing:
    Call reset_all_limits() in an autouse fixture to clear counters.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings

# store: { path → { client_ip → [timestamp, …] } }
_rate_stores: dict[str, dict[str, list[float]]] = defaultdict(
    lambda: defaultdict(list)
)


def _resolve_client_ip(request: Request) -> str:
    # settings.TRUST_X_FORWARDED_FOR gates this — see its definition in
    # config.py for why blindly trusting this header is unsafe unless a
    # real reverse proxy (this project's Caddy setup) is the one setting
    # it, overwriting whatever a client sent rather than passing it through.
    if settings.TRUST_X_FORWARDED_FOR:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.strip()
    return request.client.host if request.client else "testclient"


def rate_limit(max_calls: int, window_seconds: int = 60) -> Callable:
    """
    Return a FastAPI Depends() that enforces an IP-based rate limit.

    Raises HTTP 429 if the same client IP exceeds *max_calls* within
    *window_seconds* on the same endpoint path.
    """
    async def _check(request: Request) -> None:
        client_ip: str = _resolve_client_ip(request)
        path: str = request.url.path
        now = time.monotonic()

        bucket = _rate_stores[path]
        # evict timestamps outside the window
        bucket[client_ip] = [
            t for t in bucket[client_ip] if now - t < window_seconds
        ]

        if len(bucket[client_ip]) >= max_calls:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded — max {max_calls} requests "
                       f"per {window_seconds}s. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

        bucket[client_ip].append(now)

    return Depends(_check)


def reset_all_limits() -> None:
    """Clear every rate-limit counter (call in test fixtures)."""
    _rate_stores.clear()
