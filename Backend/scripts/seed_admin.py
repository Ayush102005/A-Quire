import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.admin_models import Institution, Invoice, ModerationReport, AuditLog

async def seed_admin_tables():
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        inst_count = await db.scalar(select(Institution).limit(1))
        if inst_count:
            print("Already seeded. Exiting.")
            return

        institutions = [
            Institution(name="IIT Bombay", tier="Enterprise", mrr=420000.0, status="Healthy"),
            Institution(name="BITS Pilani", tier="Academic Pro", mrr=280000.0, status="Healthy"),
            Institution(name="NIT Trichy", tier="Academic Pro", mrr=150000.0, status="At Risk"),
            Institution(name="Delhi University", tier="Trial", mrr=0.0, status="Trial"),
        ]
        db.add_all(institutions)
        await db.commit()
        
        # Fetch the created institutions
        iit_bombay = (await db.scalars(select(Institution).filter_by(name="IIT Bombay"))).first()
        bits = (await db.scalars(select(Institution).filter_by(name="BITS Pilani"))).first()
        nit = (await db.scalars(select(Institution).filter_by(name="NIT Trichy"))).first()

        invoices = [
            Invoice(invoice_number="INV-2026-104", institution_id=iit_bombay.id, amount=420000.0, status="Paid"),
            Invoice(invoice_number="INV-2026-103", institution_id=bits.id, amount=280000.0, status="Paid"),
            Invoice(invoice_number="INV-2026-102", institution_id=nit.id, amount=150000.0, status="Paid"),
        ]
        db.add_all(invoices)
        
        moderation_reports = [
            ModerationReport(report_type="Inappropriate Content", course_context="Physics 301 · Entropy Notes", reporter="Priya Nair", severity="high"),
            ModerationReport(report_type="Plagiarism Flag", course_context="Math 201 · Assignment 3", reporter="System AI", severity="medium"),
            ModerationReport(report_type="Abusive Language", course_context="Chem 101 · Discussion", reporter="Riya Sharma", severity="high"),
            ModerationReport(report_type="Copyright Violation", course_context="Bio 401 · Lecture Upload", reporter="Karan Verma", severity="medium"),
            ModerationReport(report_type="Spam Report", course_context="CS 101 · Forum", reporter="System AI", severity="low"),
        ]
        db.add_all(moderation_reports)
        
        audit_logs = [
            AuditLog(actor="admin@aquire.in", action="Suspended user account", target="riya.sharma@iit.ac.in", log_type="danger"),
            AuditLog(actor="System", action="Auto-renewed subscription", target="IIT Bombay · Enterprise", log_type="success"),
            AuditLog(actor="billing@aquire.in", action="Updated plan pricing", target="Academic Pro tier", log_type="warn"),
            AuditLog(actor="System", action="Backup completed", target="DB snapshot v2026-05-17", log_type="success"),
            AuditLog(actor="admin@aquire.in", action="Bulk-exported user data", target="2,400 records · CSV", log_type="warn"),
            AuditLog(actor="System", action="AI model updated", target="Intervention model v2.4", log_type="info"),
        ]
        db.add_all(audit_logs)

        await db.commit()
        print("Admin tables seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_admin_tables())
