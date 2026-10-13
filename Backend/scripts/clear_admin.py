import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.models.admin_models import Institution, Invoice, ModerationReport, AuditLog

async def clear_admin_tables():
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Invoice))
        await db.execute(delete(Institution))
        await db.execute(delete(ModerationReport))
        await db.execute(delete(AuditLog))
        await db.commit()
        print("Admin tables cleared successfully!")

if __name__ == "__main__":
    asyncio.run(clear_admin_tables())
