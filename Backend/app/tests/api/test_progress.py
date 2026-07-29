"""
tests/api/test_progress.py
───────────────────────────
Tests for /api/v1/progress/* endpoints:
  - POST /progress/{lesson_id}  — upsert lesson progress
  - GET  /progress/lesson/{lesson_id}
  - GET  /progress/course/{course_id}
  - GET  /progress/continue-learning
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestProgressTracking:
    async def _setup_course_and_lesson(
        self, client: AsyncClient, instructor_headers: dict
    ) -> tuple[int, int, int]:
        """Create course → module → lesson. Returns (course_id, module_id, lesson_id)."""
        course = await client.post("/api/v1/courses", json={
            "title": "Progress Test Course",
            "description": "For progress tests",
        }, headers=instructor_headers)
        assert course.status_code in (200, 201)
        course_id = course.json()["id"]

        mod = await client.post(f"/api/v1/courses/{course_id}/modules", json={
            "title": "Module 1",
            "order": 1,
        }, headers=instructor_headers)
        assert mod.status_code in (200, 201)
        module_id = mod.json()["id"]

        lesson = await client.post(f"/api/v1/courses/modules/{module_id}/lessons", json={
            "title": "Lesson 1",
            "video_url": "https://example.com/v1.mp4",
            "order": 1,
            "lesson_type": "video",
        }, headers=instructor_headers)
        assert lesson.status_code in (200, 201)
        lesson_id = lesson.json()["id"]

        return course_id, module_id, lesson_id

    async def test_upsert_progress(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        _, _, lesson_id = await self._setup_course_and_lesson(client, instructor_headers)

        resp = await client.post(f"/api/v1/progress/{lesson_id}", json={
            "watched_seconds": 120,
            "completion_percent": 25.0,
            "is_completed": False,
        }, headers=student_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["watched_seconds"] == 120
        assert data["completion_percent"] == 25.0

    async def test_upsert_progress_update(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        """Posting progress twice should update, not duplicate."""
        _, _, lesson_id = await self._setup_course_and_lesson(client, instructor_headers)

        await client.post(f"/api/v1/progress/{lesson_id}", json={
            "watched_seconds": 60,
            "completion_percent": 10.0,
            "is_completed": False,
        }, headers=student_headers)

        resp = await client.post(f"/api/v1/progress/{lesson_id}", json={
            "watched_seconds": 600,
            "completion_percent": 100.0,
            "is_completed": True,
        }, headers=student_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["watched_seconds"] == 600
        assert data["is_completed"] is True

    async def test_get_lesson_progress(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        _, _, lesson_id = await self._setup_course_and_lesson(client, instructor_headers)

        # Post first
        await client.post(f"/api/v1/progress/{lesson_id}", json={
            "watched_seconds": 300,
            "completion_percent": 50.0,
            "is_completed": False,
        }, headers=student_headers)

        resp = await client.get(f"/api/v1/progress/lesson/{lesson_id}", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["lesson_id"] == lesson_id

    async def test_continue_learning(
        self,
        client: AsyncClient,
        student_headers: dict,
        instructor_headers: dict,
    ):
        _, _, lesson_id = await self._setup_course_and_lesson(client, instructor_headers)

        await client.post(f"/api/v1/progress/{lesson_id}", json={
            "watched_seconds": 180,
            "completion_percent": 30.0,
            "is_completed": False,
        }, headers=student_headers)

        resp = await client.get("/api/v1/progress/continue-learning", headers=student_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_progress_requires_auth(self, client: AsyncClient):
        resp = await client.post("/api/v1/progress/1", json={
            "watched_seconds": 100,
            "completion_percent": 50.0,
            "is_completed": False,
        })
        assert resp.status_code == 403
