"""
scripts/seed_demo_users.py
───────────────────────────
Creates demo user accounts in the DB for local testing.
Run ONCE after `alembic upgrade head`:

    python scripts/seed_demo_users.py

Demo accounts created:
    student@iit.edu      / demo1234  (role: student)
    alan@iit.edu         / demo1234  (role: instructor)
    admin@aquire.io      / demo1234  (role: admin)
"""
from __future__ import annotations

import asyncio
import sys
import os

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.student import User

DEMO_USERS = [
    {"email": "student@iit.edu",  "full_name": "Demo Student",    "role": "student",    "password": "demo1234"},
    {"email": "alan@iit.edu",     "full_name": "Alan (Instructor)", "role": "instructor", "password": "demo1234"},
    {"email": "admin@aquire.io",  "full_name": "A-Quire Admin",   "role": "admin",      "password": "demo1234"},
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        async with db.begin():
            for u in DEMO_USERS:
                existing = await db.scalar(select(User).where(User.email == u["email"]))
                if existing:
                    print(f"  [SKIP] {u['email']} already exists")
                    continue

                user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    hashed_password=get_password_hash(u["password"]),
                    onboarding_complete=True,
                    email_verified=True,
                    is_active=True,
                )
                db.add(user)
                print(f"  [CREATE] {u['email']} ({u['role']})")

    print("\nDone! You can now log in with email+password on the login page.")
    print("  POST /api/v1/auth/login  { email, password }")


if __name__ == "__main__":
    asyncio.run(seed())
