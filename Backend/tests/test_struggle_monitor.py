import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.struggle_event import StruggleEvent
from unittest.mock import patch

@pytest.mark.asyncio
async def test_monitor_struggle_forbidden(auth_client_instructor: AsyncClient):
    response = await auth_client_instructor.post(
        "/api/v1/struggle/monitor",
        json={
            "student_id": 999,
            "lesson_id": 1,
            "struggle_score": 0.8,
            "fixation_duration_ms": 5000,
            "inactivity_duration_ms": 0,
            "lesson_timestamp_ms": 10000,
            "transcript_window_id": 1
        }
    )
    # The instructor cannot post struggle on behalf of student 999
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_monitor_struggle_success(auth_client_student: AsyncClient):
    response = await auth_client_student.post(
        "/api/v1/struggle/monitor",
        json={
            "student_id": 1,
            "course_id": 1,
            "lesson_id": 1,
            "struggle_score": 0.8,
            "fixation_duration_ms": 10000,
            "inactivity_duration_ms": 0,
            "lesson_timestamp_ms": 10000,
            "transcript_window_id": "1",
            "client_event_id": "test3",
            "context_type": "video"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["detected"] is True
    assert data["status"] == "new"

@pytest.mark.asyncio
async def test_list_struggle_events(auth_client_student: AsyncClient, db_session: AsyncSession):
    event = StruggleEvent(
        user_id=1,
        lesson_id=1,
        struggle_score=0.9,
        fixation_duration_ms=6000,
        inactivity_duration_ms=0,
        lesson_timestamp_ms=20000,
        client_event_id="test1",
    )
    db_session.add(event)
    await db_session.commit()

    response = await auth_client_student.get("/api/v1/struggle/events")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["lesson_id"] == 1
    assert data[0]["severity"] == 0.0

@pytest.mark.asyncio
async def test_get_struggle_hint_not_found(auth_client_student: AsyncClient):
    response = await auth_client_student.post(
        "/api/v1/struggle/events/999/hint",
        json={"hint_level": "basic"}
    )
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_struggle_hint_success(auth_client_student: AsyncClient, db_session: AsyncSession):
    event = StruggleEvent(
        user_id=1,
        lesson_id=1,
        struggle_score=0.9,
        fixation_duration_ms=6000,
        inactivity_duration_ms=0,
        lesson_timestamp_ms=20000,
        transcript_window_id="1",
        client_event_id="test2",
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)

    with patch("app.api.v1.struggle_monitor.generate_hint") as mock_generate:
        mock_generate.return_value = "This is a mock hint."
        response = await auth_client_student.post(
            f"/api/v1/struggle/events/{event.id}/hint",
            json={"hint_level": "basic"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["hint_text"] == "This is a mock hint."
        assert mock_generate.called
