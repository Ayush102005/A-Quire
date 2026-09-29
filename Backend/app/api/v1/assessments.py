"""
app/api/v1/assessments.py
─────────────────────────
API endpoints for the Adaptive Engine (AMATTA).
"""
from __future__ import annotations

import asyncio
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload

from app.api.deps.auth import get_current_user
from app.api.deps.roles import get_student_user
from app.api.deps import get_db
from app.core.rate_limit import rate_limit
from app.models.student import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.assessment import Topic, LearnerAbility, QuizSession, Question, QuizResponse
from app.schemas.assessment import (
    QuizSessionCreate,
    QuizSessionResponse,
    QuestionResponse,
    QuestionNextResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    DiagnosticRequest,
    DiagnosticResponse
)
from app.services.adaptive_engine import adaptive_engine
from app.services.diagnostic_service import diagnostic_service
from app.core.websocket_manager import ws_manager
from app.tasks.analytics import log_learner_state

router = APIRouter(prefix="/assessments", tags=["assessments"])


async def _get_exam_category(db: AsyncSession, course_id: int | None) -> str | None:
    """Resolve the exam category (GATE/JEE/NEET/...) a session's marks should
    follow, from its launching Course — see AdaptiveEngine.compute_marks."""
    if course_id is None:
        return None
    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    return course.exam_category if course else None


@router.post("/start", response_model=QuizSessionResponse)
async def start_quiz_session(
    request: QuizSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_student_user)
) -> Any:
    """
    Start a new adaptive quiz session for a given topic, optionally scoped
    to a course (drives course-scoped instructor analytics — see
    app/api/v1/instructor_analytics.py). course_id is not an access-control
    check (enrollment already governs that elsewhere); it's purely
    attribution for analytics.
    """
    # 1. Resolve topic
    topic = None
    if request.topic_id:
        topic = (await db.execute(select(Topic).where(Topic.id == request.topic_id))).scalar_one_or_none()
    
    if not topic and request.module_id:
        from app.models.module import Module
        module = (await db.execute(select(Module).where(Module.id == request.module_id))).scalar_one_or_none()
        if module:
            topic_name = module.title
            topic = (await db.execute(select(Topic).where(Topic.name == topic_name))).scalar_one_or_none()
            if not topic:
                topic = Topic(name=topic_name, subject="Adaptive Assessment")
                db.add(topic)
                await db.commit()
                await db.refresh(topic)

    if not topic and request.topic_name:
        topic = (await db.execute(select(Topic).where(Topic.name == request.topic_name))).scalar_one_or_none()
        if not topic:
            topic = Topic(name=request.topic_name, subject="Adaptive Assessment")
            db.add(topic)
            await db.commit()
            await db.refresh(topic)

    if not topic:
        if request.topic_id:
            # topic_id was explicitly supplied but didn't resolve to a real
            # Topic — distinct from the "nothing usable was provided" case
            # below, which is a client validation error, not a lookup miss.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide valid topic_id, module_id, or topic_name")

    # 1.5 Verify the course exists, if one was supplied
    if request.course_id is not None:
        course = (await db.execute(select(Course).where(Course.id == request.course_id))).scalar_one_or_none()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # 1.6 Verify the lesson exists, if one was supplied — its transcript (if
    # any) grounds AI-generated questions instead of only the topic name.
    if request.lesson_id is not None:
        lesson = (await db.execute(select(Lesson).where(Lesson.id == request.lesson_id))).scalar_one_or_none()
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    # 2. Get current ability (theta) or default to 0.0
    ability = (await db.execute(
        select(LearnerAbility).where(
            and_(LearnerAbility.user_id == current_user.id, LearnerAbility.topic_id == topic.id)
        )
    )).scalar_one_or_none()

    current_theta = ability.theta if ability else 0.0

    # Cache before the session commit below — that commit expires every
    # object in the session (SQLAlchemy's default expire_on_commit), and a
    # plain attribute access on an expired object afterward (topic.name)
    # tries to lazily reload it, which raises MissingGreenlet under async
    # SQLAlchemy outside the commit's own await context.
    topic_name = topic.name

    # 3. Create Session
    session = QuizSession(
        user_id=current_user.id,
        topic_id=topic.id,
        course_id=request.course_id,
        lesson_id=request.lesson_id,
        module_id=request.module_id,
        current_theta=current_theta,
        is_active=True
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return QuizSessionResponse(
        id=session.id,
        topic_id=session.topic_id,
        topic_name=topic_name,
        course_id=session.course_id,
        lesson_id=session.lesson_id,
        is_active=session.is_active,
    )


@router.get("/{session_id}/next", response_model=QuestionNextResponse)
async def get_next_question(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_student_user)
) -> Any:
    """
    Get the next most optimal adaptive question for the current session.
    Returns a wrapper { question, is_complete } so the frontend can handle
    session completion cleanly.
    """
    # Verify session belongs to user
    session = (await db.execute(select(QuizSession).where(QuizSession.id == session_id))).scalar_one_or_none()
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
    if not session.is_active:
        return QuestionNextResponse(question=None, is_complete=True)

    # Cache before get_next_question() — when it generates a new question it
    # commits internally, which expires every object already loaded on this
    # AsyncSession (including `session` here), so a later plain attribute
    # access like session.course_id would trigger a lazy-reload that raises
    # MissingGreenlet outside that commit's own await context.
    session_course_id = session.course_id

    next_q = await adaptive_engine.get_next_question(db, session_id)
    if not next_q:
        # Mark session as complete if no more questions
        session.is_active = False
        await db.commit()
        return QuestionNextResponse(question=None, is_complete=True)

    exam_category = await _get_exam_category(db, session_course_id)
    question_resp = QuestionResponse.model_validate(next_q)
    question_resp.marks = adaptive_engine.compute_marks(next_q.difficulty_b, exam_category, is_correct=True)

    return QuestionNextResponse(
        question=question_resp,
        is_complete=False
    )


