"""
scripts/seed_demo_analytics.py
───────────────────────────────
Populates realistic demo analytics (struggle events, quiz attempts, progress)
for existing courses so that Instructor Analytics and the Priority Action Queue
display rich, interactive data.

Run with:
    python scripts/seed_demo_analytics.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.student import User
from app.models.course import Course
from app.models.module import Module
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.struggle_event import StruggleEvent
from app.models.assessment import Topic, Question, QuizSession, QuizResponse


async def seed_analytics():
    async with AsyncSessionLocal() as db:
        # 1. Fetch courses
        courses = (await db.scalars(select(Course))).all()
        if not courses:
            print("[!] No courses found in database. Create a course first.")
            return

        # 2. Fetch student users
        students = (await db.scalars(select(User).where(User.role == "student"))).all()
        if not students:
            print("[!] No student users found. Creating a demo student...")
            student = User(
                email="student.analytics@example.com",
                full_name="Alex Chen",
                role="student",
                is_active=True,
                email_verified=True,
                onboarding_complete=True,
            )
            db.add(student)
            await db.flush()
            students = [student]

        # 3. For each course, ensure enrollment, struggles, and quiz sessions
        now = datetime.now(timezone.utc)

        for course in courses:
            print(f"[*] Processing course: ID={course.id} '{course.title}'")

            # Enroll at least 2 students
            for s in students[:3]:
                enr = await db.scalar(
                    select(Enrollment).where(Enrollment.user_id == s.id, Enrollment.course_id == course.id)
                )
                if not enr:
                    db.add(Enrollment(user_id=s.id, course_id=course.id))
                    print(f"  [+] Enrolled student {s.full_name} in course {course.title}")

            await db.flush()

            # Find lessons in this course
            lessons = (await db.scalars(
                select(Lesson).join(Module, Module.id == Lesson.module_id).where(Module.course_id == course.id)
            )).all()

            if lessons and students:
                target_student = students[0]
                target_lesson = lessons[0]

                # Check if struggles exist
                existing_struggles = (await db.scalars(
                    select(StruggleEvent).where(
                        StruggleEvent.course_id == course.id,
                        StruggleEvent.user_id == target_student.id,
                    )
                )).all()

                if not existing_struggles:
                    e1 = StruggleEvent(
                        user_id=target_student.id,
                        course_id=course.id,
                        lesson_id=target_lesson.id,
                        event_type="rewatch_spike",
                        severity=0.55,
                        confidence_score=0.82,
                        status="new",
                        struggle_score=0.62,
                        lesson_timestamp_ms=45000,
                        fixation_duration_ms=6200,
                        inactivity_duration_ms=4000,
                        client_event_id=f"demo-struggle-{course.id}-1",
                        hint_text="Remember to check the loop boundary condition when traversing from end to start.",
                        created_at=now - timedelta(hours=2),
                    )
                    e2 = StruggleEvent(
                        user_id=target_student.id,
                        course_id=course.id,
                        lesson_id=target_lesson.id,
                        event_type="pause_frequent",
                        severity=0.48,
                        confidence_score=0.75,
                        status="new",
                        struggle_score=0.50,
                        lesson_timestamp_ms=92000,
                        fixation_duration_ms=7100,
                        inactivity_duration_ms=5500,
                        client_event_id=f"demo-struggle-{course.id}-2",
                        created_at=now - timedelta(hours=1),
                    )
                    db.add_all([e1, e2])
                    print(f"  [+] Added 2 struggle events for {target_student.full_name} on lesson '{target_lesson.title}'")

                # Progress
                prog = await db.scalar(
                    select(Progress).where(Progress.user_id == target_student.id, Progress.lesson_id == target_lesson.id)
                )
                if not prog:
                    db.add(Progress(
                        user_id=target_student.id,
                        lesson_id=target_lesson.id,
                        watched_seconds=120,
                        completion_percent=45.0,
                        is_completed=False,
                    ))
                    print(f"  [+] Added progress for {target_student.full_name}")

            # Quiz session & responses for concept revision item
            topics = (await db.scalars(select(Topic))).all()
            if topics and students:
                target_topic = topics[0]
                questions = (await db.scalars(select(Question).where(Question.topic_id == target_topic.id))).all()

                existing_session = await db.scalar(
                    select(QuizSession).where(
                        QuizSession.course_id == course.id,
                        QuizSession.topic_id == target_topic.id,
                    )
                )

                if not existing_session and questions:
                    session = QuizSession(
                        user_id=students[0].id,
                        topic_id=target_topic.id,
                        course_id=course.id,
                        current_theta=-0.5,
                        is_active=False,
                        created_at=now - timedelta(days=1),
                    )
                    db.add(session)
                    await db.flush()

                    # Add 2 responses with incorrect answers to flag concept for revision (<60% accuracy)
                    for i, q in enumerate(questions[:3]):
                        db.add(QuizResponse(
                            session_id=session.id,
                            question_id=q.id,
                            is_correct=(i == 0),  # 1 correct out of 3 = 33% accuracy
                            selected_option="B",
                            created_at=now - timedelta(days=1, hours=i),
                        ))
                    print(f"  [+] Added quiz attempts for topic '{target_topic.name}' (33% accuracy)")

        await db.commit()
        print("\n[SUCCESS] Sample analytics data seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_analytics())
