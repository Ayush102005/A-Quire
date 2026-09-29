"""
app/api/v1/api.py
──────────────────
Aggregates all v1 routers. Add new routers here as the project grows.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.analytics import router as analytics_router
from app.api.v1.instructor_analytics import router as instructor_analytics_router
from app.api.v1.auth import router as auth_router
from app.api.v1.content import router as content_router
from app.api.v1.courses import router as courses_router
from app.api.v1.enrollments import router as enrollments_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.onboarding import router as onboarding_router
from app.api.v1.profile import router as profile_router
from app.api.v1.progress import router as progress_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.struggle_monitor import router as struggle_monitor_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.problems import router as problems_router
from app.api.v1.questions import router as questions_router
from app.api.v1.meetings import router as meetings_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(onboarding_router)
api_router.include_router(courses_router)
api_router.include_router(enrollments_router)
api_router.include_router(content_router)
api_router.include_router(progress_router)
api_router.include_router(notifications_router)
api_router.include_router(analytics_router)
api_router.include_router(instructor_analytics_router)
api_router.include_router(assessments_router)
api_router.include_router(struggle_monitor_router)
api_router.include_router(quizzes_router)
api_router.include_router(problems_router)
api_router.include_router(questions_router)
api_router.include_router(meetings_router)
