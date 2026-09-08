"""
app/api/v1/instructor_analytics.py
──────────────────────────────────
Real-data analytics endpoints for Instructors.
"""
from __future__ import annotations

import datetime
from typing import Optional, List, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, desc, or_, text, Integer
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import rate_limit
from app.models.student import User
from app.models.course import Course
from app.models.module import Module
from app.models.lesson import Lesson
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.struggle_event import StruggleEvent
from app.models.assessment import QuizResponse, QuizSession, Question, Topic
from app.models.notification import Notification
from app.services.problem_bank import get_problem
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/analytics/instructor", tags=["Instructor Analytics"])


async def get_instructor_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Instructor or Admin role required."
        )
    return current_user


async def verify_course_access(course_id: int, user: User, db: AsyncSession):
    if user.role == "admin":
        return
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.instructor_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have access to analytics for this course.")


def apply_date_filter(stmt, date_col, start_date: Optional[datetime.datetime], end_date: Optional[datetime.datetime]):
    if start_date:
        stmt = stmt.where(date_col >= start_date)
    if end_date:
        stmt = stmt.where(date_col <= end_date)
    return stmt


class OverviewResponse(BaseModel):
    active_learners: int
    completion_rate: Optional[float]
    avg_accuracy: Optional[float]
    at_risk_learners: int
    questions_attempted: int
    intervention_rate: Optional[float]


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    course_id: int,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    await verify_course_access(course_id, current_user, db)

    # Base CTEs or subqueries for active users
    # Progress activity
    prog_stmt = select(Progress.user_id).join(Lesson, Lesson.id == Progress.lesson_id)\
        .join(Module, Module.id == Lesson.module_id)\
        .where(Module.course_id == course_id)
    prog_stmt = apply_date_filter(prog_stmt, Progress.updated_at, start_date, end_date)

    # Quiz activity (using sessions joined to topics conceptually, but simpler via events or progress if possible. We'll join via QuizSession -> Lesson ? No, QuizSession links to Topic, not Lesson directly in current schema. Let's use Struggle events as activity)
    strug_stmt = select(StruggleEvent.user_id).where(StruggleEvent.course_id == course_id)
    strug_stmt = apply_date_filter(strug_stmt, StruggleEvent.created_at, start_date, end_date)

    active_user_ids_prog = (await db.scalars(prog_stmt)).all()
    active_user_ids_strug = (await db.scalars(strug_stmt)).all()
    active_users = set(active_user_ids_prog) | set(active_user_ids_strug)
    active_learners = len(active_users)

    # Completion rate: Total enrolled learners vs total who have completed all lessons? Or average of completion_percent?
    # We will define it as: Average completion_percent across all Progress records for this course
    comp_stmt = select(func.avg(Progress.completion_percent)).join(Lesson).join(Module).where(Module.course_id == course_id)
    completion_rate = await db.scalar(comp_stmt)

    # Average accuracy — scoped directly by QuizSession.course_id (set when
    # the quiz was launched, see assessments.py/quizzes.py), not by "any
    # AMATTA activity by a student enrolled in this course" (which pulled in
    # unrelated topics — see the course_id field comment on QuizSession).
    acc_stmt = select(func.avg(func.cast(QuizResponse.is_correct, Integer))).join(QuizSession)\
        .where(QuizSession.course_id == course_id)
    acc_stmt = apply_date_filter(acc_stmt, QuizResponse.created_at, start_date, end_date)
    avg_accuracy = await db.scalar(acc_stmt)

    # Questions attempted
    atmpt_stmt = select(func.count(QuizResponse.id)).join(QuizSession).where(QuizSession.course_id == course_id)
    atmpt_stmt = apply_date_filter(atmpt_stmt, QuizResponse.created_at, start_date, end_date)
    questions_attempted = await db.scalar(atmpt_stmt) or 0

    # At risk learners: >2 struggles and avg completion < 50%
    risk_strug = select(StruggleEvent.user_id).where(StruggleEvent.course_id == course_id)\
        .group_by(StruggleEvent.user_id).having(func.count(StruggleEvent.id) > 2)
    risk_users = (await db.scalars(risk_strug)).all()
    at_risk_learners = len(risk_users)

    # Intervention rate
    interv_stmt = select(func.count(StruggleEvent.id)).where(StruggleEvent.course_id == course_id)
    interv_stmt = apply_date_filter(interv_stmt, StruggleEvent.created_at, start_date, end_date)
    total_struggles = await db.scalar(interv_stmt) or 0
    
    if total_struggles > 0:
        interv_hints_stmt = select(func.count(StruggleEvent.id)).where(
            StruggleEvent.course_id == course_id, StruggleEvent.hint_text.isnot(None)
        )
        interv_hints_stmt = apply_date_filter(interv_hints_stmt, StruggleEvent.created_at, start_date, end_date)
        interv_hints = await db.scalar(interv_hints_stmt) or 0
        intervention_rate = interv_hints / total_struggles
    else:
        intervention_rate = None

    if completion_rate is not None:
        completion_rate = float(completion_rate) / 100.0  # normalize 0-1
    if avg_accuracy is not None:
        avg_accuracy = float(avg_accuracy)

    return OverviewResponse(
        active_learners=active_learners,
        completion_rate=completion_rate,
        avg_accuracy=avg_accuracy,
        at_risk_learners=at_risk_learners,
        questions_attempted=questions_attempted,
        intervention_rate=intervention_rate
    )


