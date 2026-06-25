"""
Test fixtures.

Uses SQLite + aiosqlite in-memory so tests run without a live PostgreSQL.
SQLAlchemy automatically falls back to VARCHAR for Enum types on SQLite.

Email verification is bypassed in tests by directly setting is_verified=True
after registration — no real email delivery occurs.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User

# ── In-memory test database ───────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


# ── Per-test DB setup (isolated) ─────────────────────────────────────────────
@pytest_asyncio.fixture(scope="function", autouse=True)
async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── Per-test HTTP client ──────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def client(monkeypatch):
    """HTTP test client with email service mocked out (no real SES calls)."""
    # Patch email service so no real network calls happen in tests
    from app.services import email_service as es_module

    async def _noop(*args, **kwargs):
        return True

    monkeypatch.setattr(es_module.email_service, "send_verification_email", _noop)
    monkeypatch.setattr(es_module.email_service, "send_password_reset_email", _noop)

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _auto_verify_user(email: str) -> None:
    """Directly set is_verified=True so tests bypass the email flow."""
    async with TestSessionLocal() as db:
        await db.execute(
            update(User).where(User.email == email).values(is_verified=True)
        )
        await db.commit()


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient) -> dict:
    """Register a student, auto-verify their email, and return response JSON."""
    resp = await client.post("/api/v1/auth/register", json={
        "email": "student@example.com",
        "full_name": "Test Student",
        "password": "SecurePass123",
        "role": "student",
    })
    assert resp.status_code == 201, resp.text
    await _auto_verify_user("student@example.com")
    return resp.json()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, registered_user: dict) -> dict:
    """Return Bearer auth headers for the registered student."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "student@example.com",
        "password": "SecurePass123",
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def instructor_headers(client: AsyncClient) -> dict:
    """Register an instructor, auto-verify, and return auth headers."""
    await client.post("/api/v1/auth/register", json={
        "email": "instructor@example.com",
        "full_name": "Test Instructor",
        "password": "SecurePass123",
        "role": "instructor",
    })
    await _auto_verify_user("instructor@example.com")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "instructor@example.com",
        "password": "SecurePass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
