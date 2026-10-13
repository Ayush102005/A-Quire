"""
scripts/load_seed_data.py
─────────────────────────
Loads exported database records (users, institutions, invoices, moderation_reports,
audit_logs, topics, courses, modules, lessons, questions) from seed_data.json
into the target database (PostgreSQL in production or SQLite in dev).

Handles:
- asyncpg datetime type conversion (str -> datetime)
- asyncpg boolean conversion (int 0/1 -> bool)
- JSON/JSONB deserialization for transcripts, test_cases, options, preferences
- Foreign key dependency resolution (ID remapping if duplicates exist)
- PostgreSQL transaction error isolation via nested savepoints
- PostgreSQL serial sequence resets
"""
from __future__ import annotations

import json
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
from app.models import (
    User,
    Institution,
    Invoice,
    ModerationReport,
    AuditLog,
    Topic,
    Course,
    Module,
    Lesson,
    Question,
)

DATA_FILE = Path(__file__).resolve().parent.parent / "seed_data.json"


def parse_datetime(val: str | None) -> datetime:
    if not val:
        return datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(val))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def parse_json(val: any) -> any:
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str) and val.strip():
        try:
            return json.loads(val)
        except Exception:
            return None
    return None


async def load_data():
    if not DATA_FILE.exists():
        print(f"[-] {DATA_FILE} not found!")
        return

    print(f"[*] Reading {DATA_FILE}...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # ID mapping tables to resolve foreign keys seamlessly
    user_id_map: dict[int, int] = {}
    inst_id_map: dict[int, int] = {}
    topic_id_map: dict[int, int] = {}
    course_id_map: dict[int, int] = {}
    module_id_map: dict[int, int] = {}

    async with AsyncSessionLocal() as session:
        # ─────────────────────────────────────────────────────────────
        # 1. USERS
        # ─────────────────────────────────────────────────────────────
        user_rows = data.get("users", [])
        if user_rows:
            print(f"[*] Processing {len(user_rows)} users...")
            for row in user_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(User).where(User.email == row["email"]))
                    if existing:
                        user_id_map[row["id"]] = existing.id
                    else:
                        pref = parse_json(row.get("preferences"))
                        user = User(
                            id=row["id"],
                            firebase_uid=row.get("firebase_uid"),
                            email=row["email"],
                            full_name=row.get("full_name") or "User",
                            hashed_password=row.get("hashed_password"),
                            role=row.get("role") or "student",
                            is_active=bool(row.get("is_active", True)),
                            email_verified=bool(row.get("email_verified", True)),
                            onboarding_complete=bool(row.get("onboarding_complete", True)),
                            goals=row.get("goals"),
                            interests=row.get("interests"),
                            language=row.get("language") or "en",
                            timezone=row.get("timezone") or "UTC",
                            email_notifications=bool(row.get("email_notifications", True)),
                            reminder_frequency=row.get("reminder_frequency") or "daily",
                            preferences=pref,
                            created_at=parse_datetime(row.get("created_at")),
                        )
                        session.add(user)
                        await session.flush()
                        user_id_map[row["id"]] = user.id
            await session.commit()
            print(f"  [OK] Synced {len(user_rows)} users!")

        # ─────────────────────────────────────────────────────────────
        # 2. INSTITUTIONS
        # ─────────────────────────────────────────────────────────────
        inst_rows = data.get("institutions", [])
        if inst_rows:
            print(f"[*] Processing {len(inst_rows)} institutions...")
            for row in inst_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(Institution).where(Institution.id == row["id"]))
                    if not existing:
                        existing = await session.scalar(select(Institution).where(Institution.name == row["name"]))
                    
                    if existing:
                        inst_id_map[row["id"]] = existing.id
                    else:
                        inst = Institution(
                            id=row["id"],
                            name=row["name"],
                            tier=row.get("tier", "Enterprise"),
                            mrr=float(row.get("mrr", 0.0)),
                            status=row.get("status", "Healthy"),
                            created_at=parse_datetime(row.get("created_at")),
                        )
                        session.add(inst)
                        await session.flush()
                        inst_id_map[row["id"]] = inst.id
            await session.commit()
            print(f"  [OK] Synced {len(inst_rows)} institutions!")

        # ─────────────────────────────────────────────────────────────
        # 3. INVOICES
        # ─────────────────────────────────────────────────────────────
        inv_rows = data.get("invoices", [])
        if inv_rows:
            print(f"[*] Processing {len(inv_rows)} invoices...")
            for row in inv_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(Invoice).where(Invoice.invoice_number == row["invoice_number"]))
                    if not existing:
                        target_inst_id = inst_id_map.get(row.get("institution_id"), row.get("institution_id"))
                        inv = Invoice(
                            id=row["id"],
                            invoice_number=row["invoice_number"],
                            institution_id=target_inst_id,
                            amount=float(row.get("amount", 0.0)),
                            status=row.get("status", "Paid"),
                            created_at=parse_datetime(row.get("created_at")),
                        )
                        session.add(inv)
                        await session.flush()
            await session.commit()
            print(f"  [OK] Synced {len(inv_rows)} invoices!")

        # ─────────────────────────────────────────────────────────────
        # 4. MODERATION REPORTS & AUDIT LOGS
        # ─────────────────────────────────────────────────────────────
        rep_rows = data.get("moderation_reports", [])
        if rep_rows:
            print(f"[*] Processing {len(rep_rows)} moderation reports...")
            for row in rep_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(ModerationReport).where(ModerationReport.id == row["id"]))
                    if not existing:
                        rep = ModerationReport(
                            id=row["id"],
                            report_type=row.get("report_type", "General"),
                            course_context=row.get("course_context", ""),
                            reporter=row.get("reporter", "System"),
                            severity=row.get("severity", "medium"),
                            is_resolved=bool(row.get("is_resolved", False)),
                            created_at=parse_datetime(row.get("created_at")),
                        )
                        session.add(rep)
                        await session.flush()
            await session.commit()
            print(f"  [OK] Synced {len(rep_rows)} moderation reports!")

        log_rows = data.get("audit_logs", [])
        if log_rows:
            print(f"[*] Processing {len(log_rows)} audit logs...")
            for row in log_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(AuditLog).where(AuditLog.id == row["id"]))
                    if not existing:
                        log = AuditLog(
                            id=row["id"],
                            actor=row.get("actor", "System"),
                            action=row.get("action", ""),
                            target=row.get("target", ""),
                            log_type=row.get("log_type", "info"),
                            created_at=parse_datetime(row.get("created_at")),
                        )
                        session.add(log)
                        await session.flush()
            await session.commit()
            print(f"  [OK] Synced {len(log_rows)} audit logs!")

        # ─────────────────────────────────────────────────────────────
        # 5. TOPICS
        # ─────────────────────────────────────────────────────────────
        topic_rows = data.get("topics", [])
        if topic_rows:
            print(f"[*] Processing {len(topic_rows)} topics...")
            for row in topic_rows:
                async with session.begin_nested():
                    # Match by name first to avoid unique constraint conflict
                    existing = await session.scalar(select(Topic).where(Topic.name == row["name"]))
                    if existing:
                        topic_id_map[row["id"]] = existing.id
                    else:
                        # Check if id taken
                        by_id = await session.scalar(select(Topic).where(Topic.id == row["id"]))
                        if by_id:
                            topic = Topic(name=row["name"], subject=row.get("subject"))
                        else:
                            topic = Topic(id=row["id"], name=row["name"], subject=row.get("subject"))
                        session.add(topic)
                        await session.flush()
                        topic_id_map[row["id"]] = topic.id
            await session.commit()
            print(f"  [OK] Synced {len(topic_rows)} topics!")

        # ─────────────────────────────────────────────────────────────
        # 6. COURSES
        # ─────────────────────────────────────────────────────────────
        course_rows = data.get("courses", [])
        if course_rows:
            print(f"[*] Processing {len(course_rows)} courses...")
            for row in course_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(Course).where(Course.id == row["id"]))
                    if existing:
                        course_id_map[row["id"]] = existing.id
                    else:
                        # Find valid instructor_id
                        target_instructor_id = user_id_map.get(row.get("instructor_id"))
                        if not target_instructor_id and row.get("instructor_id"):
                            user_exists = await session.scalar(select(User).where(User.id == row["instructor_id"]))
                            if user_exists:
                                target_instructor_id = user_exists.id
                            else:
                                any_staff = await session.scalar(select(User).where(User.role.in_(["instructor", "admin"])).limit(1))
                                target_instructor_id = any_staff.id if any_staff else None

                        target_inst_id = inst_id_map.get(row.get("institution_id"))

                        course = Course(
                            id=row["id"],
                            instructor_id=target_instructor_id,
                            institution_id=target_inst_id,
                            title=row.get("title", "Course"),
                            description=row.get("description", ""),
                            exam_category=row.get("exam_category", "Other"),
                            is_published=bool(row.get("is_published", True)),
                            created_at=parse_datetime(row.get("created_at")),
                        )
                        session.add(course)
                        await session.flush()
                        course_id_map[row["id"]] = course.id
            await session.commit()
            print(f"  [OK] Synced {len(course_rows)} courses!")

        # ─────────────────────────────────────────────────────────────
        # 7. MODULES
        # ─────────────────────────────────────────────────────────────
        module_rows = data.get("modules", [])
        if module_rows:
            print(f"[*] Processing {len(module_rows)} modules...")
            for row in module_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(Module).where(Module.id == row["id"]))
                    if existing:
                        module_id_map[row["id"]] = existing.id
                    else:
                        target_course_id = course_id_map.get(row["course_id"], row["course_id"])
                        mod = Module(
                            id=row["id"],
                            course_id=target_course_id,
                            title=row.get("title", "Module"),
                            description=row.get("description", ""),
                            order=int(row.get("order", 1)),
                        )
                        session.add(mod)
                        await session.flush()
                        module_id_map[row["id"]] = mod.id
            await session.commit()
            print(f"  [OK] Synced {len(module_rows)} modules!")

        # ─────────────────────────────────────────────────────────────
        # 8. LESSONS
        # ─────────────────────────────────────────────────────────────
        lesson_rows = data.get("lessons", [])
        if lesson_rows:
            print(f"[*] Processing {len(lesson_rows)} lessons...")
            for row in lesson_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(Lesson).where(Lesson.id == row["id"]))
                    if not existing:
                        target_mod_id = module_id_map.get(row["module_id"], row["module_id"])
                        transcript = parse_json(row.get("transcript"))
                        test_cases = parse_json(row.get("test_cases"))

                        lesson = Lesson(
                            id=row["id"],
                            module_id=target_mod_id,
                            title=row.get("title", "Lesson"),
                            video_url=row.get("video_url"),
                            description=row.get("description"),
                            order=int(row.get("order", 1)),
                            duration_seconds=int(row.get("duration_seconds", 0)),
                            lesson_type=row.get("lesson_type", "video"),
                            problem_id=row.get("problem_id"),
                            category=row.get("category"),
                            difficulty=row.get("difficulty"),
                            topic=row.get("topic"),
                            problem_statement=row.get("problem_statement"),
                            examples=row.get("examples"),
                            constraints=row.get("constraints"),
                            approaches=row.get("approaches"),
                            code_solutions=row.get("code_solutions"),
                            complexity_time=row.get("complexity_time"),
                            complexity_space=row.get("complexity_space"),
                            external_links=row.get("external_links"),
                            transcript=transcript,
                            pdf_path=row.get("pdf_path"),
                            pdf_filename=row.get("pdf_filename"),
                            notes_content=row.get("notes_content"),
                            test_cases=test_cases,
                        )
                        session.add(lesson)
                        await session.flush()
            await session.commit()
            print(f"  [OK] Synced {len(lesson_rows)} lessons!")

        # ─────────────────────────────────────────────────────────────
        # 9. QUESTIONS
        # ─────────────────────────────────────────────────────────────
        question_rows = data.get("questions", [])
        if question_rows:
            print(f"[*] Processing {len(question_rows)} questions...")
            for row in question_rows:
                async with session.begin_nested():
                    existing = await session.scalar(select(Question).where(Question.id == row["id"]))
                    if not existing:
                        target_topic_id = topic_id_map.get(row["topic_id"], row["topic_id"])
                        options = parse_json(row.get("options")) or {}

                        q = Question(
                            id=row["id"],
                            topic_id=target_topic_id,
                            content=row.get("content", ""),
                            options=options,
                            correct_option=row.get("correct_option", "A"),
                            difficulty_b=float(row["difficulty_b"]) if row.get("difficulty_b") is not None else None,
                            discrimination_a=float(row["discrimination_a"]) if row.get("discrimination_a") is not None else None,
                            guessing_c=float(row["guessing_c"]) if row.get("guessing_c") is not None else None,
                            response_count=int(row.get("response_count", 0)),
                            correct_count=int(row.get("correct_count", 0)),
                            skip_count=int(row.get("skip_count", 0)),
                            avg_response_time_ms=int(row.get("avg_response_time_ms", 0)),
                            is_flagged=bool(row.get("is_flagged", False)),
                            is_provisional=bool(row.get("is_provisional", False)),
                        )
                        session.add(q)
                        await session.flush()
            await session.commit()
            print(f"  [OK] Synced {len(question_rows)} questions!")

        # ─────────────────────────────────────────────────────────────
        # 10. POSTGRES SERIAL SEQUENCE RESETS
        # ─────────────────────────────────────────────────────────────
        all_tables = [
            "users", "institutions", "invoices", "moderation_reports",
            "audit_logs", "topics", "courses", "modules", "lessons", "questions"
        ]
        for tbl in all_tables:
            try:
                seq_query = text(f"""
                    SELECT setval(
                        pg_get_serial_sequence('{tbl}', 'id'),
                        COALESCE((SELECT MAX(id) FROM "{tbl}"), 1),
                        true
                    )
                """)
                await session.execute(seq_query)
            except Exception:
                pass
        await session.commit()

    print("\n[SUCCESS] All seed data successfully loaded into target database!")


if __name__ == "__main__":
    asyncio.run(load_data())
