"""
tests/api/test_enrollments.py
───────────────────────────────
Tests for /api/v1/enrollments/* endpoints.

test_list_enrolled_after_enrolling is a regression test for a real bug:
GET /enrollments/ 500'd (MissingGreenlet) for any user with at least one
enrollment, because the query didn't eager-load Course.instructor before
CourseListItem serialization touched it. Passed fine with zero enrollments
(nothing to serialize), which is exactly why it went unnoticed.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestEnrollments:
    async def _create_published_course(self, client: AsyncClient, instructor_headers: dict) -> int:
        create = await client.post("/api/v1/courses", json={
            "title": "Enrollment Test Course",
            "description": "For enrollment tests",
        }, headers=instructor_headers)
        assert create.status_code in (200, 201)
        course_id = create.json()["id"]
        pub = await client.post(f"/api/v1/courses/{course_id}/publish", headers=instructor_headers)
        assert pub.status_code == 200
        return course_id

    async def test_list_enrolled_empty(self, client: AsyncClient, student_headers: dict):
        resp = await client.get("/api/v1/enrollments/", headers=student_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_enroll_and_list(
        self, client: AsyncClient, instructor_headers: dict, student_headers: dict
    ):
        course_id = await self._create_published_course(client, instructor_headers)

        enroll = await client.post(f"/api/v1/enrollments/{course_id}", headers=student_headers)
        assert enroll.status_code == 201

        # This is the call that used to 500 once a real enrollment (with a
        # real instructor attached to the course) existed to serialize.
        resp = await client.get("/api/v1/enrollments/", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == course_id
        assert data[0]["instructor_name"]  # eager-loaded, not None/omitted

    async def test_enroll_twice_conflicts(
        self, client: AsyncClient, instructor_headers: dict, student_headers: dict
    ):
        course_id = await self._create_published_course(client, instructor_headers)
        first = await client.post(f"/api/v1/enrollments/{course_id}", headers=student_headers)
        assert first.status_code == 201
        second = await client.post(f"/api/v1/enrollments/{course_id}", headers=student_headers)
        assert second.status_code == 409

    async def test_unenroll(
        self, client: AsyncClient, instructor_headers: dict, student_headers: dict
    ):
        course_id = await self._create_published_course(client, instructor_headers)
        await client.post(f"/api/v1/enrollments/{course_id}", headers=student_headers)

        resp = await client.delete(f"/api/v1/enrollments/{course_id}", headers=student_headers)
        assert resp.status_code == 204

        # student_headers is a session-scoped fixture (same user reused
        # across this whole test file, on a shared in-memory DB) — other
        # tests in this class enroll the same student in other courses and
        # don't unenroll, so the full list isn't necessarily empty here.
        # Just confirm this specific course is gone.
        listing = await client.get("/api/v1/enrollments/", headers=student_headers)
        assert course_id not in [c["id"] for c in listing.json()]
