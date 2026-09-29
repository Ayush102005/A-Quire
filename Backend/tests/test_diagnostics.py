import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.assessment import QuizResponse, QuizSession, Question
from unittest.mock import patch

@pytest.mark.asyncio
async def test_run_diagnostic_not_found(auth_client_student: AsyncClient):
    response = await auth_client_student.post(
        "/api/v1/assessments/responses/999/diagnostic",
        json={"student_explanation": "I thought it was B."}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Response not found"

@pytest.mark.asyncio
async def test_run_diagnostic_success(auth_client_student: AsyncClient, db_session: AsyncSession):
    session = QuizSession(user_id=1, topic_id=1, current_theta=0.5, is_active=True)
    db_session.add(session)
    await db_session.flush()

    question = Question(topic_id=1, content="What is gravity?", options={"A": "Force", "B": "Mass"}, correct_option="A", difficulty_b=0.5, discrimination_a=1.0)
    db_session.add(question)
    await db_session.flush()

    qr = QuizResponse(session_id=session.id, question_id=question.id, selected_option="B", is_correct=False)
    db_session.add(qr)
    await db_session.commit()
    await db_session.refresh(qr)

    with patch("app.api.v1.assessments.diagnostic_service.classify_and_generate_feedback") as mock_diag:
        mock_diag.return_value = ("Concept", "Gravity is a force, not mass.")
        
        response = await auth_client_student.post(
            f"/api/v1/assessments/responses/{qr.id}/diagnostic",
            json={"student_explanation": "I thought mass didn't matter."}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["feedback_message"] == "Gravity is a force, not mass."
        assert mock_diag.called
