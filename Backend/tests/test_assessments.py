import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.assessment import Topic, QuizSession, LearnerAbility, Question, QuizResponse
from app.models.course import Course
from unittest.mock import patch

@pytest.mark.asyncio
async def test_start_quiz_session_not_found(auth_client_student: AsyncClient):
    response = await auth_client_student.post(
        "/api/v1/assessments/start",
        json={"topic_id": 999}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Topic not found"

@pytest.mark.asyncio
async def test_start_quiz_session_success(auth_client_student: AsyncClient, db_session: AsyncSession):
    # Setup Topic
    topic = Topic(id=101, name="Test Topic 101", subject="Physics")
    db_session.add(topic)
    
    # Setup LearnerAbility
    ability = LearnerAbility(user_id=1, topic_id=101, theta=0.5)
    db_session.add(ability)
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/start",
        json={"topic_id": 101}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["topic_id"] == 101
    assert data["is_active"] is True

@pytest.mark.asyncio
async def test_start_quiz_session_persists_course_id(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=114, name="Test Topic 9", subject="Physics")
    course = Course(id=114, title="Course 114", instructor_id=2, is_published=True)
    db_session.add_all([topic, course])
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/start",
        json={"topic_id": 114, "course_id": 114}
    )
    assert response.status_code == 200
    assert response.json()["course_id"] == 114


@pytest.mark.asyncio
async def test_start_quiz_session_without_course_id_leaves_it_null(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=115, name="Test Topic 10", subject="Physics")
    db_session.add(topic)
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/start",
        json={"topic_id": 115}
    )
    assert response.status_code == 200
    assert response.json()["course_id"] is None


@pytest.mark.asyncio
async def test_get_next_question_no_session(auth_client_student: AsyncClient):
    response = await auth_client_student.get("/api/v1/assessments/999/next")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_next_question_inactive_session(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=102, name="Test Topic 102", subject="Physics")
    session = QuizSession(id=102, user_id=1, topic_id=102, current_theta=0.5, is_active=False)
    db_session.add_all([topic, session])
    await db_session.commit()
    await db_session.refresh(session)

    response = await auth_client_student.get(f"/api/v1/assessments/{session.id}/next")
    assert response.status_code == 200
    data = response.json()
    assert data["is_complete"] is True
    assert data["is_complete"] is True
    assert data["question"] is None

@pytest.mark.asyncio
async def test_submit_correct_answer_increases_theta(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=103, name="Test Topic 103", subject="Physics")
    session = QuizSession(id=103, user_id=1, topic_id=103, current_theta=0.0, is_active=True)
    question = Question(id=103, topic_id=103, content="Q1", options={"A": "A", "B": "B", "C": "C", "D": "D"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, question])
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 103, "question_id": 103, "selected_option": "A", "confidence": 3}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is True
    assert data["new_theta"] > 0.0  # Theta should increase
    assert data["new_theta"] <= 1.0  # Max change is 1.0

@pytest.mark.asyncio
async def test_submit_incorrect_answer_decreases_theta(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=104, name="Test Topic 2", subject="Physics")
    session = QuizSession(id=104, user_id=1, topic_id=104, current_theta=0.0, is_active=True)
    question = Question(id=104, topic_id=104, content="Q2", options={"A": "A", "B": "B"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, question])
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 104, "question_id": 104, "selected_option": "B", "confidence": 3}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is False
    assert data["new_theta"] < 0.0  # Theta should decrease
    assert data["new_theta"] >= -1.0 # Max change is -1.0

@pytest.mark.asyncio
async def test_theta_does_not_exceed_bounds(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=105, name="Test Topic 3", subject="Physics")
    # Start at upper bound
    session = QuizSession(id=105, user_id=1, topic_id=105, current_theta=4.0, is_active=True)
    question = Question(id=105, topic_id=105, content="Q3", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, question])
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 105, "question_id": 105, "selected_option": "A", "confidence": 3}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["new_theta"] == 4.0  # Clamped to 4.0

@pytest.mark.asyncio
async def test_duplicate_submission_idempotent(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=106, name="Test Topic 4", subject="Physics")
    session = QuizSession(id=106, user_id=1, topic_id=106, current_theta=0.5, is_active=True)
    question = Question(id=106, topic_id=106, content="Q4", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, question])
    await db_session.commit()

    # First submission
    resp1 = await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 106, "question_id": 106, "selected_option": "A", "confidence": 3}
    )
    theta1 = resp1.json()["new_theta"]

    # Duplicate submission
    resp2 = await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 106, "question_id": 106, "selected_option": "A", "confidence": 3}
    )
    theta2 = resp2.json()["new_theta"]

    assert theta1 == theta2  # Theta should not double-update
    
@pytest.mark.asyncio
async def test_next_question_deterministic(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=107, name="Test Topic 5", subject="Physics")
    session = QuizSession(id=107, user_id=1, topic_id=107, current_theta=0.0, is_active=True)
    # Two questions with identical parameters
    q1 = Question(id=107, topic_id=107, content="Q5", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    q2 = Question(id=108, topic_id=107, content="Q6", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, q1, q2])
    await db_session.commit()

    response = await auth_client_student.get("/api/v1/assessments/107/next")
    assert response.status_code == 200
    data = response.json()
    assert data["question"]["id"] == 107  # Tie-break by lower ID

