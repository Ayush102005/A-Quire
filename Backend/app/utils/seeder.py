from __future__ import annotations

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, RoleEnum
from app.models.course import Course, Module, Lesson
from app.models.quiz import Quiz, QuizQuestion
from app.core.security import hash_password
from app.core.logging import logger

async def seed_database(db: AsyncSession) -> None:
    """Seed the database with default users, courses, modules, lessons, and quizzes."""
    logger.info("Checking and seeding database...")

    # 1. Create Users if they don't exist
    student_check = await db.execute(select(User).where(User.email == "student@iit.edu"))
    student = student_check.scalars().first()

    instructor = None
    admin = None

    if not student:
        demo_password = hash_password("demo1234")
        student = User(
            email="student@iit.edu",
            full_name="Demo Student",
            password_hash=demo_password,
            role=RoleEnum.STUDENT,
            is_onboarded=True,
        )
        instructor = User(
            email="alan@iit.edu",
            full_name="Dr. Alan Davis",
            password_hash=demo_password,
            role=RoleEnum.INSTRUCTOR,
            is_onboarded=True,
        )
        admin = User(
            email="admin@aquire.io",
            full_name="Platform Admin",
            password_hash=demo_password,
            role=RoleEnum.ADMIN,
            is_onboarded=True,
        )
        db.add_all([student, instructor, admin])
        await db.flush() # Populate IDs
    else:
        instructor_check = await db.execute(select(User).where(User.email == "alan@iit.edu"))
        instructor = instructor_check.scalars().first()
        admin_check = await db.execute(select(User).where(User.email == "admin@aquire.io"))
        admin = admin_check.scalars().first()

    # Seed DSA Course
    from app.utils.dsa_seeder import seed_dsa_course
    await seed_dsa_course(db)

    # 2. Check if Physics Course already exists
    physics_check = await db.execute(select(Course).where(Course.title == "Physics 301: Thermodynamics"))
    if physics_check.scalars().first():
        logger.info("Physics 301 course already seeded. Skipping.")
        return

    # 3. Create Course
    course = Course(
        title="Physics 301: Thermodynamics",
        description="An advanced exploration of energy, heat, work, entropy, and the fundamental laws governing the physical universe. Designed for engineering and physics majors.",
        instructor_id=instructor.id,
        is_published=True,
    )
    db.add(course)
    await db.flush()

    # Enroll student in course directly via association table to avoid ORM lazy-loading exceptions
    from app.models.course import student_courses
    await db.execute(
        student_courses.insert().values(student_id=student.id, course_id=course.id)
    )

    # 3. Create Modules
    m1 = Module(course_id=course.id, title="Module 1: Foundations of Energy", description="Basic thermodynamic parameters, temperature, and heat capacity.", order=1)
    m2 = Module(course_id=course.id, title="Module 2: The First Law & Enthalpy", description="Conservation of energy, enthalpy, work, heat, and entropy intro.", order=2)
    m3 = Module(course_id=course.id, title="Module 3: The Second & Third Laws", description="Heat engines, Carnot cycles, statistical entropy, and absolute zero.", order=3)

    db.add_all([m1, m2, m3])
    await db.flush()

    # 4. Create Lessons for Module 1
    l1_1 = Lesson(module_id=m1.id, title="Course Introduction", description="Overview of the syllabus and thermodynamics scope.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", order=1, duration_seconds=720)
    l1_2 = Lesson(module_id=m1.id, title="The Zeroth Law & Temperature", description="Defining thermal equilibrium and temperature scales.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", order=2, duration_seconds=1680)
    l1_3 = Lesson(module_id=m1.id, title="Heat Capacity & Calorimetry", description="How materials store thermal energy and heat measurements.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", order=3, duration_seconds=2100)
    l1_4 = Lesson(module_id=m1.id, title="Module 1 Assessment", description="End of module conceptual check.", video_url=None, order=4, duration_seconds=1200)

    # Lessons for Module 2
    l2_1 = Lesson(module_id=m2.id, title="Work & Heat Transfer", description="Work done by expanding gases and heat transfer mechanisms.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", order=1, duration_seconds=2700)
    l2_2 = Lesson(module_id=m2.id, title="Intro to Enthalpy", description="Defining heat content at constant pressure.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", order=2, duration_seconds=2280)
    l2_3 = Lesson(module_id=m2.id, title="Intro to Entropy", description="Entropy as a state function and thermodynamic probability.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", order=3, duration_seconds=2520)
    l2_4 = Lesson(module_id=m2.id, title="Reversible & Irreversible Processes", description="Distinguishing paths and work boundaries.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4", order=4, duration_seconds=3000)

    # Lessons for Module 3
    l3_1 = Lesson(module_id=m3.id, title="Heat Engines & Carnot Cycle", description="Ideal efficiencies and thermodynamic limits.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", order=1, duration_seconds=2700)
    l3_2 = Lesson(module_id=m3.id, title="Statistical View of Entropy", description="Boltzmann relation and microstates.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", order=2, duration_seconds=3300)
    l3_3 = Lesson(module_id=m3.id, title="Absolute Zero", description="The third law limits and low temperature physics.", video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4", order=3, duration_seconds=1800)

    db.add_all([l1_1, l1_2, l1_3, l1_4, l2_1, l2_2, l2_3, l2_4, l3_1, l3_2, l3_3])
    await db.flush()

    # 5. Create Quizzes
    quiz = Quiz(
        lesson_id=l1_4.id,
        title="Module 1 Assessment Quiz",
        description="Verify your understanding of temperature, energy conservation, and thermal capacities."
    )
    db.add(quiz)
    await db.flush()

    q1 = QuizQuestion(
        quiz_id=quiz.id,
        question_text="What is the physical interpretation of the Zeroth Law of Thermodynamics?",
        question_type="multiple_choice",
        correct_answer="If two systems are in thermal equilibrium with a third, they are in thermal equilibrium with each other.",
        options=json.dumps([
            "Energy cannot be created or destroyed, only transformed.",
            "Entropy of an isolated system always increases over time.",
            "If two systems are in thermal equilibrium with a third, they are in thermal equilibrium with each other.",
            "Absolute zero temperature can never be reached experimentally."
        ]),
        order=1
    )

    q2 = QuizQuestion(
        quiz_id=quiz.id,
        question_text="Which quantity represents the heat capacity of a substance per unit mass?",
        question_type="multiple_choice",
        correct_answer="Specific heat capacity",
        options=json.dumps([
            "Latent heat of fusion",
            "Specific heat capacity",
            "Molar enthalpy",
            "Thermal conductivity"
        ]),
        order=2
    )

    db.add_all([q1, q2])
    await db.commit()
    logger.info("Database seeding completed successfully.")
