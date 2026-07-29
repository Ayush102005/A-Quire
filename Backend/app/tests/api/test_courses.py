"""
tests/api/test_courses.py
──────────────────────────
Tests for /api/v1/courses/* endpoints:
  - List published courses (any user)
  - Create course (instructor only)
  - Get course detail
  - Add module to course
  - Add lesson to module
  - Publish / unpublish
  - Role enforcement (student cannot create courses)
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestListCourses:
    async def test_list_courses_no_auth(self, client: AsyncClient):
        """Public course listing works without auth."""
        resp = await client.get("/api/v1/courses/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_list_courses_with_auth(self, client: AsyncClient, student_headers: dict):
        resp = await client.get("/api/v1/courses/", headers=student_headers)
        assert resp.status_code == 200


@pytest.mark.asyncio
class TestCourseCreateAndDetail:
    async def test_instructor_can_create_course(
        self, client: AsyncClient, instructor_headers: dict
    ):
        resp = await client.post("/api/v1/courses", json={
            "title": "Introduction to Physics",
            "description": "Covers Newtonian mechanics and thermodynamics",
            "exam_category": "JEE",
        }, headers=instructor_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["title"] == "Introduction to Physics"
        assert "id" in data
        return data["id"]

    async def test_student_cannot_create_course(
        self, client: AsyncClient, student_headers: dict
    ):
        resp = await client.post("/api/v1/courses", json={
            "title": "Illegal Course",
            "description": "Students should not be able to do this",
        }, headers=student_headers)
        assert resp.status_code == 403

    async def test_create_course_unauthenticated(self, client: AsyncClient):
        resp = await client.post("/api/v1/courses", json={
            "title": "No Auth Course",
            "description": "Should fail",
        })
        assert resp.status_code == 403

    async def test_get_course_detail(
        self, client: AsyncClient, instructor_headers: dict, student_headers: dict
    ):
        # Create
        create = await client.post("/api/v1/courses", json={
            "title": "Detail Test Course",
            "description": "For detail test",
        }, headers=instructor_headers)
        assert create.status_code in (200, 201)
        course_id = create.json()["id"]

        # Get detail
        resp = await client.get(f"/api/v1/courses/{course_id}", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == course_id
        assert "modules" in data

    async def test_get_nonexistent_course(self, client: AsyncClient, student_headers: dict):
        resp = await client.get("/api/v1/courses/999999", headers=student_headers)
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestModulesAndLessons:
    async def _create_course(self, client, headers) -> int:
        r = await client.post("/api/v1/courses", json={
            "title": "Module Test Course",
            "description": "Testing modules",
        }, headers=headers)
        assert r.status_code in (200, 201)
        return r.json()["id"]

    async def test_add_module(self, client: AsyncClient, instructor_headers: dict):
        course_id = await self._create_course(client, instructor_headers)
        resp = await client.post(f"/api/v1/courses/{course_id}/modules", json={
            "title": "Chapter 1: Kinematics",
            "order": 1,
        }, headers=instructor_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["title"] == "Chapter 1: Kinematics"
        assert "id" in data

    async def test_add_lesson_to_module(self, client: AsyncClient, instructor_headers: dict):
        course_id = await self._create_course(client, instructor_headers)

        # Create module
        mod = await client.post(f"/api/v1/courses/{course_id}/modules", json={
            "title": "Module for Lesson",
            "order": 1,
        }, headers=instructor_headers)
        assert mod.status_code in (200, 201)
        module_id = mod.json()["id"]

        # Create lesson
        resp = await client.post(f"/api/v1/courses/modules/{module_id}/lessons", json={
            "title": "Lesson 1: Introduction",
            "video_url": "https://example.com/video.mp4",
            "order": 1,
            "lesson_type": "video",
        }, headers=instructor_headers)
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["title"] == "Lesson 1: Introduction"
        assert data["lesson_type"] == "video"


@pytest.mark.asyncio
class TestPublishUnpublish:
    async def test_publish_course(self, client: AsyncClient, instructor_headers: dict):
        # Create
        create = await client.post("/api/v1/courses", json={
            "title": "Publish Test",
            "description": "Testing publish",
        }, headers=instructor_headers)
        course_id = create.json()["id"]

        # Publish
        resp = await client.post(f"/api/v1/courses/{course_id}/publish", headers=instructor_headers)
        assert resp.status_code == 200
        assert resp.json().get("is_published") is True

    async def test_unpublish_course(self, client: AsyncClient, instructor_headers: dict):
        create = await client.post("/api/v1/courses", json={
            "title": "Unpublish Test",
            "description": "Testing unpublish",
        }, headers=instructor_headers)
        course_id = create.json()["id"]

        await client.post(f"/api/v1/courses/{course_id}/publish", headers=instructor_headers)
        resp = await client.post(f"/api/v1/courses/{course_id}/unpublish", headers=instructor_headers)
        assert resp.status_code == 200
        assert resp.json().get("is_published") is False
