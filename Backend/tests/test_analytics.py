"""Tests for /api/v1/analytics/student endpoint."""
import pytest
from httpx import AsyncClient


async def test_student_analytics_empty(client: AsyncClient, auth_headers: dict):
    """Returns zeroed analytics for a fresh user."""
    resp = await client.get("/api/v1/analytics/student", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_lessons_completed"] == 0
    assert data["average_struggle_score"] == 0.0
    assert data["total_struggle_events"] == 0
    assert data["quiz_average_score"] == 0.0


async def test_analytics_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/analytics/student")
    assert resp.status_code == 401


async def test_analytics_after_progress(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    """Completed lesson shows up in analytics."""
    course = await client.post("/api/v1/courses", json={
        "title": "Analytics Course", "description": ""
    }, headers=instructor_headers)
    module = await client.post("/api/v1/modules", json={
        "course_id": course.json()["id"], "title": "M1", "order": 1
    }, headers=instructor_headers)
    lesson = await client.post("/api/v1/lessons", json={
        "module_id": module.json()["id"], "title": "L1",
        "order": 1, "duration_seconds": 100,
    }, headers=instructor_headers)
    lesson_id = lesson.json()["id"]

    # Mark as ≥90% complete
    await client.post(f"/api/v1/progress/{lesson_id}", json={
        "watched_seconds": 95, "completion_percent": 95.0,
    }, headers=auth_headers)

    resp = await client.get("/api/v1/analytics/student", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total_lessons_completed"] >= 1
