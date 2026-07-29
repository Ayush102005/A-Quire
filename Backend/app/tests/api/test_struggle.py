"""
tests/api/test_struggle.py
───────────────────────────
Tests for /api/v1/struggle/* endpoints — the core AI mentor feature:
  - POST /struggle/monitor    — submit struggle signals → StruggleMonitorResult
  - GET  /struggle/events     — list student's struggle events
  - GET  /struggle/events/{id}
  - POST /struggle/events/{id}/hint — generate AI hint (uses template fallback)

Actual schema contracts (from app/schemas/struggle_monitor.py):
  StruggleMonitorInput: student_id, lesson_id, idle_seconds, rewatch_count,
                        pause_count, fixation_duration_ms, inactivity_duration_ms,
                        struggle_score, context_type, ...
  StruggleMonitorResult: detected (bool), event_id (int|None), event_type,
                         severity, confidence_score, status, message
  HintRequest:  hint_level — must be "basic" | "detailed" | "example"
  HintResponse: event_id, hint_text, hint_level
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestStruggleMonitor:
    async def _get_student_id(self, client: AsyncClient, headers: dict) -> int:
        resp = await client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 200
        return resp.json()["id"]

    async def _create_lesson(
        self, client: AsyncClient, instructor_headers: dict
    ) -> int:
        course = await client.post("/api/v1/courses", json={
            "title": "Struggle Test Course",
            "description": "For struggle tests",
        }, headers=instructor_headers)
        course_id = course.json()["id"]

        mod = await client.post(f"/api/v1/courses/{course_id}/modules", json={
            "title": "Module 1", "order": 1,
        }, headers=instructor_headers)
        module_id = mod.json()["id"]

        lesson = await client.post(f"/api/v1/courses/modules/{module_id}/lessons", json={
            "title": "Struggle Lesson",
            "video_url": "https://example.com/vid.mp4",
            "order": 1,
            "lesson_type": "video",
        }, headers=instructor_headers)
        return lesson.json()["id"]

    def _monitor_payload(self, student_id: int, lesson_id: int) -> dict:
        """Build a valid StruggleMonitorInput payload."""
        return {
            "student_id": student_id,
            "lesson_id": lesson_id,
            "idle_seconds": 60,
            "rewatch_count": 2,
            "pause_count": 3,
            "fixation_duration_ms": 8000,
            "inactivity_duration_ms": 15000,
            "lesson_timestamp_ms": 120000,
            "struggle_score": 0.75,
            "context_type": "video",
            "completion_percent": 30.0,
        }

    async def test_monitor_struggle_event(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        student_id = await self._get_student_id(client, student_headers)
        lesson_id = await self._create_lesson(client, instructor_headers)

        resp = await client.post(
            "/api/v1/struggle/monitor",
            json=self._monitor_payload(student_id, lesson_id),
            headers=student_headers,
        )

        assert resp.status_code == 200
        data = resp.json()
        # StruggleMonitorResult fields
        assert "detected" in data
        assert isinstance(data["detected"], bool)
        assert "status" in data
        assert "message" in data

    async def test_monitor_wrong_student_id_rejected(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        """Student cannot submit events on behalf of another user."""
        lesson_id = await self._create_lesson(client, instructor_headers)

        resp = await client.post("/api/v1/struggle/monitor", json={
            **self._monitor_payload(99999, lesson_id),
            "student_id": 99999,  # wrong ID
        }, headers=student_headers)
        assert resp.status_code == 403

    async def test_monitor_requires_auth(self, client: AsyncClient):
        resp = await client.post("/api/v1/struggle/monitor", json={
            "student_id": 1,
            "lesson_id": 1,
            "struggle_score": 0.5,
        })
        assert resp.status_code == 403

    async def test_list_struggle_events(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        student_id = await self._get_student_id(client, student_headers)
        lesson_id = await self._create_lesson(client, instructor_headers)

        # Trigger a struggle event that gets detected (high values)
        payload = self._monitor_payload(student_id, lesson_id)
        payload["struggle_score"] = 1.0
        payload["idle_seconds"] = 300
        await client.post("/api/v1/struggle/monitor", json=payload, headers=student_headers)

        resp = await client.get("/api/v1/struggle/events", headers=student_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
class TestHintGeneration:
    async def _create_struggle_event_id(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ) -> int | None:
        """Trigger monitoring and return event_id (may be None if not detected)."""
        me = await client.get("/api/v1/auth/me", headers=student_headers)
        student_id = me.json()["id"]

        # Build lesson
        course = await client.post("/api/v1/courses", json={
            "title": "Hint Test Course", "description": "For hint test",
        }, headers=instructor_headers)
        course_id = course.json()["id"]

        mod = await client.post(f"/api/v1/courses/{course_id}/modules", json={
            "title": "Mod", "order": 1,
        }, headers=instructor_headers)
        module_id = mod.json()["id"]

        lesson = await client.post(f"/api/v1/courses/modules/{module_id}/lessons", json={
            "title": "Hint Lesson",
            "video_url": "https://example.com/hint.mp4",
            "order": 1,
            "lesson_type": "video",
        }, headers=instructor_headers)
        lesson_id = lesson.json()["id"]

        monitor = await client.post("/api/v1/struggle/monitor", json={
            "student_id": student_id,
            "lesson_id": lesson_id,
            "idle_seconds": 600,
            "rewatch_count": 5,
            "pause_count": 8,
            "fixation_duration_ms": 20000,
            "inactivity_duration_ms": 30000,
            "lesson_timestamp_ms": 300000,
            "struggle_score": 1.0,
            "context_type": "video",
            "completion_percent": 10.0,
            "manual_trigger": True,
        }, headers=student_headers)

        assert monitor.status_code == 200
        return monitor.json().get("event_id")

    async def test_generate_hint(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        event_id = await self._create_struggle_event_id(client, student_headers, instructor_headers)

        if event_id is None:
            # Struggle not detected (threshold not met) — get the latest event from list
            events_resp = await client.get("/api/v1/struggle/events", headers=student_headers)
            events = events_resp.json()
            if not events:
                pytest.skip("No struggle events created — threshold not met")
            event_id = events[-1]["id"]

        # hint_level must be "basic" | "detailed" | "example"
        resp = await client.post(f"/api/v1/struggle/events/{event_id}/hint", json={
            "hint_level": "basic",
        }, headers=student_headers)

        assert resp.status_code == 200
        data = resp.json()
        assert "hint_text" in data
        assert len(data["hint_text"]) > 10
        assert data["event_id"] == event_id

    async def test_hint_nonexistent_event(self, client: AsyncClient, student_headers: dict):
        resp = await client.post("/api/v1/struggle/events/999999/hint", json={
            "hint_level": "basic",  # must match pattern: basic|detailed|example
        }, headers=student_headers)
        assert resp.status_code == 404
