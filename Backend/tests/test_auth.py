"""Tests for /api/v1/auth/* endpoints — including email verification and password reset."""
import pytest
from httpx import AsyncClient

from tests.conftest import _auto_verify_user


# ── Registration ──────────────────────────────────────────────────────────────

async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "newuser@test.com",
        "full_name": "New User",
        "password": "Password123",
        "role": "student",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "student"
    assert "password_hash" not in data


async def test_register_duplicate_email(client: AsyncClient, registered_user: dict):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "student@example.com",
        "full_name": "Dupe",
        "password": "Password123",
        "role": "student",
    })
    assert resp.status_code == 409


# ── Email verification ────────────────────────────────────────────────────────

async def test_unverified_user_cannot_login(client: AsyncClient):
    """Registration creates an unverified account; login must be blocked."""
    await client.post("/api/v1/auth/register", json={
        "email": "unverified@test.com",
        "full_name": "Unverified",
        "password": "SecurePass123",
        "role": "student",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "unverified@test.com",
        "password": "SecurePass123",
    })
    assert resp.status_code == 403
    assert "verify" in resp.json()["detail"].lower()


async def test_verify_email_invalid_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/verify-email?token=badtoken999")
    assert resp.status_code == 400


# ── Login ─────────────────────────────────────────────────────────────────────

async def test_login_success(client: AsyncClient, registered_user: dict):
    """registered_user fixture auto-verifies; login should succeed."""
    resp = await client.post("/api/v1/auth/login", json={
        "email": "student@example.com",
        "password": "SecurePass123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, registered_user: dict):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "student@example.com",
        "password": "WRONGPASS",
    })
    assert resp.status_code == 401


async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "ghost@nowhere.com",
        "password": "any",
    })
    assert resp.status_code == 401


# ── Me / Refresh ──────────────────────────────────────────────────────────────

async def test_get_me(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "student@example.com"


async def test_get_me_no_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_refresh_tokens(client: AsyncClient, registered_user: dict):
    login = await client.post("/api/v1/auth/login", json={
        "email": "student@example.com",
        "password": "SecurePass123",
    })
    refresh_token = login.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_with_access_token_rejected(client: AsyncClient, auth_headers: dict):
    """Access tokens must not be accepted as refresh tokens."""
    access_token = auth_headers["Authorization"].split(" ")[1]
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert resp.status_code == 401


# ── Forgot / Reset password ───────────────────────────────────────────────────

async def test_forgot_password_always_200(client: AsyncClient):
    """Always returns 200 regardless of whether the email exists (anti-enumeration)."""
    resp = await client.post("/api/v1/auth/forgot-password", json={
        "email": "nonexistent@test.com"
    })
    assert resp.status_code == 200
    assert "message" in resp.json()


async def test_forgot_password_existing_user(client: AsyncClient, registered_user: dict):
    """Existing user should also get 200 (no enumeration)."""
    resp = await client.post("/api/v1/auth/forgot-password", json={
        "email": "student@example.com"
    })
    assert resp.status_code == 200


async def test_reset_password_invalid_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/reset-password", json={
        "token": "badtoken999",
        "new_password": "NewPass123",
    })
    assert resp.status_code == 400


async def test_reset_password_flow(client: AsyncClient, registered_user: dict):
    """Full reset flow: request reset → extract DB token → reset → login with new password."""
    from sqlalchemy import select
    from tests.conftest import TestSessionLocal
    from app.models.user import User

    # Trigger reset token generation
    await client.post("/api/v1/auth/forgot-password", json={"email": "student@example.com"})

    # Extract the token directly from DB (simulates email delivery)
    async with TestSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "student@example.com"))
        user = result.scalar_one()
        reset_token = user.password_reset_token

    assert reset_token is not None

    # Reset the password
    resp = await client.post("/api/v1/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewSecurePass456",
    })
    assert resp.status_code == 200

    # Login with new password
    login = await client.post("/api/v1/auth/login", json={
        "email": "student@example.com",
        "password": "NewSecurePass456",
    })
    assert login.status_code == 200
    assert "access_token" in login.json()


async def test_reset_token_single_use(client: AsyncClient, registered_user: dict):
    """Reset token is invalidated after use — second attempt must fail."""
    from sqlalchemy import select
    from tests.conftest import TestSessionLocal
    from app.models.user import User

    await client.post("/api/v1/auth/forgot-password", json={"email": "student@example.com"})

    async with TestSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "student@example.com"))
        user = result.scalar_one()
        reset_token = user.password_reset_token

    # First use — success
    r1 = await client.post("/api/v1/auth/reset-password", json={
        "token": reset_token, "new_password": "Pass1234567"
    })
    assert r1.status_code == 200

    # Second use of same token — must fail
    r2 = await client.post("/api/v1/auth/reset-password", json={
        "token": reset_token, "new_password": "AnotherPass99"
    })
    assert r2.status_code == 400
