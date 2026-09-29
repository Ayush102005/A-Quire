"""
app/db/session.py
──────────────────
Async SQLAlchemy engine, session factory, ORM base, and FastAPI dependency.

Usage in a route:
    from app.db.session import get_db

    @router.get("/example")
    async def example(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(MyModel))
        return result.scalars().all()
"""
from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────
# echo=True logs every SQL statement — useful in dev, disable in prod.
# pool_pre_ping validates connections before use (handles dropped DB conns).
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ────────────────────────────────────────────────────────
# expire_on_commit=False keeps ORM objects usable after session.commit().
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Declarative Base ───────────────────────────────────────────────────────
# All SQLAlchemy models must inherit from this class.
class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


# ── FastAPI dependency ─────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an AsyncSession for the duration of a request.
    Automatically commits on success and rolls back on any exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
