"""
app/api/v1/quizzes.py
----------------------
Topic-based quiz endpoints consumed by SelfCheck.jsx.

GET  /quizzes/{topic_id}         - fetch all questions for a topic as a flat quiz
POST /quizzes/{topic_id}/submit  - record all responses and return a score
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_student_user
from app.models.assessment import Question, QuizResponse, QuizSession, Topic
from app.models.student import User

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


# -- Response schemas --------------------------------------------------------

class QuizQuestionOut(BaseModel):
    id: int
    question_text: str
    options: Any          # JSON dict from DB, e.g. {"A": "...", "B": "..."}
    correct_answer: str   # key of correct option, e.g. "A"

    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: int               # topic_id used as quiz id for simplicity
    title: str
    subject: str | None
    questions: list[QuizQuestionOut]


# -- Request schema ----------------------------------------------------------

class QuizResponseItem(BaseModel):
    question_id: int
    answer: str           # The option VALUE (text) selected by the student
    confidence: int | None = None


class QuizSubmitRequest(BaseModel):
    responses: list[QuizResponseItem]
    course_id: int | None = None  # course this quiz was launched from, if any — see QuizSession.course_id


class QuizSubmitResponse(BaseModel):
    score: int            # number of correct answers
    total: int
    percentage: float
    session_id: int | None = None


# -- Endpoints ---------------------------------------------------------------

@router.get("/{topic_id}", response_model=QuizOut, summary="Fetch quiz questions for a topic")
async def get_quiz(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_student_user),
) -> Any:
    """Return all questions for the given topic, shaped for SelfCheck.jsx."""
    topic: Topic | None = (
        await db.execute(select(Topic).where(Topic.id == topic_id))
    ).scalar_one_or_none()

    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz topic not found")

    questions_result = await db.execute(
        select(Question).where(Question.topic_id == topic_id)
    )
    questions = questions_result.scalars().all()

    if not questions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No questions found for this topic")

    # Map Question model to the shape SelfCheck.jsx expects
    quiz_questions = [
        QuizQuestionOut(
            id=q.id,
            question_text=q.content,
            options=q.options,          # already a dict (JSONB column)
            correct_answer=q.correct_option,
        )
        for q in questions
    ]

    return QuizOut(
        id=topic.id,
        title=topic.name,
        subject=topic.subject,
        questions=quiz_questions,
    )


@router.post("/{topic_id}/submit", response_model=QuizSubmitResponse, summary="Submit quiz answers")
async def submit_quiz(
    topic_id: int,
    body: QuizSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_student_user),
) -> Any:
    """
    Record all quiz responses against a new session and return a score.
    Answers are matched by comparing the submitted option VALUE against the
    correct option VALUE stored in the question.
    """
    topic: Topic | None = (
        await db.execute(select(Topic).where(Topic.id == topic_id))
    ).scalar_one_or_none()

    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz topic not found")

    # Create a lightweight session to group this submission
    session = QuizSession(
        user_id=current_user.id,
        topic_id=topic_id,
        course_id=body.course_id,
        current_theta=0.0,
        is_active=False,  # not an adaptive session -- just a record
    )
    db.add(session)
    await db.flush()

    # Fetch all questions to evaluate correctness
    question_ids = [r.question_id for r in body.responses]
    questions_result = await db.execute(
        select(Question).where(Question.id.in_(question_ids))
    )
    questions_by_id: dict[int, Question] = {
        q.id: q for q in questions_result.scalars().all()
    }

    score = 0
    for resp in body.responses:
        question = questions_by_id.get(resp.question_id)
        if not question:
            continue

        # Resolve the correct VALUE from the options dict
        correct_value = question.options.get(question.correct_option, "")
        is_correct = resp.answer.strip() == correct_value.strip()

        if is_correct:
            score += 1

        # Find the option KEY the student selected (reverse lookup)
        selected_key: str | None = None
        for key, val in question.options.items():
            if val.strip() == resp.answer.strip():
                selected_key = key
                break

        from app.services.confidence_adapter import get_difficulty_tier
        difficulty_tier = get_difficulty_tier(question.difficulty_b)

        db.add(QuizResponse(
            session_id=session.id,
            question_id=resp.question_id,
            is_correct=is_correct,
            selected_option=selected_key,
            confidence=resp.confidence,
            difficulty=difficulty_tier,
        ))

    await db.commit()

    total = len(body.responses)
    percentage = round((score / total) * 100, 1) if total > 0 else 0.0

    return QuizSubmitResponse(
        score=score,
        total=total,
        percentage=percentage,
        session_id=session.id,
    )
