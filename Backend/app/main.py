from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.courses import router as courses_router
from app.api.v1.lessons import router as lessons_router
from app.api.v1.progress import router as progress_router
from app.api.v1.struggles import router as struggles_router
from app.api.v1.quiz import router as quiz_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.enrollments import router as enrollments_router

# ── WebSocket ─────────────────────────────────────────────────────────────────
from app.websocket.manager import manager
from app.core.security import decode_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Auto-migrate/create tables for SQLite
    if settings.DATABASE_URL.startswith("sqlite"):
        from app.core.database import engine, Base
        # Import all models to register with Base.metadata
        from app.models import user, course, progress, struggle, quiz, notification, onboarding, profile
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite database tables created/verified.")
        
        # Seed mock data
        from app.core.database import AsyncSessionLocal
        from app.utils.seeder import seed_database
        async with AsyncSessionLocal() as db:
            await seed_database(db)
            
    yield
    logger.info("Shutting down gracefully")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "A-Quire — AI-powered adaptive learning platform API. "
        "Provides authentication, course management, lesson progression, "
        "real-time struggle event ingestion, AI mentor hints, and WebSocket notifications."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Routes ───────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(health_router,        prefix=PREFIX)
app.include_router(auth_router,          prefix=PREFIX)
app.include_router(users_router,         prefix=f"{PREFIX}/users",         tags=["users"])
app.include_router(courses_router,       prefix=PREFIX)
app.include_router(lessons_router,       prefix=f"{PREFIX}/content",        tags=["lessons & modules"])
app.include_router(lessons_router,       prefix=PREFIX,                     tags=["lessons & modules"])
app.include_router(progress_router,      prefix=f"{PREFIX}/progress",       tags=["progress"])
app.include_router(struggles_router,     prefix=f"{PREFIX}/struggles",      tags=["struggles"])
app.include_router(quiz_router,          prefix=f"{PREFIX}/quizzes",        tags=["quizzes"])
app.include_router(notifications_router, prefix=f"{PREFIX}/notifications",  tags=["notifications"])
app.include_router(onboarding_router,    prefix=PREFIX)
app.include_router(analytics_router,     prefix=f"{PREFIX}/analytics",      tags=["analytics"])
app.include_router(enrollments_router,   prefix=PREFIX)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """
    Real-time notification channel.

    Connect with:
        ws://host/ws/notifications?token=<access_token>

    The server sends JSON messages:
        {"type": "notification", "data": {...}}
        {"type": "mentor_hint",  "data": {...}}
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Token required")
        return

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    user_id = int(payload.get("sub", 0))
    await manager.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "connected", "user_id": user_id})
        while True:
            # Keep connection alive; server pushes messages proactively
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(user_id, websocket)
        logger.info(f"WS disconnected: user_id={user_id}")


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/", tags=["root"])
async def root() -> dict:
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/v1/health",
        "websocket": "/ws/notifications?token=<access_token>",
    }


# ── Dev entry-point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        reload_excludes=["*.db", "*.db-journal", "*.db-wal", "*.db-shm"],
    )
