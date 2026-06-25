"""Tests for /api/v1/courses/*, /api/v1/modules/*, /api/v1/lessons/* endpoints."""
import pytest
from httpx import AsyncClient


# ── Courses ───────────────────────────────────────────────────────────────────

async def test_create_course_instructor(client: AsyncClient, instructor_headers: dict):
    resp = await client.post("/api/v1/courses", json={
        "title": "Intro to ML", "description": "Machine learning basics"
    }, headers=instructor_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Intro to ML"
    assert data["modules"] == []


async def test_create_course_student_forbidden(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/courses", json={
        "title": "Unauthorized", "description": ""
    }, headers=auth_headers)
    assert resp.status_code == 403


async def test_list_courses(client: AsyncClient, instructor_headers: dict):
    create = await client.post("/api/v1/courses", json={
        "title": "Listed Course", "description": ""
    }, headers=instructor_headers)
    course_id = create.json()["id"]
    await client.post(f"/api/v1/courses/{course_id}/publish", headers=instructor_headers)

    resp = await client.get("/api/v1/courses")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 1


async def test_get_course(client: AsyncClient, instructor_headers: dict, auth_headers: dict):
    create = await client.post("/api/v1/courses", json={
        "title": "Fetchable", "description": ""
    }, headers=instructor_headers)
    course_id = create.json()["id"]
    await client.post(f"/api/v1/courses/{course_id}/publish", headers=instructor_headers)

    resp = await client.get(f"/api/v1/courses/{course_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == course_id


async def test_get_course_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/courses/99999", headers=auth_headers)
    assert resp.status_code == 404


async def test_update_course(client: AsyncClient, instructor_headers: dict):
    create = await client.post("/api/v1/courses", json={
        "title": "Old Title", "description": "old"
    }, headers=instructor_headers)
    course_id = create.json()["id"]

    resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "title": "New Title", "description": "updated"
    }, headers=instructor_headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


# ── Modules ───────────────────────────────────────────────────────────────────

async def test_create_module(client: AsyncClient, instructor_headers: dict):
    course = await client.post("/api/v1/courses", json={
        "title": "Module Test Course", "description": ""
    }, headers=instructor_headers)
    resp = await client.post("/api/v1/modules", json={
        "course_id": course.json()["id"],
        "title": "Module 1",
        "description": "First module",
        "order": 1,
    }, headers=instructor_headers)
    assert resp.status_code == 201
    assert resp.json()["title"] == "Module 1"


async def test_get_module_with_lessons(client: AsyncClient, instructor_headers: dict):
    course = await client.post("/api/v1/courses", json={
        "title": "Full Course", "description": ""
    }, headers=instructor_headers)
    module = await client.post("/api/v1/modules", json={
        "course_id": course.json()["id"], "title": "M1", "order": 1
    }, headers=instructor_headers)
    module_id = module.json()["id"]

    await client.post("/api/v1/lessons", json={
        "module_id": module_id, "title": "Lesson A",
        "order": 1, "duration_seconds": 600,
    }, headers=instructor_headers)

    resp = await client.get(f"/api/v1/modules/{module_id}")
    assert resp.status_code == 200
    assert len(resp.json()["lessons"]) == 1


# ── Lessons ───────────────────────────────────────────────────────────────────

async def test_create_lesson(client: AsyncClient, instructor_headers: dict):
    course = await client.post("/api/v1/courses", json={
        "title": "Lesson Course", "description": ""
    }, headers=instructor_headers)
    module = await client.post("/api/v1/modules", json={
        "course_id": course.json()["id"], "title": "M1", "order": 1
    }, headers=instructor_headers)

    resp = await client.post("/api/v1/lessons", json={
        "module_id": module.json()["id"],
        "title": "Lesson 1",
        "description": "Intro lesson",
        "video_url": "https://cdn.example.com/lesson1.mp4",
        "order": 1,
        "duration_seconds": 300,
    }, headers=instructor_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Lesson 1"
    assert data["video_url"] == "https://cdn.example.com/lesson1.mp4"


async def test_delete_lesson(client: AsyncClient, instructor_headers: dict):
    course = await client.post("/api/v1/courses", json={
        "title": "Del Course", "description": ""
    }, headers=instructor_headers)
    module = await client.post("/api/v1/modules", json={
        "course_id": course.json()["id"], "title": "M1", "order": 1
    }, headers=instructor_headers)
    lesson = await client.post("/api/v1/lessons", json={
        "module_id": module.json()["id"], "title": "To Delete",
        "order": 1, "duration_seconds": 60,
    }, headers=instructor_headers)
    lesson_id = lesson.json()["id"]

    del_resp = await client.delete(f"/api/v1/lessons/{lesson_id}", headers=instructor_headers)
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/lessons/{lesson_id}")
    assert get_resp.status_code == 404