@pytest.mark.asyncio
async def test_missing_item_parameters(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=109, name="Test Topic 6", subject="Physics")
    session = QuizSession(id=109, user_id=1, topic_id=109, current_theta=0.0, is_active=True)
    # Missing a and c
    q = Question(id=109, topic_id=109, content="Q7", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=None, guessing_c=None)
    db_session.add_all([topic, session, q])
    await db_session.commit()

    response = await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 109, "question_id": 109, "selected_option": "A", "confidence": 3}
    )
    assert response.status_code == 200
    # Should not crash, and should default a=1.0, c=0.0


@pytest.mark.asyncio
async def test_next_question_prefers_higher_information_over_closer_tier(
    auth_client_student: AsyncClient, db_session: AsyncSession,
):
    """
    Selection ranks purely on continuous Fisher information — not on
    difficulty_tier bucket matching. A highly discriminating item further
    from theta must be able to beat a low-discrimination item that's
    numerically closer, even when they fall in different legacy tiers.
    """
    topic = Topic(id=110, name="Test Topic 7", subject="Physics")
    session = QuizSession(id=110, user_id=1, topic_id=110, current_theta=0.0, is_active=True)
    # tier("medium"), close to theta, but low discrimination -> low info.
    q_close_low_disc = Question(
        id=110, topic_id=110, content="Close/low-info", options={"A": "A", "B": "B"},
        correct_option="A", difficulty_b=0.0, discrimination_a=0.3, guessing_c=0.0,
    )
    # tier("hard"), farther from theta, but high discrimination -> higher info.
    q_far_high_disc = Question(
        id=111, topic_id=110, content="Far/high-info", options={"A": "A", "B": "B"},
        correct_option="A", difficulty_b=1.0, discrimination_a=3.0, guessing_c=0.0,
    )
    db_session.add_all([topic, session, q_close_low_disc, q_far_high_disc])
    await db_session.commit()

    response = await auth_client_student.get("/api/v1/assessments/110/next")
    assert response.status_code == 200
    data = response.json()
    assert data["question"]["id"] == 111


@pytest.mark.asyncio
async def test_next_question_excludes_already_served(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=112, name="Test Topic 8", subject="Physics")
    session = QuizSession(id=112, user_id=1, topic_id=112, current_theta=0.0, is_active=True)
    q1 = Question(id=112, topic_id=112, content="Q1", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    q2 = Question(id=113, topic_id=112, content="Q2", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, q1, q2])
    await db_session.commit()

    # Answer q1 — it should no longer be eligible for selection afterward.
    await auth_client_student.post(
        "/api/v1/assessments/submit",
        json={"session_id": 112, "question_id": 112, "selected_option": "A", "confidence": 3}
    )

    response = await auth_client_student.get("/api/v1/assessments/112/next")
    assert response.status_code == 200
    data = response.json()
    assert data["question"]["id"] == 113

@pytest.mark.asyncio
async def test_next_question_excludes_invalid_irt_params(auth_client_student: AsyncClient, db_session: AsyncSession):
    topic = Topic(id=113, name="Invalid IRT", subject="Physics")
    session = QuizSession(id=113, user_id=1, topic_id=113, current_theta=0.0, is_active=True)
    q1 = Question(id=114, topic_id=113, content="Q1", options={"A": "A"}, correct_option="A", difficulty_b=None, discrimination_a=1.0, guessing_c=0.0)
    q2 = Question(id=115, topic_id=113, content="Q2", options={"A": "A"}, correct_option="A", difficulty_b=float('nan'), discrimination_a=1.0, guessing_c=0.0)
    q3 = Question(id=116, topic_id=113, content="Q3", options={"A": "A"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([topic, session, q1, q2, q3])
    await db_session.commit()

    response = await auth_client_student.get("/api/v1/assessments/113/next")
    assert response.status_code == 200
    data = response.json()
    assert data["question"]["id"] == 116  # Only q3 is valid


@pytest.mark.asyncio
@patch("app.services.adaptive_engine.generator_service.generate_question")
async def test_generation_respects_limits_and_sets_provisional(
    mock_generate, auth_client_student: AsyncClient, db_session: AsyncSession
):
    # Setup mock to return a generated question
    mock_generate.return_value = Question(
        topic_id=117, content="Gen Q", options={"A": "A"}, correct_option="A",
        difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.25, is_provisional=True,
    )

    topic = Topic(id=117, name="Gen Topic", subject="Physics")
    session = QuizSession(id=117, user_id=1, topic_id=117, current_theta=0.0, is_active=True)
    db_session.add_all([topic, session])
    await db_session.commit()

    # Turn on generation explicitly for this test
    from app.core.config import settings
    original_enabled = settings.AI_GENERATION_ENABLED
    settings.AI_GENERATION_ENABLED = True

    try:
        response = await auth_client_student.get("/api/v1/assessments/117/next")
        assert response.status_code == 200
        data = response.json()
        
        assert mock_generate.called
        assert data["question"]["is_provisional"] is True
        assert data["question"]["content"] == "Gen Q"
    finally:
        settings.AI_GENERATION_ENABLED = original_enabled
