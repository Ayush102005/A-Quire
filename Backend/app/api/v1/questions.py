"""
app/api/v1/questions.py
────────────────────────
Question endpoints — backed by the real DB (Question / Topic models).

GET  /questions/{question_id}     — fetch a question (by int ID or legacy string slug)
POST /questions/create            — create and persist a new question
POST /questions/{question_id}/answer — grade a student's answer
"""
from __future__ import annotations

from typing import Any, List, Union

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.deps.roles import get_instructor_user
from app.core.rate_limit import rate_limit
from app.models.assessment import Question, Topic
from app.models.student import User

router = APIRouter(prefix="/questions", tags=["Questions"])


# ── Request / Response schemas ───────────────────────────────────────────────

class AnswerRequest(BaseModel):
    answer: Union[str, List[str]]
    time_spent_seconds: int = 0
    confidence: int = 2  # 1–4 scale (1=Just guessing, 4=Very confident)


class QuestionCreateRequest(BaseModel):
    exam: str
    subject: str
    topic: str
    difficulty: str = "Medium"
    type: str = "mcq"
    tags: List[str] = []
    content: str
    options: List[dict]   # [{"id": "A", "text": "..."}]
    correct_answer: Union[str, List[str]]
    explanation: str = ""


# ── Helpers ──────────────────────────────────────────────────────────────────

def _db_question_to_response(q: Question) -> dict:
    """Serialise a DB Question to the shape the frontend expects."""
    # Convert JSONB options dict {"A": "text", ...} → list [{"id": "A", "text": "..."}]
    options_list = [{"id": k, "text": v} for k, v in (q.options or {}).items()]
    return {
        "id": str(q.id),
        "exam": getattr(q, "exam", ""),
        "subject": q.topic.subject if q.topic else "",
        "topic": q.topic.name if q.topic else "",
        "difficulty": "Medium",   # not stored on model yet — default
        "type": "mcq",            # not stored on model yet — default
        "tags": [],
        "content": q.content,
        "options": options_list,
        "correct_answer": q.correct_option,
        "explanation": "",
        "related_lessons": [],
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionCreateRequest,
    db: AsyncSession = Depends(get_db),
    instructor: User = Depends(get_instructor_user),
    _rl: None = rate_limit(10, 60),  # 10 questions per minute per IP
) -> dict:
    """Persist a new question to the DB and return its assigned ID."""
    # Find or create the Topic for this subject+topic combo
    topic_name = payload.topic.strip() or f"{payload.subject} General"
    existing_topic = (
        await db.execute(select(Topic).where(Topic.name == topic_name))
    ).scalar_one_or_none()

    if not existing_topic:
        existing_topic = Topic(name=topic_name, subject=payload.subject)
        db.add(existing_topic)
        await db.flush()

    # Convert list options → dict {"A": "...", "B": "..."}
    options_dict: dict[str, str] = {}
    for opt in payload.options:
        key = opt.get("id", "")
        text = opt.get("text", "")
        if key and text:
            options_dict[key] = text

    # Determine correct_option key
    correct_option: str
    if isinstance(payload.correct_answer, list):
        correct_option = payload.correct_answer[0] if payload.correct_answer else "A"
    else:
        correct_option = payload.correct_answer

    new_q = Question(
        topic_id=existing_topic.id,
        content=payload.content,
        options=options_dict,
        correct_option=correct_option,
        difficulty_b={"Easy": -1.0, "Medium": 0.0, "Hard": 1.5}.get(payload.difficulty, 0.0),
        discrimination_a=1.0,
        guessing_c=0.25,
    )
    db.add(new_q)
    await db.commit()
    await db.refresh(new_q)

    return {"id": str(new_q.id), "message": "Question created successfully", "topic_id": existing_topic.id}


@router.get("/{question_id}")
async def get_question(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Fetch a question by its integer ID. Falls back to a sample if not found."""
    # Try parsing as integer DB ID
    try:
        qid = int(question_id)
        from sqlalchemy.orm import joinedload
        q: Question | None = (
            await db.execute(
                select(Question)
                .options(joinedload(Question.topic))
                .where(Question.id == qid)
            )
        ).scalar_one_or_none()

        if q:
            return _db_question_to_response(q)
    except (ValueError, TypeError):
        pass

    # Legacy / demo fallback — return a sample physics question so the page renders
    return {
        "id": question_id,
        "exam": "JEE Advanced",
        "subject": "Physics",
        "topic": "Kinematics",
        "difficulty": "Hard",
        "type": "mcq",
        "tags": ["Projectile Motion", "Calculus"],
        "content": (
            "A particle is projected from the ground with an initial velocity $v_0$ at an angle "
            r"$\theta$ to the horizontal. The equation of its trajectory is given by:"
            "\n\n$$y = x \\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}$$\n\n"
            r"If the range of the projectile is $R$, find the maximum height $H$ reached in terms of $R$ and $\theta$."
        ),
        "options": [
            {"id": "A", "text": r"$H = \frac{R \tan\theta}{2}$"},
            {"id": "B", "text": r"$H = \frac{R \tan\theta}{4}$"},
            {"id": "C", "text": r"$H = \frac{R \sin\theta}{2}$"},
            {"id": "D", "text": r"$H = \frac{R \cos\theta}{4}$"},
        ],
        "correct_answer": "B",
        "explanation": (
            r"Using $R = \frac{v_0^2 \sin 2\theta}{g}$ and $H = \frac{v_0^2 \sin^2\theta}{2g}$, "
            r"dividing gives $\frac{H}{R} = \frac{\tan\theta}{4}$, so $H = \frac{R \tan\theta}{4}$."
        ),
        "related_lessons": [
            {"id": "1", "title": "2D Motion Fundamentals"},
            {"id": "3", "title": "Advanced Projectile Problems"},
        ],
    }


@router.post("/{question_id}/answer")
async def answer_question(
    question_id: str,
    payload: AnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Grade a student's answer. Uses DB if question exists, otherwise grades the demo question."""
    submitted = payload.answer

    # Try to fetch from DB
    try:
        qid = int(question_id)
        from sqlalchemy.orm import joinedload
        q: Question | None = (
            await db.execute(
                select(Question)
                .options(joinedload(Question.topic))
                .where(Question.id == qid)
            )
        ).scalar_one_or_none()

        if q:
            correct_key = q.correct_option
            correct_value = (q.options or {}).get(correct_key, "")

            # Accept either option key (e.g. "B") or full option text
            if isinstance(submitted, list):
                is_correct = any(
                    s.strip() in (correct_key, correct_value) for s in submitted
                )
            else:
                is_correct = submitted.strip() in (correct_key, correct_value.strip())

            return {
                "is_correct": is_correct,
                "correct_answer": correct_key,
                "feedback": "Correct!" if is_correct else f"The correct answer is option {correct_key}.",
                "explanation": "",
            }
    except (ValueError, TypeError):
        pass

    # Fallback — demo question correct answer is "B"
    is_correct = ("B" in submitted) if isinstance(submitted, list) else (submitted.strip() == "B")
    return {
        "is_correct": is_correct,
        "correct_answer": "B",
        "feedback": "Correct!" if is_correct else "Review the relation between max height and range.",
        "explanation": (
            r"Using $R = \frac{v_0^2 \sin 2\theta}{g}$ and $H = \frac{v_0^2 \sin^2\theta}{2g}$, "
            r"dividing gives $H = \frac{R \tan\theta}{4}$."
        ),
    }
