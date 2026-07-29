import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.api.deps import get_current_user
from app.models.student import User

# Mock user for dependency override
mock_user = User(id=1, email="test@example.com", role="student", is_active=True)

@pytest.fixture
def override_get_current_user():
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def client(override_get_current_user):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def token_headers():
    return {"Authorization": "Bearer mocked-token"}

@pytest.mark.asyncio
async def test_manual_struggle_trigger(client: AsyncClient, token_headers: dict):
    # Test that clicking "Ask mentor" successfully returns an event and opens the door to fetch a hint
    payload = {
        "student_id": 1,
        "client_event_id": "test-manual-event-123",
        "lesson_id": 1,
        "struggle_type": "manual",
        "lesson_timestamp_ms": 5000,
        "struggle_score": 1.0,
        "manual_trigger": True,
        "inactivity_duration_ms": 0,
        "fixation_duration_ms": 0,
        "gaze_off_screen_ms": 0,
        "transcript_window_id": None
    }
    
    response = await client.post(
        "/api/v1/struggle/monitor",
        json=payload,
        headers=token_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["detected"] is True
    assert "event_id" in data
    assert data["intervention_level"] == "hint"

@pytest.mark.asyncio
async def test_gaze_inactivity_trigger(client: AsyncClient, token_headers: dict):
    # Test that gaze inactivity correctly flags a struggle
    payload = {
        "student_id": 1,
        "client_event_id": "test-gaze-event-456",
        "lesson_id": 1,
        "struggle_type": "behavioral",
        "lesson_timestamp_ms": 15000,
        "struggle_score": 0.5,
        "manual_trigger": False,
        "inactivity_duration_ms": 0,
        "fixation_duration_ms": 0,
        "gaze_off_screen_ms": 12000,  # Over 10 seconds triggers the gaze rule
        "transcript_window_id": None
    }
    
    response = await client.post(
        "/api/v1/struggle/monitor",
        json=payload,
        headers=token_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["detected"] is True
    assert data["intervention_level"] == "overlay"
