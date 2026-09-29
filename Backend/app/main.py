"""
app/main.py
────────────
FastAPI application factory for A-Quire Backend.
WebSocket router mounted at root level (outside /api/v1 prefix).
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.api.v1.ws import router as ws_router
from app.core.config import settings
from app.core.firebase import init_firebase
# Rate limiting is applied per-route via Depends() in app/core/rate_limit.py


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_firebase()
    print(f"[OK] {settings.APP_NAME} started (debug={settings.DEBUG})")
    yield
    print(f"[--] {settings.APP_NAME} shutting down...")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="A-Quire — AI-powered adaptive learning platform REST API",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # In DEBUG mode allow any origin (dev convenience). In production, use the configured origins.
    if settings.DEBUG:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_origin_regex=r".*",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Security Headers and Request ID middlewares
    from app.core.middleware import SecurityHeadersMiddleware, RequestIDMiddleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Versioned REST API
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # WebSocket at root level (ws://host/ws/notifications)
    app.include_router(ws_router)

    @app.get("/", tags=["Root"])
    async def root() -> dict:
        return {"message": f"{settings.APP_NAME} is running 🚀"}

    @app.get("/health", tags=["Health"])
    async def health_check() -> dict:
        """
        Simple health check for infrastructure.
        """
        import sqlalchemy as sa
        # app.core.database doesn't exist — the actual session factory lives
        # in app.db.session as AsyncSessionLocal. This import failing raised
        # unconditionally (outside the try/except below, which only guards
        # the DB *query* itself), so /health 500'd on every single call
        # instead of ever reporting a real db_ok/redis_ok status.
        from app.db.session import AsyncSessionLocal
        db_ok = False
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(sa.text("SELECT 1"))
            db_ok = True
        except Exception:
            pass

        # Since Celery uses Redis as a broker, we check if we can import and inspect it.
        # conn.connect() is a synchronous, blocking kombu call with no
        # timeout of its own — called directly on the event loop, an
        # unreachable (rather than actively refused) Redis host doesn't
        # fail fast, it hangs for however long the OS's own TCP connect
        # timeout is (can be a minute-plus on some platforms), freezing
        # this whole worker's event loop — every other request on it stalls
        # too — for that entire time. Running it in a thread with an
        # explicit short timeout bounds the damage to one slow health
        # check instead of the whole process appearing to hang.
        import asyncio
        redis_ok = False
        try:
            from app.core.celery_app import celery_app

            def _check_redis() -> None:
                with celery_app.connection_for_read() as conn:
                    conn.connect()

            await asyncio.wait_for(asyncio.to_thread(_check_redis), timeout=2.0)
            redis_ok = True
        except Exception:
            pass

        return {
            "status": "ok" if db_ok else "error",
            "db": db_ok,
            "redis": redis_ok,
        }

    return app


app = create_app()
