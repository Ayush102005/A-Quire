"""
tests/api/test_auth.py
───────────────────────
Tests for /api/v1/auth/* endpoints:
  - register (email + password)
  - login
  - /auth/me (get current user)
  - token refresh
  - duplicate email rejection
  - wrong password rejection
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRegister:
    async def test_register_student_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "new_student@example.com",
            "password": "secure123",
            "full_name": "New Student",
            "role": "student",
        })
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_instructor_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "new_instructor@example.com",
            "password": "secure123",
            "full_name": "New Instructor",
            "role": "instructor",
        })
        assert resp.status_code in (200, 201)
        assert "access_token" in resp.json()

    async def test_register_duplicate_email(self, client: AsyncClient):
        payload = {
            "email": "dup@example.com",
            "password": "secure123",
            "full_name": "Dup User",
            "role": "student",
        }
        r1 = await client.post("/api/v1/auth/register", json=payload)
        assert r1.status_code in (200, 201)
        r2 = await client.post("/api/v1/auth/register", json=payload)
        assert r2.status_code == 409  # Conflict

    async def test_register_invalid_role(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "badrole@example.com",
            "password": "secure123",
            "full_name": "Bad Role",
            "role": "superuser",  # invalid
        })
        assert resp.status_code == 422  # Validation error

    async def test_register_weak_password(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "weakpw@example.com",
            "password": "123",  # < 6 chars
            "full_name": "Weak PW",
            "role": "student",
        })
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    async def test_login_success(self, client: AsyncClient, student_tokens: dict):
        """Login using the dynamically-registered student's email."""
        # Re-login using /auth/me to find out the email used during registration.
        # The student_tokens fixture registers with a uuid-unique email, so we
        # get the email by calling /auth/me with the fixture's access token.
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {student_tokens['access_token']}"},
        )
        assert me_resp.status_code == 200
        email = me_resp.json()["email"]

        resp = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "pass1234",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, student_tokens: dict):
        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {student_tokens['access_token']}"},
        )
        email = me_resp.json()["email"]
        resp = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "ghost@example.com",
            "password": "pass1234",
        })
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestMe:
    async def test_get_current_user(self, client: AsyncClient, student_headers: dict):
        resp = await client.get("/api/v1/auth/me", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        # email will be unique per test (uuid-suffixed), just check structure
        assert "email" in data
        assert data["role"] == "student"
        assert "id" in data

    async def test_get_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 403  # HTTPBearer raises 403 when no header

    async def test_get_me_bad_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestRefresh:
    async def test_refresh_token(self, client: AsyncClient, student_tokens: dict):
        resp = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": student_tokens["refresh_token"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # Token is valid (non-empty string)
        assert len(data["access_token"]) > 20

    async def test_refresh_with_access_token_fails(self, client: AsyncClient, student_tokens: dict):
        """Using an access token as a refresh token should be rejected."""
        resp = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": student_tokens["access_token"],
        })
        assert resp.status_code == 401
