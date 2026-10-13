"""
app/api/v1/admin.py
────────────────────
Admin dashboard routes.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.roles import get_admin_user
from app.db.session import get_db
from app.models.student import User
from app.models.course import Course
from app.models.admin_models import Institution, Invoice, ModerationReport, AuditLog
from app.schemas.admin import InstitutionCreate, InstitutionResponse
from pydantic import BaseModel
from fastapi import HTTPException

router = APIRouter(tags=["Admin"])

@router.get("/admin/dashboard")
async def get_admin_dashboard(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch all users for the users tab
    users_stmt = select(User).order_by(User.created_at.desc())
    users_result = await db.execute(users_stmt)
    db_users = users_result.scalars().all()

    # Get user counts
    stmt = select(User.role, func.count(User.id)).group_by(User.role)
    result = await db.execute(stmt)
    role_counts = {role: count for role, count in result.all()}
    
    total_users = sum(role_counts.values())
    students = role_counts.get("student", 0)
    instructors = role_counts.get("instructor", 0)
    admins = role_counts.get("admin", 0)

    # Get active courses / institutions proxy
    courses_count = await db.scalar(select(func.count(Course.id)))
    
    # Fetch data from admin tables
    inst_result = await db.execute(select(Institution).order_by(Institution.created_at.desc()))
    institutions = inst_result.scalars().all()

    inv_result = await db.execute(select(Invoice, Institution).join(Institution).order_by(Invoice.created_at.desc()))
    invoices = inv_result.all()

    mod_result = await db.execute(select(ModerationReport).where(ModerationReport.is_resolved == False).order_by(ModerationReport.created_at.desc()))
    moderations = mod_result.scalars().all()

    audit_result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()))
    audits = audit_result.scalars().all()

    def pct(count: int) -> float:
        if total_users == 0:
            return 0.0
        return round((count / total_users) * 100, 1)

    total_mrr = sum(inst.mrr for inst in institutions) if institutions else 0.0

    # Calculate subscriptions by tier
    tiers = {}
    for inst in institutions:
        if inst.tier not in tiers:
            tiers[inst.tier] = {"count": 0, "mrr": 0.0}
        tiers[inst.tier]["count"] += 1
        tiers[inst.tier]["mrr"] += inst.mrr

    subscriptions_data = []
    for tier, data in tiers.items():
        arr = data["mrr"] * 12
        arr_str = f"₹{arr:,.1f}"
        if arr >= 100000:
            arr_str = f"₹{arr/100000:,.1f}L"
            
        status = "healthy" if tier != "Trial" else "trial"
        if tier == "Academic Pro" and arr < 500000:
            status = "at-risk"

        subscriptions_data.append({
            "plan": tier,
            "institutions": data["count"],
            "arr": arr_str,
            "status": status
        })

    total_mrr_str = f"₹{total_mrr:,.1f}"
    if total_mrr >= 100000:
        total_mrr_str = f"₹{total_mrr/100000:,.1f}L"

    return {
        "metrics": [
            {"label": "Total Users", "value": f"{total_users:,}", "delta": "+0", "up": True, "sub": "across all roles"},
            {"label": "Active Courses", "value": f"{courses_count:,}", "delta": "+0", "up": True, "sub": "published online"},
            {"label": "MRR", "value": total_mrr_str, "delta": "+0%", "up": True, "sub": "monthly recurring"},
            {"label": "API Requests / day", "value": "1.2M", "delta": "+5%", "up": True, "sub": "avg last 7 days"},
        ],
        "roles": [
            {"role": "Students", "count": students, "pct": pct(students), "color": "bg-teal-500"},
            {"role": "Instructors", "count": instructors, "pct": pct(instructors), "color": "bg-indigo-400"},
            {"role": "Platform Admins", "count": admins, "pct": pct(admins), "color": "bg-stone-400"},
        ],
        "subscriptions": subscriptions_data,
        "users": [
            {
                "id": u.id,
                "name": u.full_name,
                "email": u.email,
                "role": u.role,
                "status": "Active" if u.is_active else "Suspended",
                "institution_id": u.institution_id,
                "joined": u.created_at.strftime("%b %d, %Y") if u.created_at else "Unknown"
            }
            for u in db_users
        ],
        "institutions": [{
                "id": inst.id,
                "name": inst.name,
                "users": "Unknown",  # We don't track users per institution yet
                "tier": inst.tier,
                "mrr": f"₹{inst.mrr:,.1f}L" if inst.mrr >= 100000 else f"₹{inst.mrr:,.0f}",
                "status": inst.status,
            }
            for inst in institutions
        ],
        "billing_invoices": [
            {
                "id": inv.Invoice.invoice_number,
                "institution": inv.Institution.name,
                "amount": f"₹{inv.Invoice.amount:,.0f}",
                "status": inv.Invoice.status,
            }
            for inv in invoices
        ],
        "moderation": [
            {
                "id": f"#M-{mod.id}",
                "type": mod.report_type,
                "course": mod.course_context,
                "reporter": mod.reporter,
                "time": mod.created_at.strftime("%b %d, %H:%M") if mod.created_at else "Unknown",
                "severity": mod.severity,
            }
            for mod in moderations
        ],
        "audit": [
            {
                "actor": aud.actor,
                "action": aud.action,
                "target": aud.target,
                "time": aud.created_at.strftime("%b %d, %H:%M") if aud.created_at else "Unknown",
                "type": aud.log_type,
            }
            for aud in audits
        ],
        "health": [
            {"label": "API Gateway", "status": "operational", "latency": "42ms", "uptime": "100%"},
            {"label": "Database", "status": "operational", "latency": "8ms", "uptime": "100%"},
            {"label": "Auth Service", "status": "operational", "latency": "19ms", "uptime": "100%"},
        ]
    }

@router.post("/admin/institutions", response_model=InstitutionResponse)
async def create_institution(
    data: InstitutionCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    institution = Institution(
        name=data.name,
        tier=data.tier,
        mrr=data.mrr,
        status=data.status
    )
    db.add(institution)
    
    audit_log = AuditLog(
        actor=current_user.email,
        action="Created institution",
        target=institution.name,
        log_type="info"
    )
    db.add(audit_log)
    
    await db.commit()
    await db.refresh(institution)
    
    return institution

from pydantic import BaseModel
from fastapi import HTTPException

class UserRoleUpdate(BaseModel):
    role: str

class UserStatusUpdate(BaseModel):
    is_active: bool

@router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if data.role not in ["student", "instructor", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = data.role
    
    audit_log = AuditLog(
        actor=current_user.email,
        action=f"Changed role to {data.role}",
        target=user.email,
        log_type="warn"
    )
    db.add(audit_log)
    await db.commit()
    return {"status": "success"}

@router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = data.is_active
    
    action = "Activated user" if data.is_active else "Suspended user"
    log_type = "info" if data.is_active else "danger"
    
    audit_log = AuditLog(
        actor=current_user.email,
        action=action,
        target=user.email,
        log_type=log_type
    )
    db.add(audit_log)
    await db.commit()
    return {"status": "success"}

@router.put("/admin/moderation/{report_id}/resolve")
async def resolve_moderation_report(
    report_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ModerationReport).where(ModerationReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    report.is_resolved = True
    
    audit_log = AuditLog(
        actor=current_user.email,
        action="Resolved moderation report",
        target=f"Report #{report.id}",
        log_type="success"
    )
    db.add(audit_log)
    await db.commit()
    return {"status": "success"}

class UserInstitutionUpdate(BaseModel):
    institution_id: int | None

@router.put("/admin/users/{user_id}/institution")
async def update_user_institution(
    user_id: int,
    data: UserInstitutionUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.institution_id = data.institution_id
    
    inst_name = "None"
    if data.institution_id:
        inst_res = await db.execute(select(Institution).where(Institution.id == data.institution_id))
        inst = inst_res.scalar_one_or_none()
        if inst:
            inst_name = inst.name
            
    audit_log = AuditLog(
        actor=current_user.email,
        action=f"Assigned to institution: {inst_name}",
        target=user.email,
        log_type="info"
    )
    db.add(audit_log)
    await db.commit()
    return {"status": "success"}
