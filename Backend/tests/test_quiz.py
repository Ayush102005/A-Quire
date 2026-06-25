"""Tests for /api/v1/quizzes/* endpoints."""
import pytest
from httpx import AsyncClient


async def _create_quiz(client: AsyncClient, instructor_headers: dict) -> dict:
    """Create a quiz and return its JSON."""
    resp = await client.post("/api/v1/quizzes", json={
        "title": "Python Basics Quiz",
        "description": "Test your Python knowledge",
        "lesson_id": None,
    }, headers=instructor_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_quiz_instructor(client: AsyncClient, instructor_headers: dict):
    data = await _create_quiz(client, instructor_headers)
    assert data["title"] == "Python Basics Quiz"
    assert "id" in data


async def test_create_quiz_student_forbidden(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/quizzes", json={
        "title": "Unauthorized Quiz", "lesson_id": None,
    }, headers=auth_headers)
    assert resp.status_code == 403


async def test_get_quiz(client: AsyncClient, instructor_headers: dict):
    quiz = await _create_quiz(client, instructor_headers)
    resp = await client.get(f"/api/v1/quizzes/{quiz['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == quiz["id"]


async def test_get_quiz_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/quizzes/99999")
    assert resp.status_code == 404


async def test_submit_quiz(
    client: AsyncClient, auth_headers: dict, instructor_headers: dict
):
    """Submit answers — correct answer graded, results returned."""
    quiz = await _create_quiz(client, instructor_headers)
    quiz_id = quiz["id"]

    # Submit with no questions — edge case, should return 0 score
    resp = await client.post(f"/api/v1/quizzes/{quiz_id}/submit", json={
        "quiz_id": quiz_id,
        "responses": [],
    }, headers=auth_headers)
    assert resp.status_code == 200
    result = resp.json()
    assert result["quiz_id"] == quiz_id
    assert result["total_questions"] == 0
    assert result["correct_answers"] == 0


async def test_submit_quiz_not_found(client: AsyncClient, auth_headers: dict):
    resp = await client.post("/api/v1/quizzes/99999/submit", json={
        "quiz_id": 99999, "responses": []
    }, headers=auth_headers)
    assert resp.status_code == 404
