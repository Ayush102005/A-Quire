"""Tests for /api/v1/progress/* endpoints."""
import pytest
from httpx import AsyncClient


async def _setup_lesson(client: AsyncClient, instructor_headers: dict) -> int:
    course = await client.post("/api/v1/courses", json={
        "title": "Progress Course", "description": "desc"
    }, headers=instructor_headers)
    module = await client.post("/api/v1/modules", json={
        "course_id": course.json()["id"], "title": "M1", "order": 1
    }, headers=instructor_headers)
    lesson = await client.post("/api/v1/lessons", json={
        "module_id": module.json()["id"], "title": "L1",
        "order": 1, "duration_seconds": 120,
    }, headers=instructor_headers)
    return lesson.json()["id"]


async def test_update_progress(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    lesson_id = await _setup_lesson(client, instructor_headers)
    resp = await client.post(f"/api/v1/progress/{lesson_id}", json={
        "watched_seconds": 60,
        "completion_percent": 50.0,
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["completion_percent"] == 50.0
    assert data["is_completed"] is False


async def test_progress_marks_complete_at_90(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    lesson_id = await _setup_lesson(client, instructor_headers)
    resp = await client.post(f"/api/v1/progress/{lesson_id}", json={
        "watched_seconds": 110,
        "completion_percent": 92.0,
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_completed"] is True


async def test_get_progress(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    lesson_id = await _setup_lesson(client, instructor_headers)
    await client.post(f"/api/v1/progress/{lesson_id}", json={
        "watched_seconds": 30, "completion_percent": 25.0,
    }, headers=auth_headers)

    resp = await client.get(f"/api/v1/progress/lesson/{lesson_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["lesson_id"] == lesson_id


async def test_get_progress_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/progress/lesson/99999", headers=auth_headers)
    assert resp.status_code == 404


async def test_progress_upsert(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    """Second POST to same lesson should update, not duplicate."""
    lesson_id = await _setup_lesson(client, instructor_headers)
    await client.post(f"/api/v1/progress/{lesson_id}", json={
        "watched_seconds": 10, "completion_percent": 10.0,
    }, headers=auth_headers)
    r2 = await client.post(f"/api/v1/progress/{lesson_id}", json={
        "watched_seconds": 80, "completion_percent": 80.0,
    }, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["completion_percent"] == 80.0