class QueueAction(BaseModel):
    type: str
    tab: str
    topic: Optional[str] = None
    user_id: Optional[int] = None

class QueueItem(BaseModel):
    type: str
    severity: str
    title: str
    reason: str
    course_id: int
    topic: Optional[str] = None
    action: QueueAction


@router.get("/priority-queue", response_model=List[QueueItem])
async def get_priority_queue(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    await verify_course_access(course_id, current_user, db)
    queue = []

    # Concept needs revision
    concept_stmt = select(
        Topic.name,
        func.count(QuizResponse.id).label('attempts'),
        func.avg(func.cast(QuizResponse.is_correct, Integer)).label('acc')
    ).join(Question, Question.topic_id == Topic.id)\
     .join(QuizResponse, QuizResponse.question_id == Question.id)\
     .join(QuizSession, QuizResponse.session_id == QuizSession.id)\
     .where(QuizSession.course_id == course_id)\
     .group_by(Topic.name)\
     .having(and_(func.count(QuizResponse.id) >= 10, func.avg(func.cast(QuizResponse.is_correct, Integer)) < 0.6))

    concepts = (await db.execute(concept_stmt)).all()
    for c in concepts:
        queue.append(QueueItem(
            type="concept_revision",
            severity="high" if c.acc < 0.4 else "medium",
            title=f"{c.name} needs revision",
            reason=f"{int(c.acc * 100)}% accuracy across {c.attempts} attempts.",
            course_id=course_id,
            topic=c.name,
            action=QueueAction(type="open_concept", tab="concepts", topic=c.name)
        ))

    # Learner follow-up
    struggle_stmt = select(
        User.id,
        User.full_name,
        func.count(StruggleEvent.id).label('count')
    ).join(StruggleEvent, StruggleEvent.user_id == User.id)\
     .where(StruggleEvent.course_id == course_id, StruggleEvent.severity >= 0.7)\
     .group_by(User.id, User.full_name)\
     .having(func.count(StruggleEvent.id) >= 3)\
     .order_by(desc('count'))\
     .limit(5)
    
    struggling_users = (await db.execute(struggle_stmt)).all()
    for u in struggling_users:
        queue.append(QueueItem(
            type="learner_follow_up",
            severity="high",
            title=f"Check on {u.full_name}",
            reason=f"{u.count} high-severity struggle events recently.",
            course_id=course_id,
            action=QueueAction(type="view_learner", tab="learners", user_id=u.id)
        ))

    return queue


class ConceptRow(BaseModel):
    topic: str
    learner_count: int
    attempt_count: int
    accuracy: Optional[float]
    hint_rate: Optional[float]
    trend: Optional[float]

@router.get("/concepts", response_model=List[ConceptRow])
async def get_concepts(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    await verify_course_access(course_id, current_user, db)

    stmt = select(
        Topic.name,
        func.count(func.distinct(QuizSession.user_id)).label('learners'),
        func.count(QuizResponse.id).label('attempts'),
        func.avg(func.cast(QuizResponse.is_correct, Integer)).label('accuracy')
    ).select_from(Topic)\
     .join(Question, Question.topic_id == Topic.id)\
     .join(QuizResponse, QuizResponse.question_id == Question.id)\
     .join(QuizSession, QuizResponse.session_id == QuizSession.id)\
     .where(QuizSession.course_id == course_id)\
     .group_by(Topic.name)
    
    rows = (await db.execute(stmt)).all()
    return [
        ConceptRow(
            topic=r.name,
            learner_count=r.learners,
            attempt_count=r.attempts,
            accuracy=float(r.accuracy) if r.accuracy is not None else None,
            hint_rate=None,
            trend=None
        )
        for r in rows
    ]


class LearnerRow(BaseModel):
    id: int
    name: str
    email: str
    last_activity: Optional[datetime.datetime]
    progress_percent: Optional[float]
    accuracy: Optional[float]
    struggle_count: int
    risk_tier: str
    risk_reasons: List[str]

@router.get("/learners", response_model=dict)
async def get_learners(
    course_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    await verify_course_access(course_id, current_user, db)

    stmt = select(User).join(Enrollment, Enrollment.user_id == User.id).where(Enrollment.course_id == course_id)
    if search:
        stmt = stmt.where(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    
    users = (await db.scalars(stmt.offset((page - 1) * page_size).limit(page_size))).all()

    results = []
    for u in users:
        # Get progress
        prog = await db.scalar(select(func.avg(Progress.completion_percent)).join(Lesson).join(Module).where(Module.course_id == course_id, Progress.user_id == u.id))
        
        # Get accuracy — scoped to this course's QuizSessions only (see the
        # course_id filter used by the sibling endpoints in this file); a
        # user_id-only filter here would leak accuracy from the learner's
        # unrelated activity in other courses.
        acc = await db.scalar(
            select(func.avg(func.cast(QuizResponse.is_correct, Integer)))
            .join(QuizSession)
            .where(QuizSession.course_id == course_id, QuizSession.user_id == u.id)
        )
        
        # Get struggles
        struggles = (await db.execute(
            select(func.count(StruggleEvent.id), func.max(StruggleEvent.created_at))
            .where(StruggleEvent.course_id == course_id, StruggleEvent.user_id == u.id)
        )).first()
        struggle_count = struggles[0] or 0
        last_activity = struggles[1]

        risk_tier = "low"
        risk_reasons = []
        if struggle_count > 5 and (acc is None or acc < 0.6):
            risk_tier = "high"
            risk_reasons.append("High number of struggles and low accuracy")
        elif struggle_count > 2 or (acc is not None and acc < 0.6):
            risk_tier = "medium"
            if struggle_count > 2: risk_reasons.append("Frequent struggles")
            if (acc is not None and acc < 0.6): risk_reasons.append("Below average accuracy")

        results.append(LearnerRow(
            id=u.id,
            name=u.full_name,
            email=u.email,
            last_activity=last_activity,
            progress_percent=float(prog) if prog is not None else 0.0,
            accuracy=float(acc) if acc is not None else None,
            struggle_count=struggle_count,
            risk_tier=risk_tier,
            risk_reasons=risk_reasons
        ))

    return {
        "data": results,
        "total": total,
        "page": page,
        "page_size": page_size
    }


class AssessmentRow(BaseModel):
    id: int
    stem: str
    topic: str
    difficulty: str
    attempts: int
    accuracy: Optional[float]
    avg_response_time_ms: int

@router.get("/assessments", response_model=List[AssessmentRow])
async def get_assessments(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    await verify_course_access(course_id, current_user, db)

    # Scope directly by QuizSession.course_id (set when the quiz was
    # launched — see assessments.py/quizzes.py) rather than "any activity by
    # a student enrolled in this course," which pulled in unrelated topics
    # (e.g. a DSA student's unrelated Physics practice) — see the course_id
    # field comment on QuizSession (app/models/assessment.py) for the full
    # rationale.
    stmt = select(
        Question.id,
        Question.content,
        Topic.name.label("topic_name"),
        Question.difficulty_b,
        func.count(QuizResponse.id).label('attempts'),
        func.avg(func.cast(QuizResponse.is_correct, Integer)).label('accuracy'),
        func.avg(Question.avg_response_time_ms).label('avg_time')
    ).join(Topic, Topic.id == Question.topic_id)\
     .join(QuizResponse, QuizResponse.question_id == Question.id)\
     .join(QuizSession, QuizResponse.session_id == QuizSession.id)\
     .where(QuizSession.course_id == course_id)\
     .group_by(Question.id, Question.content, Topic.name, Question.difficulty_b)\
     .order_by(desc('attempts'))\
     .limit(50)

    rows = (await db.execute(stmt)).all()
    
    def get_diff_label(b: float):
        if b < -1.0: return "Easy"
        if b > 1.0: return "Hard"
        return "Medium"

    return [
        AssessmentRow(
            id=r.id,
            stem=r.content[:50] + "..." if len(r.content) > 50 else r.content,
            topic=r.topic_name,
            difficulty=get_diff_label(r.difficulty_b),
            attempts=r.attempts,
            accuracy=float(r.accuracy) if r.accuracy is not None else None,
            avg_response_time_ms=int(r.avg_time or 0)
        )
        for r in rows
    ]


class AttentionResponse(BaseModel):
    available: bool
    reason: Optional[str] = None
    avg_fixation_ms: Optional[int] = None
    avg_inactivity_ms: Optional[int] = None
    total_events: Optional[int] = None

@router.get("/attention", response_model=AttentionResponse)
async def get_attention(
    course_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    await verify_course_access(course_id, current_user, db)

    stmt = select(
        func.avg(StruggleEvent.fixation_duration_ms),
        func.avg(StruggleEvent.inactivity_duration_ms),
        func.count(StruggleEvent.id)
    ).where(StruggleEvent.course_id == course_id)

    row = (await db.execute(stmt)).first()

    if not row or row[2] == 0:
        return AttentionResponse(
            available=False,
            reason="Consent-aware aggregate attention data is not available yet."
        )

    return AttentionResponse(
        available=True,
        avg_fixation_ms=int(row[0] or 0),
        avg_inactivity_ms=int(row[1] or 0),
        total_events=row[2]
    )


class InstructorStudentRow(BaseModel):
    id: int
    name: str
    email: str
    struggles: int
    resolved: int
    risk: str


@router.get("/students", response_model=List[InstructorStudentRow],
            summary="All students enrolled in any of the instructor's own courses")
async def get_all_students(
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    """
    Scoped to the requesting instructor's own courses only — a student must
    be enrolled in at least one course this instructor teaches to appear
    here. Admins (see verify_course_access's bypass elsewhere in this file)
    see every enrolled student platform-wide.
    """
    if current_user.role == "admin":
        owned_course_ids_stmt = select(Course.id)
    else:
        owned_course_ids_stmt = select(Course.id).where(Course.instructor_id == current_user.id)
    owned_course_ids = list((await db.scalars(owned_course_ids_stmt)).all())

    if not owned_course_ids:
        return []

    # Two-step lookup rather than `select(User)...distinct()`: Postgres has no
    # equality operator for plain `json` columns (User.preferences uses JSON,
    # not JSONB — see app/models/student.py), so a DISTINCT over full User
    # rows raises `UndefinedFunctionError: could not identify an equality
    # operator for type json`. That crash was being swallowed by the frontend
    # (StudentsTab.jsx just logs the error and renders the same "No students
    # enrolled yet." as a genuine empty result), which made a real 500 look
    # like an empty class list. Deduping on the plain-integer Enrollment.user_id
    # column avoids DISTINCT ever touching the JSON column.
    student_id_stmt = (
        select(Enrollment.user_id)
        .where(Enrollment.course_id.in_(owned_course_ids))
        .distinct()
    )
    student_ids = list((await db.scalars(student_id_stmt)).all())
    if not student_ids:
        return []

    students = (await db.scalars(select(User).where(User.id.in_(student_ids)))).all()

    results = []
    for u in students:
        struggles = await db.scalar(
            select(func.count(StruggleEvent.id)).where(
                StruggleEvent.user_id == u.id,
                StruggleEvent.course_id.in_(owned_course_ids),
            )
        ) or 0
        resolved = await db.scalar(
            select(func.count(StruggleEvent.id)).where(
                StruggleEvent.user_id == u.id,
                StruggleEvent.course_id.in_(owned_course_ids),
                StruggleEvent.hint_text.isnot(None),
            )
        ) or 0
        risk = "high" if struggles > 5 else "medium" if struggles > 2 else "low"
        results.append(InstructorStudentRow(
            id=u.id, name=u.full_name, email=u.email,
            struggles=struggles, resolved=resolved, risk=risk,
        ))

    return results


class StudentCourseProgress(BaseModel):
    course_id: int
    course_title: str
    lessons_completed: int
    lessons_total: int
    completion_pct: float


class StudentStruggleDetail(BaseModel):
    id: int
    title: str
    event_type: str
    context_type: str
    severity: float
    hint_text: str | None
    created_at: datetime.datetime


class InstructorStudentDetail(BaseModel):
    id: int
    name: str
    email: str
    struggles: int
    resolved: int
    risk: str
    courses: List[StudentCourseProgress]
    # Full history, most recent first — not just the count StudentDrawer
    # showed before. Capped at 50: this is a drawer panel, not a paginated
    # audit log; /struggle/events (student-facing) already exists for a
    # complete unbounded history if that's ever needed here too.
    recent_struggles: List[StudentStruggleDetail]


@router.get("/students/{student_id}", response_model=InstructorStudentDetail,
            summary="Full detail for one student — courses, progress, and struggle/hint history")
async def get_student_detail(
    student_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    """
    Backs the "View Details" drawer on the Students tab, which previously
    only repeated the same three numbers already visible in the table row
    (struggle count, resolved count, risk badge) — nothing about *which*
    lessons/problems the student struggled on, whether they got a real
    hint each time, or how they're actually progressing through the
    instructor's courses. This is the actual "everything" behind a
    student's name.
    """
    owned_course_ids = list((await db.scalars(_owned_course_ids_stmt(current_user))).all())
    if not owned_course_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")

    # Scoped the same way /students (the list endpoint) is — a student must
    # be enrolled in at least one course this instructor teaches to be
    # visible here at all, regardless of what other courses they're in.
    is_enrolled = await db.scalar(
        select(func.count(Enrollment.id)).where(
            Enrollment.user_id == student_id,
            Enrollment.course_id.in_(owned_course_ids),
        )
    )
    if not is_enrolled:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")

    student = await db.get(User, student_id)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")

    struggles = await db.scalar(
        select(func.count(StruggleEvent.id)).where(
            StruggleEvent.user_id == student_id,
            StruggleEvent.course_id.in_(owned_course_ids),
        )
    ) or 0
    resolved = await db.scalar(
        select(func.count(StruggleEvent.id)).where(
            StruggleEvent.user_id == student_id,
            StruggleEvent.course_id.in_(owned_course_ids),
            StruggleEvent.hint_text.isnot(None),
        )
    ) or 0
    risk = "high" if struggles > 5 else "medium" if struggles > 2 else "low"

    # ── Per-course progress ──────────────────────────────────────────────
    enrolled_course_rows = (await db.execute(
        select(Course.id, Course.title)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .where(Enrollment.user_id == student_id, Course.id.in_(owned_course_ids))
    )).all()

    courses: List[StudentCourseProgress] = []
    for c in enrolled_course_rows:
        lesson_ids = list((await db.scalars(
            select(Lesson.id).join(Module, Module.id == Lesson.module_id).where(Module.course_id == c.id)
        )).all())
        total = len(lesson_ids)
        completed = 0
        if lesson_ids:
            completed = await db.scalar(
                select(func.count(Progress.id)).where(
                    Progress.user_id == student_id,
                    Progress.lesson_id.in_(lesson_ids),
                    Progress.is_completed.is_(True),
                )
            ) or 0
        courses.append(StudentCourseProgress(
            course_id=c.id, course_title=c.title,
            lessons_completed=completed, lessons_total=total,
            completion_pct=round(completed / total * 100, 1) if total else 0.0,
        ))

    # ── Struggle/hint history — same title-resolution as list_struggle_events()
    # in struggle_monitor.py (lesson title, or the problem-bank title for a
    # DSA event — problem_id-keyed events have no lesson_id at all). ──────
    events = (await db.scalars(
        select(StruggleEvent)
        .where(StruggleEvent.user_id == student_id, StruggleEvent.course_id.in_(owned_course_ids))
        .order_by(StruggleEvent.created_at.desc())
        .limit(50)
    )).all()

    lesson_ids_needed = {e.lesson_id for e in events if e.lesson_id}
    lesson_titles: dict[int, str] = {}
    if lesson_ids_needed:
        rows = (await db.execute(
            select(Lesson.id, Lesson.title).where(Lesson.id.in_(lesson_ids_needed))
        )).all()
        lesson_titles = dict(rows)

    def _title_for(event: StruggleEvent) -> str:
        if event.lesson_id:
            return lesson_titles.get(event.lesson_id, f"Lesson #{event.lesson_id}")
        if event.problem_id:
            return get_problem(event.problem_id)["title"]
        return "Untitled"

    recent_struggles = [
        StudentStruggleDetail(
            id=e.id, title=_title_for(e), event_type=e.event_type,
            context_type=e.context_type, severity=e.severity,
            hint_text=e.hint_text, created_at=e.created_at,
        )
        for e in events
    ]

    return InstructorStudentDetail(
        id=student.id, name=student.full_name, email=student.email,
        struggles=struggles, resolved=resolved, risk=risk,
        courses=courses, recent_struggles=recent_struggles,
    )


def _owned_course_ids_stmt(current_user: User):
    if current_user.role == "admin":
        return select(Course.id)
    return select(Course.id).where(Course.instructor_id == current_user.id)


class RecentActivityItem(BaseModel):
    message: str
    time: str


class InstructorSummaryResponse(BaseModel):
    total_struggles: int
    interventions: int
    resolution_rate_pct: float
    at_risk_students: int
    engagement_trend: List[float]
    # Averaged only over weeks that had *some* real activity (video or
    # DSA) — the frontend previously computed "Avg" itself by dividing by
    # all 12 weekly buckets unconditionally, including ones with zero
    # activity (indistinguishable, once collapsed to a bucket average of
    # 0.0, from a week where students genuinely engaged at 0%). One real
    # active week out of 12 silent ones showed as "8% avg", which reads as
    # "barely anyone is engaged" rather than the true story ("100%
    # engagement in the one week anything happened at all"). See
    # get_instructor_summary() for how this is computed from the same raw
    # weekly buckets engagement_trend is built from.
    engagement_trend_avg: float = 0.0
    # Was never a real field at all — InstructorDashboard.jsx's OverviewTab
    # reads summary.recent_activity and falls back to "No new activity
    # recently" when it's missing/empty, which was *always* the case (the
    # field simply didn't exist on this response), regardless of how much
    # real struggle/hint activity had actually happened. See below for how
    # it's populated.
    recent_activity: List[RecentActivityItem] = []


@router.get("/summary", response_model=InstructorSummaryResponse,
            summary="Platform-wide summary across all of the instructor's own courses")
async def get_instructor_summary(
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    owned_course_ids = list((await db.scalars(_owned_course_ids_stmt(current_user))).all())

    if not owned_course_ids:
        return InstructorSummaryResponse(
            total_struggles=0, interventions=0, resolution_rate_pct=0.0,
            at_risk_students=0, engagement_trend=[0.0] * 12,
        )

    total_struggles = await db.scalar(
        select(func.count(StruggleEvent.id)).where(StruggleEvent.course_id.in_(owned_course_ids))
    ) or 0

    interventions = await db.scalar(
        select(func.count(StruggleEvent.id)).where(
            StruggleEvent.course_id.in_(owned_course_ids),
            StruggleEvent.hint_text.isnot(None),
        )
    ) or 0

    resolution_rate_pct = round(interventions / total_struggles * 100, 1) if total_struggles > 0 else 0.0

    # "At risk" mirrors the medium+ risk threshold used by /students — more
    # than 2 struggles across any of this instructor's courses.
    at_risk_stmt = (
        select(StruggleEvent.user_id)
        .where(StruggleEvent.course_id.in_(owned_course_ids))
        .group_by(StruggleEvent.user_id)
        .having(func.count(StruggleEvent.id) > 2)
    )
    at_risk_students = len((await db.scalars(at_risk_stmt)).all())

    # Weekly average "engagement" over the last 12 weeks, across every
    # lesson in the instructor's own courses. Bucketed in Python rather
    # than via SQL date_trunc() so this works identically on the sqlite
    # test DB and the Postgres app DB (see conftest.py).
    #
    # Two real gaps fixed here (both previously silent — the numbers were
    # mathematically correct, just built from an incomplete/misleading
    # picture):
    #
    # 1. This used to be video Progress.completion_percent only. DSA
    #    problems have no watch-time/completion-% concept at all
    #    (DsaProblemPage.tsx never writes to Progress), so a course that's
    #    half DSA content could have real, active students and still show
    #    near-zero engagement here. A struggle event with context_type=
    #    "dsa" is used as a presence signal for that week (100 — "this
    #    student engaged with a DSA problem enough to trigger detection
    #    this week"), not a precision measurement — there's no persisted
    #    "attempt" record for a judge Run/Submit alone (see
    #    app/api/v1/problems.py's judge endpoints, which don't persist
    #    attempts), so a struggle/hint interaction is the closest real
    #    signal available.
    # 2. engagement_trend_avg (returned separately below) is now averaged
    #    only over weeks that had *some* recorded activity — see that
    #    field's own docstring on InstructorSummaryResponse for why.
    twelve_weeks_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(weeks=12)
    trend_stmt = (
        select(Progress.updated_at, Progress.completion_percent)
        .join(Lesson, Lesson.id == Progress.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id.in_(owned_course_ids), Progress.updated_at >= twelve_weeks_ago)
    )
    trend_rows = (await db.execute(trend_stmt)).all()

    dsa_activity_stmt = (
        select(StruggleEvent.created_at)
        .where(
            StruggleEvent.course_id.in_(owned_course_ids),
            StruggleEvent.context_type == "dsa",
            StruggleEvent.created_at >= twelve_weeks_ago,
        )
    )
    dsa_activity_rows = (await db.execute(dsa_activity_stmt)).all()

    today = datetime.datetime.now(datetime.timezone.utc).date()
    current_week_start = today - datetime.timedelta(days=today.weekday())
    week_starts = [current_week_start - datetime.timedelta(weeks=i) for i in range(11, -1, -1)]
    buckets = {ws: [] for ws in week_starts}
    for updated_at, pct in trend_rows:
        d = updated_at.date() if hasattr(updated_at, "date") else updated_at
        ws = d - datetime.timedelta(days=d.weekday())
        if ws in buckets:
            buckets[ws].append(pct)
    for (created_at,) in dsa_activity_rows:
        d = created_at.date() if hasattr(created_at, "date") else created_at
        ws = d - datetime.timedelta(days=d.weekday())
        if ws in buckets:
            buckets[ws].append(100.0)

    engagement_trend = [
        round(sum(vals) / len(vals), 1) if vals else 0.0
        for vals in (buckets[ws] for ws in week_starts)
    ]
    active_week_values = [engagement_trend[i] for i, ws in enumerate(week_starts) if buckets[ws]]
    engagement_trend_avg = round(sum(active_week_values) / len(active_week_values), 1) if active_week_values else 0.0

    recent_activity = await _get_recent_activity(db, owned_course_ids)

    return InstructorSummaryResponse(
        total_struggles=total_struggles,
        interventions=interventions,
        resolution_rate_pct=resolution_rate_pct,
        at_risk_students=at_risk_students,
        engagement_trend=engagement_trend,
        engagement_trend_avg=engagement_trend_avg,
        recent_activity=recent_activity,
    )


def _relative_time(dt: datetime.datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    seconds = int((datetime.datetime.now(datetime.timezone.utc) - dt).total_seconds())
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


async def _get_recent_activity(db: AsyncSession, owned_course_ids: list[int]) -> list["RecentActivityItem"]:
    """
    The most recent struggle events across the instructor's own courses,
    turned into human-readable activity lines. Limited to 8 — this is a
    dashboard summary card, not a full audit log (see
    instructor_analytics's other endpoints / the /students detail view for
    the complete history).
    """
    recent_stmt = (
        select(StruggleEvent, User.full_name)
        .join(User, User.id == StruggleEvent.user_id)
        .where(StruggleEvent.course_id.in_(owned_course_ids))
        .order_by(StruggleEvent.created_at.desc())
        .limit(8)
    )
    recent_rows = (await db.execute(recent_stmt)).all()
    if not recent_rows:
        return []

    lesson_ids_needed = {ev.lesson_id for ev, _ in recent_rows if ev.lesson_id}
    lesson_titles: dict[int, str] = {}
    if lesson_ids_needed:
        lesson_title_rows = (await db.execute(
            select(Lesson.id, Lesson.title).where(Lesson.id.in_(lesson_ids_needed))
        )).all()
        lesson_titles = dict(lesson_title_rows)

    items = []
    for ev, student_name in recent_rows:
        if ev.lesson_id:
            target = lesson_titles.get(ev.lesson_id, f"Lesson #{ev.lesson_id}")
        elif ev.problem_id:
            # get_problem() never throws (unknown slugs get a generic
            # fallback with a title derived from the slug) — see
            # app/services/problem_bank.py — so this is always safe.
            target = get_problem(ev.problem_id)["title"]
        else:
            target = "a lesson"
        verb = "got a hint on" if ev.hint_text else "struggled on"
        items.append(RecentActivityItem(
            message=f'{student_name or "A student"} {verb} "{target}"',
            time=_relative_time(ev.created_at),
        ))
    return items


class LessonHotspotRow(BaseModel):
    id: int
    name: str
    module: str
    struggles: int
    rate: float


@router.get("/lessons", response_model=List[LessonHotspotRow],
            summary="Lessons ranked by struggle rate, across all of the instructor's own courses")
async def get_instructor_lesson_hotspots(
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    owned_course_ids = list((await db.scalars(_owned_course_ids_stmt(current_user))).all())
    if not owned_course_ids:
        return []

    lessons_stmt = (
        select(Lesson.id, Lesson.title, Module.title.label("module_title"), Lesson.problem_id)
        .join(Module, Module.id == Lesson.module_id)
        .where(Module.course_id.in_(owned_course_ids))
    )
    lesson_rows = (await db.execute(lessons_stmt)).all()
    if not lesson_rows:
        return []

    lesson_ids = [r.id for r in lesson_rows]
    # DSA lessons linked to a real problem-bank entry (Lesson.problem_id
    # set — see DsaProblemPage.tsx's fetch effect) record their struggle
    # events keyed by StruggleEvent.problem_id (the bank slug, e.g.
    # "two-sum"), never lesson_id — StruggleEvent's own check constraint
    # only ever allows exactly one of the two. Without accounting for this
    # separately, a bank-linked DSA lesson always showed 0 struggles/0%
    # here regardless of how much real struggle/hint activity it had.
    bank_problem_ids = [r.problem_id for r in lesson_rows if r.problem_id]

    # "Struggles" here is distinct students who triggered a struggle event
    # on this lesson (matching the "Students" column the frontend renders
    # it under), not raw event count — a student mashing through several
    # struggle events on one lesson shouldn't outweigh five different
    # students each struggling once.
    struggles_stmt = (
        select(StruggleEvent.lesson_id, func.count(func.distinct(StruggleEvent.user_id)))
        .where(StruggleEvent.lesson_id.in_(lesson_ids))
        .group_by(StruggleEvent.lesson_id)
    )
    struggles_by_lesson = dict((await db.execute(struggles_stmt)).all())

    struggles_by_problem_id: dict[str, int] = {}
    if bank_problem_ids:
        struggles_by_problem_stmt = (
            select(StruggleEvent.problem_id, func.count(func.distinct(StruggleEvent.user_id)))
            .where(StruggleEvent.problem_id.in_(bank_problem_ids))
            .group_by(StruggleEvent.problem_id)
        )
        struggles_by_problem_id = dict((await db.execute(struggles_by_problem_stmt)).all())

    attempted_stmt = (
        select(Progress.lesson_id, func.count(func.distinct(Progress.user_id)))
        .where(Progress.lesson_id.in_(lesson_ids))
        .group_by(Progress.lesson_id)
    )
    attempted_by_lesson = dict((await db.execute(attempted_stmt)).all())

    results = []
    for r in lesson_rows:
        # A given lesson only ever gets events through one of these two
        # keys (never both — see the constraint note above), so summing is
        # safe and never double-counts the same student.
        struggled = struggles_by_lesson.get(r.id, 0) + (
            struggles_by_problem_id.get(r.problem_id, 0) if r.problem_id else 0
        )
        attempted = attempted_by_lesson.get(r.id, 0)
        # DSA problems have no Progress-table tracking at all (Progress is
        # video watch-time based; DsaProblemPage.tsx never writes to it),
        # so `attempted` is always 0 there — which would force rate to a
        # misleading 0% even when students are demonstrably struggling on
        # it. `struggled` is not a precise attempt count, but it's an
        # honest floor: at minimum this many distinct students engaged
        # with it enough to trigger a struggle event.
        attempted = max(attempted, struggled)
        # Guard against the edge case of a struggle event logged before any
        # Progress row exists for that student/lesson (struggled > attempted).
        rate = min(100.0, round(struggled / attempted * 100, 1)) if attempted > 0 else 0.0
        results.append(LessonHotspotRow(
            id=r.id, name=r.title, module=r.module_title,
            struggles=struggled, rate=rate,
        ))

    results.sort(key=lambda x: x.rate, reverse=True)
    return results


class StudentOperationRequest(BaseModel):
    operation_type: str = Field(..., pattern="^(message|hint|meeting|remove)$")
    content: Optional[str] = None


class StudentOperationResponse(BaseModel):
    status: str


@router.post("/students/{student_id}/operation", response_model=StudentOperationResponse,
             summary="Message/hint/meeting-invite/remove a student from the instructor's own courses")
async def perform_student_operation(
    student_id: int,
    body: StudentOperationRequest,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(30, 60),
):
    """
    Backs the Students table's message/hint/meeting/remove row actions
    (InstructorDashboard.jsx's OperationModal) — previously called an
    endpoint that was never implemented on this side at all (frontend-only
    feature, 404 on every use). Scoped the same way get_student_detail is:
    the student must be enrolled in at least one course this instructor
    owns.
    """
    owned_course_ids = list((await db.scalars(_owned_course_ids_stmt(current_user))).all())
    if not owned_course_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")

    enrollments = (
        await db.execute(
            select(Enrollment).where(
                Enrollment.user_id == student_id,
                Enrollment.course_id.in_(owned_course_ids),
            )
        )
    ).scalars().all()
    if not enrollments:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Student not found.")

    if body.operation_type == "remove":
        # Which enrollment to remove is genuinely ambiguous if the student
        # is in more than one of this instructor's courses — the Students
        # table this action lives on isn't scoped to a single course (see
        # InstructorStudentRow — no course_id), so there's no course
        # context here to disambiguate. Only auto-resolve the unambiguous
        # case; surface the ambiguous one as a real error rather than
        # guessing which course to unenroll them from.
        if len(enrollments) > 1:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="This student is enrolled in more than one of your courses — "
                       "remove them from a specific course instead.",
            )
        await db.delete(enrollments[0])
        await db.commit()
        return StudentOperationResponse(status="removed")

    if not body.content or not body.content.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Message content is required.")

    titles = {
        "message": "Message from your instructor",
        "hint": "Hint from your instructor",
        "meeting": "Meeting request from your instructor",
    }
    notification = Notification(
        user_id=student_id,
        title=titles[body.operation_type],
        message=body.content,
    )
    db.add(notification)
    # flush (not commit) first — assigns notification.id without expiring
    # it, so it's still readable below; commit() would expire every
    # attribute on this session's objects (SQLAlchemy's default
    # expire_on_commit), and a plain attribute read after that triggers a
    # lazy-reload that raises MissingGreenlet outside commit's own await
    # context (same pattern documented in mentor_service.py/assessments.py).
    await db.flush()
    notification_id = notification.id
    await db.commit()

    # Live toast if the student is currently online — GlobalToaster.jsx
    # reacts to type in {"message","hint","alert"} and reads text/hint_text;
    # "meeting" content is already formatted client-side as "Topic: ...\n
    # Link: ..." (see OperationModal's handleSubmit), which GlobalToaster
    # already knows how to split into a clickable action. notification_id
    # lets the toast's action link mark the persisted Notification read on
    # click (see PUT /notifications/{id}) — without it there was no way to
    # know which row a toast even corresponded to.
    ws_type = "hint" if body.operation_type == "hint" else "message"
    try:
        await ws_manager.broadcast_to_user(
            student_id,
            {
                "type": ws_type,
                "title": titles[body.operation_type],
                "text": body.content,
                "notification_id": notification_id,
            },
        )
    except Exception:
        pass  # best-effort — the Notification row is already persisted

    return StudentOperationResponse(status="sent")


class TimelineBucket(BaseModel):
    timestamp_s: int
    count: int


class LessonTimelineResponse(BaseModel):
    lesson_id: int
    total_struggles: int
    timeline: List[TimelineBucket]


@router.get("/lessons/{lesson_id}/timeline", response_model=LessonTimelineResponse, summary="Get struggle timeline for a specific lesson")
async def get_lesson_timeline(
    lesson_id: int,
    current_user: User = Depends(get_instructor_user),
    db: AsyncSession = Depends(get_db),
    _rl: None = rate_limit(60, 60),
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    
    module = await db.get(Module, lesson.module_id)
    if not module:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Module not found.")

    await verify_course_access(module.course_id, current_user, db)

    if lesson.problem_id:
        stmt = select(StruggleEvent.lesson_timestamp_ms).where(StruggleEvent.problem_id == lesson.problem_id)
    else:
        stmt = select(StruggleEvent.lesson_timestamp_ms).where(StruggleEvent.lesson_id == lesson_id)
        
    timestamps_ms = (await db.scalars(stmt)).all()

    BUCKET_SIZE_S = 10
    buckets = {}
    for ts_ms in timestamps_ms:
        bucket_s = (ts_ms // (BUCKET_SIZE_S * 1000)) * BUCKET_SIZE_S
        buckets[bucket_s] = buckets.get(bucket_s, 0) + 1

    timeline = [TimelineBucket(timestamp_s=k, count=v) for k, v in sorted(buckets.items())]

    return LessonTimelineResponse(
        lesson_id=lesson_id,
        total_struggles=len(timestamps_ms),
        timeline=timeline
    )
