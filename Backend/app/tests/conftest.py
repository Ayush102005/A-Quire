"""
tests/conftest.py
──────────────────
Shared pytest fixtures for A-Quire backend tests.

Uses an in-memory SQLite database (aiosqlite) so tests run without
a real PostgreSQL instance. The test client is built with httpx.AsyncClient
pointed at the FastAPI app directly (no network required).

To run:
    cd Backend
    pytest -v
"""
from __future__ import annotations

# ── Patch PostgreSQL-only types before any model imports ──────────────────
# SQLite doesn't know about JSONB. Replace it with standard JSON so that
# table creation succeeds in the in-memory test database.
from sqlalchemy import JSON
from sqlalchemy.dialects import postgresql as _pg
_pg.JSONB = JSON  # type: ignore[attr-defined]

import uuid
from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.session import Base, get_db
from app.main import app

# ── In-memory SQLite engine (tests only) ───────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Database setup / teardown ─────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session, then drop them."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a fresh DB session for direct DB operations in tests."""
    async with TestSessionLocal() as session:
        yield session


# ── Override get_db dependency to use test SQLite DB ──────────────────────
@pytest_asyncio.fixture()
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Return an httpx AsyncClient wired to the test DB."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


def _unique_email(role: str) -> str:
    """Generate a unique email per test so fixtures don't collide."""
    return f"{role}_{uuid.uuid4().hex[:8]}@test.com"


# ── Convenience: register + login, return tokens ──────────────────────────
@pytest_asyncio.fixture()
async def student_tokens(client: AsyncClient) -> dict[str, Any]:
    """Register a fresh student for each test and return tokens."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": _unique_email("student"),
        "password": "pass123",
        "full_name": "Test Student",
        "role": "student",
    })
    assert reg.status_code in (200, 201), reg.text
    return reg.json()


@pytest_asyncio.fixture()
async def instructor_tokens(client: AsyncClient) -> dict[str, Any]:
    """Register a fresh instructor for each test and return tokens."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": _unique_email("instructor"),
        "password": "pass123",
        "full_name": "Test Instructor",
        "role": "instructor",
    })
    assert reg.status_code in (200, 201), reg.text
    return reg.json()


@pytest_asyncio.fixture()
async def student_headers(student_tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {student_tokens['access_token']}"}


@pytest_asyncio.fixture()
async def instructor_headers(instructor_tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {instructor_tokens['access_token']}"}
