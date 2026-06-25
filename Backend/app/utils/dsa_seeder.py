from __future__ import annotations

import os
import re
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.course import Course, Module, Lesson
from app.core.logging import logger

async def seed_dsa_course(db: AsyncSession) -> None:
    """Parse problems folder and seed the DSA Course with Modules and Lessons."""
    # 1. Get instructor Dr. Alan Davis
    result = await db.execute(select(User).where(User.email == "alan@iit.edu"))
    instructor = result.scalars().first()
    if not instructor:
        logger.error("Instructor Dr. Alan Davis not found. Skipping DSA seeding.")
        return

    # 2. Check if course already exists
    course_result = await db.execute(
        select(Course).where(Course.title == "Data Structures & Algorithms")
    )
    course = course_result.scalars().first()
    if course:
        logger.info("DSA course already exists. Skipping seeding.")
        return

    # 3. Resolve problems directory path
    base_dir = Path(__file__).resolve().parents[3]
    problems_dir = base_dir / "problems"
    if not problems_dir.exists():
        problems_dir = Path("d:/A-Quire/problems")
    
    if not problems_dir.exists():
        logger.error(f"Problems directory not found at {problems_dir}. Skipping DSA seeding.")
        return

    logger.info(f"Seeding DSA course from: {problems_dir}")

    # 4. Create Course
    course = Course(
        title="Data Structures & Algorithms",
        description="A comprehensive curriculum covering essential data structures, algorithms, complexity analysis, and coding problem solutions.",
        instructor_id=instructor.id,
        is_published=True,
    )
    db.add(course)
    await db.flush()

    # 5. Enroll Demo Student
    student_result = await db.execute(select(User).where(User.email == "student@iit.edu"))
    student = student_result.scalars().first()
    if student:
        from app.models.course import student_courses
        await db.execute(
            student_courses.insert().values(student_id=student.id, course_id=course.id)
        )
        logger.info(f"Enrolled student {student.email} in DSA course.")

    # 6. Read and sort subdirectories (Modules)
    subdirs = sorted([d for d in problems_dir.iterdir() if d.is_dir()])
    
    for mod_idx, subdir in enumerate(subdirs, 1):
        module_title = subdir.name
        logger.info(f"Seeding Module {mod_idx}: {module_title}")
        
        module = Module(
            course_id=course.id,
            title=module_title,
            description=f"Standard DSA patterns and problems on {module_title}.",
            order=mod_idx,
        )
        db.add(module)
        await db.flush()

        # 7. Read and sort markdown files (Lessons)
        md_files = sorted([f for f in subdir.iterdir() if f.is_file() and f.suffix == ".md"])
        
        for les_idx, md_file in enumerate(md_files, 1):
            try:
                with open(md_file, "r", encoding="utf-8") as f:
                    content = f.read()

                # Parse Title & Video URL
                title = md_file.stem.replace("_", " ").title()
                video_url = None
                
                # Look for Title in markdown # heading
                for line in content.splitlines():
                    if line.startswith("# "):
                        title = line[2:].strip()
                        break
                
                # Look for YouTube link
                for line in content.splitlines():
                    if "YouTube Video:" in line or "Watch Video Explanation" in line:
                        match = re.search(r"\((https?://[^\)]+)\)", line)
                        if match:
                            video_url = match.group(1)
                            break

                # Create Lesson
                lesson = Lesson(
                    module_id=module.id,
                    title=title,
                    description=content,
                    video_url=video_url,
                    order=les_idx,
                    duration_seconds=1800,  # 30 mins default duration
                )
                db.add(lesson)
            except Exception as e:
                logger.error(f"Failed to seed lesson from {md_file}: {e}")

    await db.commit()
    logger.info("DSA course seeded successfully.")
