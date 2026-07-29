"""
tests/api/test_notifications.py
─────────────────────────────────
Tests for /api/v1/notifications/* endpoints:
  - GET  /notifications/           — list user notifications
  - PUT  /notifications/{id}       — mark one as read/unread (body: {"is_read": true})
  - POST /notifications/mark-all-read
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def _seed_notification(db: AsyncSession, user_id: int, title: str = "Test Notif") -> int:
    """Directly insert a Notification into the DB and return its id."""
    notif = Notification(user_id=user_id, title=title, message="Test message body")
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif.id


@pytest.mark.asyncio
class TestNotifications:
    async def test_list_notifications_empty(
        self, client: AsyncClient, student_headers: dict
    ):
        resp = await client.get("/api/v1/notifications/", headers=student_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_list_notifications_with_items(
        self,
        client: AsyncClient,
        student_headers: dict,
        db_session: AsyncSession,
    ):
        me = await client.get("/api/v1/auth/me", headers=student_headers)
        user_id = me.json()["id"]

        await _seed_notification(db_session, user_id, "Notif A")
        await _seed_notification(db_session, user_id, "Notif B")

        resp = await client.get("/api/v1/notifications/", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2

    async def test_mark_notification_read(
        self,
        client: AsyncClient,
        student_headers: dict,
        db_session: AsyncSession,
    ):
        me = await client.get("/api/v1/auth/me", headers=student_headers)
        user_id = me.json()["id"]
        notif_id = await _seed_notification(db_session, user_id, "Unread Notif")

        # Endpoint is PUT (not PATCH) with body {"is_read": true}
        resp = await client.put(
            f"/api/v1/notifications/{notif_id}",
            json={"is_read": True},
            headers=student_headers,
        )
        assert resp.status_code == 200
        assert resp.json().get("is_read") is True

    async def test_mark_all_read(
        self,
        client: AsyncClient,
        student_headers: dict,
        db_session: AsyncSession,
    ):
        me = await client.get("/api/v1/auth/me", headers=student_headers)
        user_id = me.json()["id"]
        await _seed_notification(db_session, user_id, "Batch A")
        await _seed_notification(db_session, user_id, "Batch B")

        resp = await client.post("/api/v1/notifications/mark-all-read", headers=student_headers)
        assert resp.status_code == 200

        # Verify all are now read
        list_resp = await client.get("/api/v1/notifications/", headers=student_headers)
        notifs = list_resp.json()
        unread = [n for n in notifs if not n.get("is_read")]
        assert len(unread) == 0

    async def test_notifications_require_auth(self, client: AsyncClient):
        resp = await client.get("/api/v1/notifications/")
        assert resp.status_code == 403

    async def test_cannot_read_other_users_notification(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
        db_session: AsyncSession,
    ):
        """Student should not be able to mark instructor's notification as read."""
        me = await client.get("/api/v1/auth/me", headers=instructor_headers)
        instructor_id = me.json()["id"]
        notif_id = await _seed_notification(db_session, instructor_id, "Instructor Notif")

        # Student tries to PUT (mark read) the instructor's notification
        resp = await client.put(
            f"/api/v1/notifications/{notif_id}",
            json={"is_read": True},
            headers=student_headers,
        )
        assert resp.status_code in (403, 404)
