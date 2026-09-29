"""
app/models/__init__.py
───────────────────────
Import all models so Alembic autogenerate sees every table.

Usage in alembic/env.py:
    from app.db.session import Base
    import app.models
    target_metadata = Base.metadata
"""
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.models.module import Module
from app.models.notification import Notification
from app.models.progress import Progress
from app.models.struggle_event import StruggleEvent
from app.models.mentor_intervention import MentorIntervention
from app.models.student import User
from app.models.student_note import StudentNote
from app.models.assessment import Topic, Question, LearnerAbility, QuizSession, QuizResponse
from app.models.analytics import LearnerStateLog
from app.models.metrics import SystemMetrics, FeatureFlag

__all__ = [
    "User",
    "Course",
    "Module",
    "Lesson",
    "Enrollment",
    "Progress",
    "StruggleEvent",
    "MentorIntervention",
    "Notification",
    "StudentNote",
    "Topic",
    "Question",
    "LearnerAbility",
    "QuizSession",
    "QuizResponse",
    "LearnerStateLog",
    "SystemMetrics",
    "FeatureFlag",
]
