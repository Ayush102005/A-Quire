"""
Regression coverage for the course-scoping bug: instructor analytics used to
filter AMATTA quiz data by "any activity by a student enrolled in this
course," which pulled in a student's completely unrelated topic practice
(e.g. a DSA course showing a Kinematics 1D physics question). The fix scopes
directly by QuizSession.course_id, set when the quiz is actually launched
from a course context.

NOTE: this suite shares one persistent in-memory SQLite DB across the whole
pytest session (see conftest.py's session-scoped setup_database fixture) —
every test function here uses its own non-overlapping id range, matching
the convention already established in test_assessments.py.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.assessment import Topic, Question, QuizSession, QuizResponse


async def _seed_two_courses_one_student(db_session: AsyncSession, instructor_id: int, student_id: int, base_id: int):
    """
    Course A ("DSA") and Course B ("Physics"), one student enrolled in both.
    Topic A belongs (via QuizSession.course_id) to Course A; Topic B to
    Course B. The student has answered a question in both.

    Returns (course_a_id, course_b_id) as plain ints — the ORM objects are
    not returned since `expire_on_commit` is on for this session factory,
    and this helper always commits, so any attribute access on the objects
    afterward would need an active async context.
    """
    course_a_id, course_b_id = base_id, base_id + 1
    topic_a_id, topic_b_id = base_id, base_id + 1
    q_a_id, q_b_id = base_id, base_id + 1
    session_a_id, session_b_id = base_id, base_id + 1

    course_a = Course(id=course_a_id, title="DSA", instructor_id=instructor_id, is_published=True)
    course_b = Course(id=course_b_id, title="Physics", instructor_id=instructor_id, is_published=True)
    db_session.add_all([course_a, course_b])
    await db_session.flush()

    db_session.add_all([
        Enrollment(user_id=student_id, course_id=course_a_id),
        Enrollment(user_id=student_id, course_id=course_b_id),
    ])

    # Topic.name has a DB-level UNIQUE constraint, and this suite shares one
    # persistent DB across tests — suffix with base_id so each test's topics
    # don't collide with another test's. Assertions below match by substring.
    topic_a = Topic(id=topic_a_id, name=f"Arrays {base_id}", subject="DSA")
    topic_b = Topic(id=topic_b_id, name=f"Kinematics 1D {base_id}", subject="Physics")
    db_session.add_all([topic_a, topic_b])
    await db_session.flush()

    q_a = Question(id=q_a_id, topic_id=topic_a_id, content="DSA question", options={"A": "1", "B": "2"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    q_b = Question(id=q_b_id, topic_id=topic_b_id, content="Kinematics question", options={"A": "1", "B": "2"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add_all([q_a, q_b])
    await db_session.flush()

    # Session A explicitly scoped to Course A; session B to Course B.
    session_a = QuizSession(id=session_a_id, user_id=student_id, topic_id=topic_a_id, course_id=course_a_id, current_theta=0.0, is_active=False)
    session_b = QuizSession(id=session_b_id, user_id=student_id, topic_id=topic_b_id, course_id=course_b_id, current_theta=0.0, is_active=False)
    db_session.add_all([session_a, session_b])
    await db_session.flush()

    db_session.add_all([
        QuizResponse(session_id=session_a_id, question_id=q_a_id, is_correct=True, selected_option="A"),
        QuizResponse(session_id=session_b_id, question_id=q_b_id, is_correct=True, selected_option="A"),
    ])
    await db_session.commit()

    return course_a_id, course_b_id


@pytest.mark.asyncio
async def test_assessments_excludes_unrelated_course_topic(
    auth_client_instructor: AsyncClient, db_session: AsyncSession, mock_instructor,
):
    course_a_id, course_b_id = await _seed_two_courses_one_student(db_session, mock_instructor.id, student_id=1, base_id=301)

    response = await auth_client_instructor.get(
        "/api/v1/analytics/instructor/assessments", params={"course_id": course_a_id}
    )
    assert response.status_code == 200
    data = response.json()

    stems = [row["stem"] for row in data]
    assert any("DSA question" in s for s in stems)
    assert not any("Kinematics" in s for s in stems)


@pytest.mark.asyncio
async def test_assessments_scoped_to_the_other_course_shows_only_its_own_topic(
    auth_client_instructor: AsyncClient, db_session: AsyncSession, mock_instructor,
):
    course_a_id, course_b_id = await _seed_two_courses_one_student(db_session, mock_instructor.id, student_id=1, base_id=311)

    response = await auth_client_instructor.get(
        "/api/v1/analytics/instructor/assessments", params={"course_id": course_b_id}
    )
    assert response.status_code == 200
    data = response.json()

    stems = [row["stem"] for row in data]
    assert any("Kinematics" in s for s in stems)
    assert not any("DSA question" in s for s in stems)


@pytest.mark.asyncio
async def test_concepts_excludes_unrelated_course_topic(
    auth_client_instructor: AsyncClient, db_session: AsyncSession, mock_instructor,
):
    course_a_id, course_b_id = await _seed_two_courses_one_student(db_session, mock_instructor.id, student_id=1, base_id=321)

    response = await auth_client_instructor.get(
        "/api/v1/analytics/instructor/concepts", params={"course_id": course_a_id}
    )
    assert response.status_code == 200
    data = response.json()

    topics = [row["topic"] for row in data]
    assert any("Arrays" in t for t in topics)
    assert not any("Kinematics" in t for t in topics)


@pytest.mark.asyncio
async def test_assessments_ignores_sessions_with_no_course_context(
    auth_client_instructor: AsyncClient, db_session: AsyncSession, mock_instructor,
):
    """A quiz session started outside any course context (course_id=None) —
    e.g. standalone practice — must not appear under any course's analytics."""
    course_id = 331
    course = Course(id=course_id, title="Standalone Test Course", instructor_id=mock_instructor.id, is_published=True)
    db_session.add(course)
    await db_session.flush()
    db_session.add(Enrollment(user_id=1, course_id=course_id))

    topic_id = 331
    topic = Topic(id=topic_id, name="Untethered Topic", subject="Misc")
    db_session.add(topic)
    await db_session.flush()

    question_id = 331
    question = Question(id=question_id, topic_id=topic_id, content="Untethered question", options={"A": "1", "B": "2"}, correct_option="A", difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
    db_session.add(question)
    await db_session.flush()

    session_id = 331
    session = QuizSession(id=session_id, user_id=1, topic_id=topic_id, course_id=None, current_theta=0.0, is_active=False)
    db_session.add(session)
    await db_session.flush()
    db_session.add(QuizResponse(session_id=session_id, question_id=question_id, is_correct=True, selected_option="A"))
    await db_session.commit()

    response = await auth_client_instructor.get(
        "/api/v1/analytics/instructor/assessments", params={"course_id": course_id}
    )
    assert response.status_code == 200
    stems = [row["stem"] for row in response.json()]
    assert not any("Untethered" in s for s in stems)
