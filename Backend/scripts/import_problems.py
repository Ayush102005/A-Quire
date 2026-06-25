#!/usr/bin/env python3
"""
problems_bank_importer.py
=========================
Scan all problems/*/ directories and seed the database with:
  - One Course per DSA topic folder (e.g. "Arrays", "Dynamic Programming")
  - One Module per topic (same title as course, order=1)
  - One Lesson per .md file (title from H1, video_url from YouTube link in file)

Usage (from Backend/):
    python scripts/import_problems.py [--instructor-email INSTRUCTOR_EMAIL]

The instructor-email defaults to the first admin/instructor user found in DB.

Requirements:
    - DATABASE_URL must be set in .env
    - Problems directory must exist at ../problems/ relative to Backend/
    - Run after `alembic upgrade head`

Design decisions:
    - Idempotent: skips courses whose title already exists for the instructor
    - Extracts YouTube video_url from the first YouTube link found in the file
    - Sets is_published=False by default; instructor can publish via UI
    - All lessons ordered by filename (alphabetical) within their module
"""
from __future__ import annotations

import asyncio
import os
import re
import sys
from pathlib import Path

# ── Make sure we can import from app/ ─────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Load .env before importing app modules
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.core.config import settings
from app.models.user import User, RoleEnum
from app.models.course import Course, Module, Lesson


# ── Paths ─────────────────────────────────────────────────────────────────────
PROBLEMS_DIR = BACKEND_DIR.parent / "problems"

# ── Helpers ───────────────────────────────────────────────────────────────────

YOUTUBE_RE = re.compile(
    r'https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_\-]{11})',
    re.IGNORECASE,
)


def extract_title(md_text: str, filename: str) -> str:
    """Extract H1 title from markdown, fallback to formatted filename."""
    for line in md_text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    # Fallback: convert filename to title (e.g. kadane_s_algorithm → Kadane's Algorithm)
    return filename.replace(".md", "").replace("_s_", "'s ").replace("_", " ").title()


def extract_video_url(md_text: str) -> str | None:
    """Extract first YouTube URL from markdown frontmatter or body."""
    match = YOUTUBE_RE.search(md_text)
    if match:
        # Return a clean embed-compatible short URL
        return f"https://youtu.be/{match.group(1)}"
    return None


def extract_difficulty(md_text: str) -> str:
    """Extract difficulty from frontmatter line like '- **Difficulty:** Medium'"""
    m = re.search(r'\*\*Difficulty:\*\*\s*(\w+)', md_text)
    return m.group(1) if m else "Medium"


# ── Main logic ────────────────────────────────────────────────────────────────

async def run(instructor_email: str | None = None):
    if not PROBLEMS_DIR.exists():
        print(f"ERROR: Problems directory not found at {PROBLEMS_DIR}", file=sys.stderr)
        sys.exit(1)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # ── Find instructor ───────────────────────────────────────────────────
        if instructor_email:
            result = await db.execute(select(User).where(User.email == instructor_email))
            instructor = result.scalar_one_or_none()
            if not instructor:
                print(f"ERROR: No user found with email {instructor_email!r}", file=sys.stderr)
                sys.exit(1)
        else:
            # Use first admin or instructor account
            result = await db.execute(
                select(User).where(
                    User.role.in_([RoleEnum.ADMIN, RoleEnum.INSTRUCTOR])
                ).limit(1)
            )
            instructor = result.scalar_one_or_none()
            if not instructor:
                print("ERROR: No instructor/admin user found. Create one first.", file=sys.stderr)
                sys.exit(1)

        print(f"Using instructor: {instructor.email} (id={instructor.id}, role={instructor.role.value})")

        topic_dirs = sorted([d for d in PROBLEMS_DIR.iterdir() if d.is_dir()])
        print(f"Found {len(topic_dirs)} topic directories.\n")

        created_courses = 0
        skipped_courses = 0
        created_lessons = 0

        for topic_dir in topic_dirs:
            topic_name = topic_dir.name  # e.g. "Arrays", "Dynamic Programming Part-II"

            # ── Idempotency: skip if course already exists ─────────────────
            existing = await db.execute(
                select(Course).where(
                    Course.title == topic_name,
                    Course.instructor_id == instructor.id,
                )
            )
            if existing.scalar_one_or_none():
                print(f"  [SKIP] Course already exists: {topic_name!r}")
                skipped_courses += 1
                continue

            # ── Create Course ──────────────────────────────────────────────
            course = Course(
                instructor_id=instructor.id,
                title=topic_name,
                description=f"DSA problems and solutions for the {topic_name} topic. "
                            f"Each lesson covers a specific problem with multiple approaches, "
                            f"complexity analysis, and code solutions.",
                is_published=False,
            )
            db.add(course)
            await db.flush()  # get course.id

            # ── Create Module (one per course) ─────────────────────────────
            module = Module(
                course_id=course.id,
                title=topic_name,
                description=f"Problems and solutions for {topic_name}",
                order=1,
            )
            db.add(module)
            await db.flush()  # get module.id

            # ── Create Lessons from .md files ──────────────────────────────
            md_files = sorted(topic_dir.glob("*.md"))
            for order_idx, md_file in enumerate(md_files, start=1):
                md_text = md_file.read_text(encoding="utf-8", errors="replace")
                lesson_title = extract_title(md_text, md_file.name)
                video_url = extract_video_url(md_text)
                difficulty = extract_difficulty(md_text)

                lesson = Lesson(
                    module_id=module.id,
                    title=lesson_title,
                    description=f"Difficulty: {difficulty}\n\n"
                                f"Full problem statement, brute force, optimal approaches, "
                                f"complexity analysis, and code solutions in CPP, Java, and Python.",
                    video_url=video_url,
                    order=order_idx,
                    duration_seconds=0,  # Unknown until video metadata is fetched
                )
                db.add(lesson)
                created_lessons += 1
                print(f"    + Lesson: {lesson_title!r}" + (f" [{video_url}]" if video_url else " [no video]"))

            await db.commit()
            print(f"  [OK] Course created: {topic_name!r} ({len(md_files)} lessons)")
            created_courses += 1

    print(f"\n{'='*60}")
    print(f"Import complete.")
    print(f"  Courses created : {created_courses}")
    print(f"  Courses skipped : {skipped_courses} (already exist)")
    print(f"  Lessons created : {created_lessons}")
    print(f"{'='*60}")

    await engine.dispose()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Seed the A-Quire database with DSA problem-bank courses."
    )
    parser.add_argument(
        "--instructor-email",
        default=None,
        help="Email of the instructor/admin who will own the courses. "
             "Defaults to the first instructor/admin found in the database.",
    )
    args = parser.parse_args()

    asyncio.run(run(instructor_email=args.instructor_email))
