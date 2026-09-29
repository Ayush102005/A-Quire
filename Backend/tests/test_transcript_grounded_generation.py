"""
Regression coverage for grounding AMATTA-generated questions in the lesson
video's transcript instead of only the topic name.

QuizSession gained a nullable lesson_id (see the 'c4d5e6f7a8b9' migration).
When a session was started from a specific lesson and that lesson has a
transcript, adaptive_engine.get_next_question must pass it through to
generator_service.generate_question so the LLM prompt is grounded in what
was actually said in the video, while still targeting the algorithm's
continuous IRT difficulty (target_b) — see generate_question's own tests in
test_generator_service.py for the prompt-construction behavior itself.
"""
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.module import Module
from app.models.lesson import Lesson
from app.models.assessment import Topic, QuizSession
from app.services.adaptive_engine import AdaptiveEngine
from app.services import generation_budget


@pytest.mark.asyncio
async def test_get_next_question_passes_lesson_transcript_to_generator(
    db_session: AsyncSession, monkeypatch,
):
    generation_budget.reset_generation_budget()
    base_id = 501

    topic = Topic(id=base_id, name=f"Transcript Topic {base_id}", subject="Test")
    db_session.add(topic)

    course = Course(id=base_id, title="Transcript Course", instructor_id=base_id, is_published=True)
    db_session.add(course)
    await db_session.flush()

    module = Module(id=base_id, course_id=course.id, title="Module", order=1)
    db_session.add(module)
    await db_session.flush()

    transcript = [{"id": 1, "start": 0.0, "end": 3.0, "text": "This video explains recursion."}]
    lesson = Lesson(id=base_id, module_id=module.id, title="Lesson", order=1, transcript=transcript)
    db_session.add(lesson)
    await db_session.flush()

    # No questions exist for this topic — forces the "no eligible items" generation path.
    session = QuizSession(
        id=base_id, user_id=base_id, topic_id=topic.id, lesson_id=lesson.id,
        current_theta=0.0, is_active=True,
    )
    db_session.add(session)
    await db_session.commit()

    fake_generate = AsyncMock(return_value=None)
    monkeypatch.setattr("app.services.adaptive_engine.generator_service.generate_question", fake_generate)

    await AdaptiveEngine.get_next_question(db_session, base_id)

    fake_generate.assert_awaited_once()
    assert fake_generate.await_args.kwargs["transcript"] == transcript


@pytest.mark.asyncio
async def test_get_next_question_omits_transcript_without_a_lesson(
    db_session: AsyncSession, monkeypatch,
):
    generation_budget.reset_generation_budget()
    base_id = 511

    topic = Topic(id=base_id, name=f"No Lesson Topic {base_id}", subject="Test")
    db_session.add(topic)
    await db_session.flush()

    # No lesson_id — standalone topic practice (e.g. via SelfCheck).
    session = QuizSession(
        id=base_id, user_id=base_id, topic_id=topic.id, lesson_id=None,
        current_theta=0.0, is_active=True,
    )
    db_session.add(session)
    await db_session.commit()

    fake_generate = AsyncMock(return_value=None)
    monkeypatch.setattr("app.services.adaptive_engine.generator_service.generate_question", fake_generate)

    await AdaptiveEngine.get_next_question(db_session, base_id)

    fake_generate.assert_awaited_once()
    assert fake_generate.await_args.kwargs["transcript"] is None
