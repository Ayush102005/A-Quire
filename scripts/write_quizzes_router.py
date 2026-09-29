"""Helper: write quizzes.py router with proper UTF-8 encoding."""
import pathlib

target = pathlib.Path("d:/A-Quire/Backend/app/api/v1/quizzes.py")

code = """\
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.assessment import Question, QuizResponse, QuizSession, Topic
from app.models.student import User

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


class QuizQuestionOut(BaseModel):
    id: int
    question_text: str
    options: Any
    correct_answer: str

    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: int
    title: str
    subject: str | None
    questions: list[QuizQuestionOut]


class QuizResponseItem(BaseModel):
    question_id: int
    answer: str


class QuizSubmitRequest(BaseModel):
    responses: list[QuizResponseItem]


class QuizSubmitResponse(BaseModel):
    score: int
    total: int
    percentage: float
    session_id: int | None = None


@router.get("/{topic_id}", response_model=QuizOut, summary="Fetch quiz questions for a topic")
async def get_quiz(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
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

    quiz_questions = [
        QuizQuestionOut(
            id=q.id,
            question_text=q.content,
            options=q.options,
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
    current_user: User = Depends(get_current_user),
) -> Any:
    topic: Topic | None = (
        await db.execute(select(Topic).where(Topic.id == topic_id))
    ).scalar_one_or_none()

    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz topic not found")

    session = QuizSession(
        user_id=current_user.id,
        topic_id=topic_id,
        current_theta=0.0,
        is_active=False,
    )
    db.add(session)
    await db.flush()

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

        correct_value = question.options.get(question.correct_option, "")
        is_correct = resp.answer.strip() == correct_value.strip()

        if is_correct:
            score += 1

        selected_key: str | None = None
        for key, val in question.options.items():
            if val.strip() == resp.answer.strip():
                selected_key = key
                break

        db.add(QuizResponse(
            session_id=session.id,
            question_id=resp.question_id,
            is_correct=is_correct,
            selected_option=selected_key,
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
"""

target.write_text(code, encoding="utf-8")
print(f"Written {len(code)} bytes to {target}")
