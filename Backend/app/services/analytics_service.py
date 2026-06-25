from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.models.progress import Progress
from app.models.struggle import StruggleEvent
from app.models.quiz import QuizResponse


class AnalyticsService:
    @staticmethod
    async def get_student_dashboard(user_id: int, db: AsyncSession) -> dict:
        """Get student dashboard analytics"""
        
        # Lessons completed
        stmt = select(func.count(Progress.id)).where(
            Progress.user_id == user_id,
            Progress.is_completed == True,
        )
        result = await db.execute(stmt)
        lessons_completed = result.scalar() or 0
        
        # Average struggle
        stmt = select(func.avg(StruggleEvent.struggle_score)).where(
            StruggleEvent.user_id == user_id
        )
        result = await db.execute(stmt)
        avg_struggle = result.scalar() or 0.0
        
        # Quiz performance
        stmt = select(func.avg(QuizResponse.score)).where(
            QuizResponse.user_id == user_id
        )
        result = await db.execute(stmt)
        avg_quiz_score = result.scalar() or 0.0
        
        return {
            "lessons_completed": lessons_completed,
            "average_struggle_score": float(avg_struggle),
            "average_quiz_score": float(avg_quiz_score),
        }
    
    @staticmethod
    async def get_cohort_analytics(course_id: int, db: AsyncSession) -> dict:
        """Get cohort-level analytics"""
        # Placeholder for future expansion
        return {
            "course_id": course_id,
            "data_available": False,
        }
