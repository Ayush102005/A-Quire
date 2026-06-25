"""Tests for /api/v1/notifications/* endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestSessionLocal
from app.models.notification import Notification


async def _seed_notification(user_id: int, title: str = "Test", message: str = "msg") -> int:
    """Insert a notification directly into the test DB and return its id."""
    async with TestSessionLocal() as session:
        n = Notification(
            user_id=user_id, title=title, message=message, notification_type="info"
        )
        session.add(n)
        await session.commit()
        await session.refresh(n)
        return n.id


async def test_list_notifications_empty(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/notifications", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_list_notifications_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 401


async def test_get_notification(
    client: AsyncClient, auth_headers: dict, registered_user: dict
):
    user_id = registered_user["id"]
    notif_id = await _seed_notification(user_id, title="Welcome!", message="You're in.")

    resp = await client.get(f"/api/v1/notifications/{notif_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Welcome!"
    assert data["is_read"] is False


async def test_mark_notification_read(
    client: AsyncClient, auth_headers: dict, registered_user: dict
):
    user_id = registered_user["id"]
    notif_id = await _seed_notification(user_id, title="Mark me", message="read me")

    resp = await client.put(
        f"/api/v1/notifications/{notif_id}",
        json={"is_read": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True


async def test_get_notification_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/notifications/99999", headers=auth_headers)
    assert resp.status_code == 404


async def test_list_unread_only(
    client: AsyncClient, auth_headers: dict, registered_user: dict
):
    user_id = registered_user["id"]
    await _seed_notification(user_id, title="Unread")

    resp = await client.get(
        "/api/v1/notifications?unread_only=true", headers=auth_headers
    )
    assert resp.status_code == 200
    # All returned notifications must be unread
    for n in resp.json():
        assert n["is_read"] is False
