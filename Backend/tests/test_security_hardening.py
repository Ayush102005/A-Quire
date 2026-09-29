"""
Regression coverage for the instructor-data-security audit:

1. IDOR on module/lesson mutation endpoints (courses.py) — update/delete
   endpoints for modules and lessons used to load the child object by its
   own PK with no check that the requesting instructor actually owns the
   parent course, letting any instructor tamper with any other
   instructor's content.
2. Unauthenticated role self-elevation — /auth/register and
   /auth/firebase-login used to accept a client-controlled "admin" role,
   which several endpoints (_require_course_owner, verify_course_access)
   treat as a blanket bypass of per-course ownership checks.

NOTE: this suite shares one persistent in-memory SQLite DB across the whole
pytest session (see conftest.py's session-scoped setup_database fixture) —
every test function here uses its own non-overlapping id range.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.module import Module
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.student import User


async def _seed_other_instructors_course(db_session: AsyncSession, base_id: int):
    """A course/module/lesson owned by an instructor who is NOT mock_instructor (id=2).

    Returns plain ints, not the ORM objects — `expire_on_commit` is on for
    this session factory, and this helper always commits, so any attribute
    access on the objects afterward would need an active async context.
    """
    other_instructor_id = base_id
    course = Course(id=base_id, title="Someone Else's Course", instructor_id=other_instructor_id, is_published=True)
    db_session.add(course)
    await db_session.flush()

    module = Module(id=base_id, course_id=base_id, title="Someone Else's Module", order=1)
    db_session.add(module)
    await db_session.flush()

    lesson = Lesson(id=base_id, module_id=base_id, title="Someone Else's Lesson", order=1)
    db_session.add(lesson)
    await db_session.flush()
    await db_session.commit()

    return base_id, base_id, base_id


@pytest.mark.asyncio
class TestModuleLessonIDOR:
    async def test_cannot_update_other_instructors_module(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession,
    ):
        _, module_id, _ = await _seed_other_instructors_course(db_session, base_id=901)
        resp = await auth_client_instructor.put(
            f"/api/v1/courses/modules/{module_id}", json={"title": "Hijacked"}
        )
        assert resp.status_code == 403

    async def test_cannot_delete_other_instructors_module(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession,
    ):
        _, module_id, _ = await _seed_other_instructors_course(db_session, base_id=902)
        resp = await auth_client_instructor.delete(f"/api/v1/courses/modules/{module_id}")
        assert resp.status_code == 403

    async def test_cannot_create_lesson_under_other_instructors_module(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession,
    ):
        _, module_id, _ = await _seed_other_instructors_course(db_session, base_id=903)
        resp = await auth_client_instructor.post(
            f"/api/v1/courses/modules/{module_id}/lessons",
            json={"title": "Injected Lesson", "order": 1},
        )
        assert resp.status_code == 403

    async def test_cannot_update_other_instructors_lesson(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession,
    ):
        _, _, lesson_id = await _seed_other_instructors_course(db_session, base_id=904)
        resp = await auth_client_instructor.put(
            f"/api/v1/courses/lessons/{lesson_id}", json={"title": "Hijacked Lesson"}
        )
        assert resp.status_code == 403

    async def test_cannot_delete_other_instructors_lesson(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession,
    ):
        _, _, lesson_id = await _seed_other_instructors_course(db_session, base_id=905)
        resp = await auth_client_instructor.delete(f"/api/v1/courses/lessons/{lesson_id}")
        assert resp.status_code == 403

    async def test_cannot_fetch_transcript_for_other_instructors_lesson(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession,
    ):
        _, _, lesson_id = await _seed_other_instructors_course(db_session, base_id=906)
        resp = await auth_client_instructor.post(f"/api/v1/courses/lessons/{lesson_id}/fetch-transcript")
        assert resp.status_code == 403

    async def test_owner_can_still_update_their_own_module(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession, mock_instructor,
    ):
        """Regression guard: the ownership check must not break the legitimate path."""
        course = Course(id=910, title="My Own Course", instructor_id=mock_instructor.id, is_published=True)
        db_session.add(course)
        await db_session.flush()
        module = Module(id=910, course_id=910, title="My Module", order=1)
        db_session.add(module)
        await db_session.flush()
        await db_session.commit()

        resp = await auth_client_instructor.put(
            "/api/v1/courses/modules/910", json={"title": "Updated Title"}
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"


@pytest.mark.asyncio
class TestRoleSelfElevation:
    async def test_register_rejects_admin_role(self, async_client: AsyncClient):
        resp = await async_client.post("/api/v1/auth/register", json={
            "email": "wannabe-admin@test.com",
            "password": "password123",
            "full_name": "Wannabe Admin",
            "role": "admin",
        })
        assert resp.status_code == 422

    async def test_register_still_allows_instructor_role(self, async_client: AsyncClient):
        resp = await async_client.post("/api/v1/auth/register", json={
            "email": "legit-instructor@test.com",
            "password": "password123",
            "full_name": "Legit Instructor",
            "role": "instructor",
        })
        assert resp.status_code == 201


@pytest.mark.asyncio
class TestStudentsScopedToOwnCourses:
    """GET /analytics/instructor/students must only return students enrolled
    in a course the requesting instructor actually owns — not every student
    on the platform, and not students enrolled only in another instructor's
    course."""

    async def test_only_shows_students_enrolled_in_own_course(
        self, auth_client_instructor: AsyncClient, db_session: AsyncSession, mock_instructor,
    ):
        base_id = 950
        my_course = Course(id=base_id, title="My Course", instructor_id=mock_instructor.id, is_published=True)
        other_course = Course(id=base_id + 1, title="Someone Else's Course", instructor_id=base_id + 1, is_published=True)
        db_session.add_all([my_course, other_course])
        await db_session.flush()

        my_student = User(id=base_id, email=f"mystudent{base_id}@test.com", full_name="My Student", role="student")
        other_student = User(id=base_id + 1, email=f"otherstudent{base_id}@test.com", full_name="Other Student", role="student")
        db_session.add_all([my_student, other_student])
        await db_session.flush()

        db_session.add_all([
            Enrollment(user_id=my_student.id, course_id=my_course.id),
            Enrollment(user_id=other_student.id, course_id=other_course.id),
        ])
        await db_session.commit()

        resp = await auth_client_instructor.get("/api/v1/analytics/instructor/students")
        assert resp.status_code == 200
        names = [row["name"] for row in resp.json()]
        assert "My Student" in names
        assert "Other Student" not in names

    async def test_no_courses_returns_empty_list(self, async_client):
        from app.api.deps import get_current_user
        from app.api.deps.roles import get_instructor_user
        from app.main import app

        lonely_instructor = User(id=970, email="lonely970@test.com", full_name="Lonely Instructor", role="instructor")
        app.dependency_overrides[get_current_user] = lambda: lonely_instructor
        app.dependency_overrides[get_instructor_user] = lambda: lonely_instructor
        try:
            resp = await async_client.get("/api/v1/analytics/instructor/students")
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_instructor_user, None)

        assert resp.status_code == 200
        assert resp.json() == []