@router.post("/submit", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_student_user)
) -> Any:
    """
    Submit an answer to a question, updating the user's ability estimate.
    """
    # Verify session
    session = (await db.execute(select(QuizSession).where(QuizSession.id == request.session_id))).scalar_one_or_none()
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
    # Verify question
    question = (await db.execute(select(Question).where(Question.id == request.question_id))).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    # Check correctness
    is_correct = (request.selected_option == question.correct_option)
    
    # Cache attributes before the engine commits and expires the objects
    correct_option = question.correct_option
    difficulty_b = question.difficulty_b
    session_topic_id = session.topic_id
    session_course_id = session.course_id
    question_id = question.id

    exam_category = await _get_exam_category(db, session_course_id)
    marks_earned = adaptive_engine.compute_marks(difficulty_b, exam_category, is_correct)

    # Process answer via AMATTA — returns (new_theta, response_id)
    new_theta, response_id = await adaptive_engine.process_answer(
        db=db,
        session_id=request.session_id,
        question_id=question.id,
        is_correct=is_correct,
        selected_option=request.selected_option,
        confidence=request.confidence,
        error_type=None
    )
    
    # Trigger Celery background task for analytics — best-effort, must never
    # slow down or block answer submission. `.delay()` is synchronous and,
    # if the broker is unreachable (e.g. no Redis running in dev), the
    # underlying kombu connection can retry for MINUTES before it finally
    # raises — a plain try/except doesn't help since that's exactly how long
    # it blocks *before* raising. Running it in a thread with a hard timeout
    # bounds the wait regardless of what the Celery client does internally
    # (celery_app.py's connection-timeout settings are the first line of
    # defense; this is the backstop for this specific call).
    try:
        await asyncio.wait_for(
            asyncio.to_thread(
                log_learner_state.delay,
                user_id=current_user.id,
                session_id=request.session_id,
                topic_id=session_topic_id,
                theta=new_theta,
                event_type="answer_submitted",
                metrics={"question_id": question_id, "is_correct": is_correct},
            ),
            timeout=5,
        )
    except Exception:  # noqa: BLE001 — Redis may not be running in dev, or the call timed out
        pass
    
    # Check if assessment should end
    # We defer calling get_next_question to the /next endpoint so that
    # checking the answer is instantaneous.
    session_complete = False
    
    response = SubmitAnswerResponse(
        is_correct=is_correct,
        correct_option=correct_option,
        new_theta=new_theta,
        response_id=response_id,
        diagnostic_triggered=not is_correct,
        is_complete=session_complete,
        question=None,
        marks_earned=marks_earned,
    )
    
    if not is_correct:
        response.message = "Answer was incorrect. Diagnostic loop triggered."
        try:
            await ws_manager.broadcast_to_user(
                current_user.id,
                {"type": "hint", "message": "Diagnostic loop triggered. Need a hint?", "question_id": question_id}
            )
        except Exception:
            pass  # notification push is best-effort — must never fail answer submission
    else:
        response.message = "Correct!"
        
    return response


@router.post("/responses/{response_id}/diagnostic", response_model=DiagnosticResponse)
async def run_diagnostic(
    response_id: int,
    request: DiagnosticRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_student_user),
    _rl: None = rate_limit(15, 60),  # 15 diagnostics / minute per IP — each costs a Claude call
) -> Any:
    """
    Submit a student's explanation for a wrong answer to get AI classification and feedback.
    """
    # Verify response — and that it belongs to a session owned by the caller.
    # Without this check, any authenticated student could pass an arbitrary
    # response_id and both read AND overwrite (student_explanation, error_type,
    # feedback_provided below) another student's quiz response record.
    quiz_resp = (
        await db.execute(
            select(QuizResponse)
            .options(joinedload(QuizResponse.question), joinedload(QuizResponse.session))
            .where(QuizResponse.id == response_id)
        )
    ).scalar_one_or_none()

    if not quiz_resp or quiz_resp.session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Response not found")

    if quiz_resp.is_correct:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Diagnostic loop is only for incorrect answers")
        
    question = quiz_resp.question
    
    # Call Diagnostic Service
    error_type, feedback_message = await diagnostic_service.classify_and_generate_feedback(
        question=question.content,
        options=question.options,
        correct_option=question.correct_option,
        selected_option=quiz_resp.selected_option or "",
        student_explanation=request.student_explanation
    )
    
    # Update DB
    quiz_resp.error_type = error_type
    quiz_resp.student_explanation = request.student_explanation
    quiz_resp.feedback_provided = feedback_message
    
    await db.commit()
    
    return DiagnosticResponse(
        error_type=error_type,
        feedback_message=feedback_message
    )
