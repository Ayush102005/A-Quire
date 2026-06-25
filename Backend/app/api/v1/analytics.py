from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps import get_current_user_id, require_role
from app.models.progress import Progress
from app.models.struggle import StruggleEvent
from app.models.quiz import QuizResponse
from pydantic import BaseModel


class AnalyticsResponse(BaseModel):
    total_lessons_completed: int
    average_struggle_score: float
    total_struggle_events: int
    quiz_average_score: float


router = APIRouter()


@router.get("/student", response_model=AnalyticsResponse)
async def get_student_analytics(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get student analytics"""
    # Completed lessons
    stmt = select(func.count(Progress.id)).where(
        Progress.user_id == user_id,
        Progress.is_completed == True,
    )
    result = await db.execute(stmt)
    total_completed = result.scalar() or 0
    
    # Struggle score average
    stmt = select(func.avg(StruggleEvent.struggle_score)).where(
        StruggleEvent.user_id == user_id
    )
    result = await db.execute(stmt)
    avg_struggle = result.scalar() or 0.0
    
    # Total struggle events
    stmt = select(func.count(StruggleEvent.id)).where(
        StruggleEvent.user_id == user_id
    )
    result = await db.execute(stmt)
    total_struggles = result.scalar() or 0
    
    # Quiz average
    stmt = select(func.avg(QuizResponse.score)).where(
        QuizResponse.user_id == user_id
    )
    result = await db.execute(stmt)
    quiz_avg = result.scalar() or 0.0
    
    return AnalyticsResponse(
        total_lessons_completed=total_completed,
        average_struggle_score=float(avg_struggle),
        total_struggle_events=total_struggles,
        quiz_average_score=float(quiz_avg),
    )
