"""Tests for /api/v1/struggles/* endpoints."""
import uuid
import pytest
from httpx import AsyncClient


def _unique_event_id() -> str:
    return str(uuid.uuid4())


# ── helpers ───────────────────────────────────────────────────────────────────

async def _create_course_and_lesson(client: AsyncClient, headers: dict) -> int:
    """Create course → module → lesson and return lesson_id."""
    course = await client.post("/api/v1/courses", json={
        "title": "Struggle Test Course", "description": "desc"
    }, headers=headers)
    course_id = course.json()["id"]

    module = await client.post("/api/v1/modules", json={
        "course_id": course_id, "title": "Module 1", "order": 1
    }, headers=headers)
    module_id = module.json()["id"]

    lesson = await client.post("/api/v1/lessons", json={
        "module_id": module_id, "title": "Lesson 1",
        "order": 1, "duration_seconds": 300,
    }, headers=headers)
    return lesson.json()["id"]


# ── tests ─────────────────────────────────────────────────────────────────────

async def test_ingest_struggle_event(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    lesson_id = await _create_course_and_lesson(client, instructor_headers)
    resp = await client.post("/api/v1/struggles/events", json={
        "client_event_id": _unique_event_id(),
        "lesson_id": lesson_id,
        "lesson_timestamp_ms": 45000,
        "struggle_score": 0.72,
        "fixation_duration_ms": 3500,
        "inactivity_duration_ms": 8000,
        "transcript_window_id": "tw-001",
    }, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["struggle_score"] == 0.72
    assert data["user_id"] is not None


async def test_duplicate_event_rejected(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    lesson_id = await _create_course_and_lesson(client, instructor_headers)
    event_id = _unique_event_id()
    payload = {
        "client_event_id": event_id, "lesson_id": lesson_id,
        "lesson_timestamp_ms": 1000, "struggle_score": 0.5,
    }
    r1 = await client.post("/api/v1/struggles/events", json=payload, headers=auth_headers)
    assert r1.status_code == 200
    r2 = await client.post("/api/v1/struggles/events", json=payload, headers=auth_headers)
    assert r2.status_code == 409


async def test_get_struggle_event(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    lesson_id = await _create_course_and_lesson(client, instructor_headers)
    create = await client.post("/api/v1/struggles/events", json={
        "client_event_id": _unique_event_id(), "lesson_id": lesson_id,
        "lesson_timestamp_ms": 2000, "struggle_score": 0.3,
    }, headers=auth_headers)
    event_id = create.json()["id"]

    resp = await client.get(f"/api/v1/struggles/events/{event_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == event_id


async def test_get_mentor_hint_all_levels(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    """All 5 hint levels must return a hint string with latency_ms.
    Bedrock falls back to static templates gracefully when AWS creds are absent."""
    lesson_id = await _create_course_and_lesson(client, instructor_headers)
    create = await client.post("/api/v1/struggles/events", json={
        "client_event_id": _unique_event_id(), "lesson_id": lesson_id,
        "lesson_timestamp_ms": 3000, "struggle_score": 0.8,
    }, headers=auth_headers)
    event_id = create.json()["id"]

    for level in ["basic", "intermediate", "advanced", "analogy", "hinglish"]:
        resp = await client.post(
            f"/api/v1/struggles/events/{event_id}/hint",
            json={"hint_level": level},
            headers=auth_headers,
        )
        assert resp.status_code == 200, f"Level '{level}' failed: {resp.text}"
        data = resp.json()
        assert "hint" in data, f"No 'hint' key for level '{level}'"
        assert isinstance(data["hint"], str) and len(data["hint"]) > 10
        assert data["hint_level"] == level
        assert "latency_ms" in data
        assert isinstance(data["latency_ms"], int)


async def test_hint_persisted_on_event(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    """After requesting a hint, GET /events/{id} should return the persisted hint."""
    lesson_id = await _create_course_and_lesson(client, instructor_headers)
    create = await client.post("/api/v1/struggles/events", json={
        "client_event_id": _unique_event_id(), "lesson_id": lesson_id,
        "lesson_timestamp_ms": 5000, "struggle_score": 0.6,
    }, headers=auth_headers)
    event_id = create.json()["id"]

    # Request hint
    await client.post(
        f"/api/v1/struggles/events/{event_id}/hint",
        json={"hint_level": "basic"},
        headers=auth_headers,
    )

    # Verify hint was persisted on the event
    get_resp = await client.get(f"/api/v1/struggles/events/{event_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["mentor_hint"] is not None
    assert data["mentor_hint_level"] == "basic"


async def test_struggle_event_requires_auth(client: AsyncClient):
    resp = await client.post("/api/v1/struggles/events", json={
        "client_event_id": _unique_event_id(), "lesson_id": 1,
        "lesson_timestamp_ms": 0, "struggle_score": 0.1,
    })
    assert resp.status_code == 401


async def test_hint_requires_auth(client: AsyncClient):
    resp = await client.post("/api/v1/struggles/events/1/hint", json={"hint_level": "basic"})
    assert resp.status_code == 401
