import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.course import Course
from app.models.student import User

@pytest.mark.asyncio
async def test_instructor_analytics_access_denied_for_student(
    client: AsyncClient, student_headers: dict
) -> None:
    # Student should not be able to access instructor analytics overview
    response = await client.get("/api/v1/analytics/instructor/overview?course_id=1", headers=student_headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_instructor_analytics_403_for_other_course(
    client: AsyncClient,
    instructor_headers: dict,
    db_session: AsyncSession,
) -> None:
    # Create an instructor
    new_instructor = User(
        email="other_instructor@example.com",
        hashed_password="hashed",
        full_name="Other Inst",
        role="instructor"
    )
    db_session.add(new_instructor)
    await db_session.commit()
    await db_session.refresh(new_instructor)

    # Create a course owned by another instructor
    course = Course(
        title="Other Course",
        instructor_id=new_instructor.id,
        is_published=True
    )
    db_session.add(course)
    await db_session.commit()
    await db_session.refresh(course)

    # Current instructor tries to access it
    response = await client.get(
        f"/api/v1/analytics/instructor/overview?course_id={course.id}",
        headers=instructor_headers
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_instructor_attention_no_data(
    client: AsyncClient,
    instructor_headers: dict,
    db_session: AsyncSession,
) -> None:
    # Querying a non-existent course returns 404
    response = await client.get("/api/v1/analytics/instructor/attention?course_id=9999", headers=instructor_headers)
    assert response.status_code == 404
