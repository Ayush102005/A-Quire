"""
scripts/seed_production.py
────────────────────────────
Idempotent bootstrap script to seed initial admin, institutions,
core topics, and starter data on a fresh production PostgreSQL deployment.

Usage:
    docker compose exec backend python scripts/seed_production.py
    # Or locally:
    python scripts/seed_production.py
"""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.student import User
from app.models.admin_models import Institution, Invoice, ModerationReport, AuditLog
from app.models.assessment import Topic
from app.models.course import Course

DEFAULT_ADMIN_EMAIL = os.getenv("INITIAL_ADMIN_EMAIL", "admin@aquire.io")
DEFAULT_ADMIN_PASSWORD = os.getenv("INITIAL_ADMIN_PASSWORD", "AquireAdmin2026!")

CORE_TOPICS = [
    ("Kinematics 1D", "Physics"),
    ("Newton's Laws of Motion", "Physics"),
    ("Work, Energy & Power", "Physics"),
    ("Thermodynamics", "Physics"),
    ("Arrays & Strings", "DSA"),
    ("Linked Lists", "DSA"),
    ("Trees & Graphs", "DSA"),
    ("Sorting & Searching", "DSA"),
    ("Python Fundamentals", "Python"),
    ("NumPy & Pandas", "Python"),
    ("Machine Learning Basics", "ML"),
    ("Neural Networks", "ML"),
    ("Intro to CS", "CS"),
]

async def seed_production():
    print("[*] Starting production database bootstrap...")
    async with AsyncSessionLocal() as db:
        # 1. Admin User
        admin = await db.scalar(select(User).where(User.email == DEFAULT_ADMIN_EMAIL))
        if not admin:
            admin = User(
                email=DEFAULT_ADMIN_EMAIL,
                full_name="A-Quire System Admin",
                role="admin",
                hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
                onboarding_complete=True,
                email_verified=True,
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            print(f"  [+] Created initial admin account: {DEFAULT_ADMIN_EMAIL}")
        else:
            print(f"  [.] Admin account already exists: {DEFAULT_ADMIN_EMAIL}")

        # 2. Institutions
        inst_count = await db.scalar(select(Institution).limit(1))
        if not inst_count:
            institutions = [
                Institution(name="IIT Bombay", tier="Enterprise", mrr=420000.0, status="Healthy"),
                Institution(name="BITS Pilani", tier="Academic Pro", mrr=280000.0, status="Healthy"),
                Institution(name="NIT Trichy", tier="Academic Pro", mrr=150000.0, status="At Risk"),
                Institution(name="Delhi University", tier="Trial", mrr=0.0, status="Trial"),
            ]
            db.add_all(institutions)
            await db.commit()
            print("  [+] Seeded institutions")
        else:
            print("  [.] Institutions already seeded")

        # 3. Assessment Topics
        for name, subject in CORE_TOPICS:
            existing_topic = await db.scalar(select(Topic).where(Topic.name == name))
            if not existing_topic:
                topic = Topic(name=name, subject=subject)
                db.add(topic)
        await db.commit()
        print("  [+] Core assessment topics verified/seeded")

    print("[SUCCESS] Production database bootstrap complete!")

if __name__ == "__main__":
    asyncio.run(seed_production())
