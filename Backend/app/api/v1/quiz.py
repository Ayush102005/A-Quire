from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user_id, require_role
from app.models.quiz import Quiz, QuizQuestion, QuizResponse as QuizResponseORM
from app.schemas.quiz import (
    QuizCreate,
    QuizResponse as QuizResponseSchema,
    QuizSubmit,
    QuizResultResponse,
)
from app.utils.exceptions import NotFoundException

router = APIRouter()


@router.post(
    "",
    response_model=QuizResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a quiz",
)
async def create_quiz(
    quiz: QuizCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "instructor")),
) -> QuizResponseSchema:
    """
    Create a new quiz (admin/instructor only).
    - **title**: Quiz title
    - **description**: Optional description
    - **lesson_id**: Optional lesson association
    """
    new_quiz = Quiz(
        title=quiz.title,
        description=quiz.description,
        lesson_id=quiz.lesson_id,
    )
    db.add(new_quiz)
    await db.commit()
    await db.refresh(new_quiz)
    # Reload with questions
    stmt = select(Quiz).options(selectinload(Quiz.questions)).where(Quiz.id == new_quiz.id)
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get(
    "/{quiz_id}",
    response_model=QuizResponseSchema,
    summary="Get a quiz",
)
async def get_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
) -> QuizResponseSchema:
    """Get a quiz by ID including all questions."""
    stmt = (
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    result = await db.execute(stmt)
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise NotFoundException("Quiz not found")

    return quiz


@router.post(
    "/{quiz_id}/submit",
    response_model=QuizResultResponse,
    summary="Submit quiz answers",
)
async def submit_quiz(
    quiz_id: int,
    submission: QuizSubmit,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> QuizResultResponse:
    """
    Submit answers for a quiz.

    Each response maps **question_id → answer**.
    Returns the score and correctness breakdown.
    """
    stmt = (
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .where(Quiz.id == quiz_id)
    )
    result = await db.execute(stmt)
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise NotFoundException("Quiz not found")

    total_questions = len(quiz.questions)
    correct_count = 0
    total_score = 0.0

    for response in submission.responses:
        q_stmt = select(QuizQuestion).where(QuizQuestion.id == response.question_id)
        q_result = await db.execute(q_stmt)
        question = q_result.scalar_one_or_none()

        if not question:
            continue

        is_correct = response.answer.strip() == (question.correct_answer or "").strip()
        score_val = 1.0 if is_correct else 0.0

        if is_correct:
            correct_count += 1
            total_score += 1.0

        # Persist the response
        quiz_response = QuizResponseORM(
            user_id=user_id,
            quiz_id=quiz_id,
            question_id=response.question_id,
            answer=response.answer,
            is_correct=is_correct,
            score=score_val,
        )
        db.add(quiz_response)

    await db.commit()

    return QuizResultResponse(
        quiz_id=quiz_id,
        score=total_score / total_questions if total_questions else 0.0,
        total_questions=total_questions,
        correct_answers=correct_count,
    )
