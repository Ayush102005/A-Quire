from __future__ import annotations

import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.struggle import StruggleEvent, MentorResponse
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

# ── Thread pool for Bedrock (sync boto3 calls run off the event loop) ──────────
_bedrock_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="bedrock")

# ── Level-appropriate prompt templates for AWS Bedrock ────────────────────────

_HINT_LEVEL_INSTRUCTIONS: dict[str, str] = {
    "basic": (
        "Provide a SHORT, gentle nudge (2-3 sentences). "
        "Do NOT reveal the answer. Guide the student to look at the right part of the concept. "
        "Use simple vocabulary. Focus on the first sub-step they should try."
    ),
    "intermediate": (
        "Provide a MEDIUM-depth hint (3-4 sentences). "
        "Help the student see the relationship between components. "
        "Ask a Socratic question at the end that leads them toward the answer. "
        "Do NOT fully solve the problem for them."
    ),
    "advanced": (
        "Provide a DETAILED explanation (4-6 sentences). "
        "Connect the current concept to foundational principles from earlier in the lesson. "
        "Show the logical chain of reasoning. Still leave the final step for the student to complete."
    ),
    "analogy": (
        "Explain the concept using a REAL-WORLD ANALOGY (3-4 sentences). "
        "Choose an analogy that maps naturally to the technical concept. "
        "After the analogy, connect it back to the lesson context explicitly."
    ),
    "hinglish": (
        "Respond ONLY in Hinglish (Hindi + English mix). "
        "Ek chota sa hint do (2-3 sentences). "
        "Simple aur friendly tone rakho. Answer bilkul mat batao — sirf sahi direction mein push karo."
    ),
}

_FALLBACK_HINTS: dict[str, str] = {
    "basic": (
        "Try breaking down the concept into smaller steps. "
        "Focus on one sub-idea at a time and work through it methodically."
    ),
    "intermediate": (
        "Consider how the components in this section relate to each other. "
        "Look for the cause-and-effect chain — what triggers what?"
    ),
    "advanced": (
        "This concept builds on foundational principles from earlier in the lesson. "
        "Review those first, then apply them systematically to what you see here."
    ),
    "analogy": (
        "Think of it like building with blocks — each piece must fit securely before adding the next. "
        "What is the foundational block you might be missing right now?"
    ),
    "hinglish": (
        "Isko samajhne ke liye pehle basics clear karo, phir aage badhna. "
        "Step-by-step approach lo — ek baar mein ek cheez pe focus karo."
    ),
}


# ── Bedrock caller (synchronous — runs in thread pool) ────────────────────────

def _invoke_bedrock(
    lesson_title: str,
    lesson_timestamp_ms: int,
    struggle_score: float,
    fixation_duration_ms: int,
    inactivity_duration_ms: int,
    hint_level: str,
) -> str:
    """
    Call AWS Bedrock Claude to generate a personalized mentor hint.

    Runs synchronously — must be invoked via asyncio.get_event_loop().run_in_executor()
    so it does not block the async event loop.
    """
    import boto3
    import botocore

    level_instruction = _HINT_LEVEL_INSTRUCTIONS.get(hint_level, _HINT_LEVEL_INSTRUCTIONS["basic"])

    timestamp_sec = lesson_timestamp_ms // 1000
    minutes, seconds = divmod(timestamp_sec, 60)
    timestamp_str = f"{minutes}m {seconds}s" if minutes else f"{seconds}s"

    prompt = (
        f"You are an expert AI tutor helping a student who is struggling with a lesson video.\n\n"
        f"CONTEXT:\n"
        f"- Lesson topic: {lesson_title}\n"
        f"- Video position where student is stuck: {timestamp_str} ({lesson_timestamp_ms}ms)\n"
        f"- Struggle score: {struggle_score:.2f} / 1.0 (higher = more stuck)\n"
        f"- Fixation duration: {fixation_duration_ms}ms\n"
        f"- Inactivity duration: {inactivity_duration_ms}ms\n\n"
        f"TASK:\n"
        f"{level_instruction}\n\n"
        f"CONSTRAINTS:\n"
        f"- Do NOT give away the full answer\n"
        f"- Be encouraging and supportive\n"
        f"- Reference the specific video position if helpful\n"
        f"- Keep the response concise\n\n"
        f"Hint:"
    )

    request_body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 300,
        "temperature": 0.7,
        "messages": [
            {"role": "user", "content": prompt}
        ],
    })

    try:
        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
        response = client.invoke_model(
            modelId=settings.BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=request_body,
        )
        body = json.loads(response["body"].read())
        return body["content"][0]["text"].strip()

    except botocore.exceptions.NoCredentialsError:
        logger.warning("Bedrock: AWS credentials not configured — using fallback hint")
        return _FALLBACK_HINTS.get(hint_level, _FALLBACK_HINTS["basic"])
    except botocore.exceptions.EndpointResolutionError:
        logger.warning("Bedrock: endpoint unreachable — using fallback hint")
        return _FALLBACK_HINTS.get(hint_level, _FALLBACK_HINTS["basic"])
    except Exception as exc:
        logger.error(f"Bedrock call failed: {exc}")
        return _FALLBACK_HINTS.get(hint_level, _FALLBACK_HINTS["basic"])


# ── Core public API ────────────────────────────────────────────────────────────

async def generate_mentor_hint(
    event_id: int,
    db: AsyncSession,
    hint_level: str = "basic",
) -> str:
    """
    Generate a mentor hint for a struggle event via AWS Bedrock and persist it.

    Flow:
    1. Fetch the StruggleEvent from DB
    2. Call Bedrock in a thread pool (non-blocking)
    3. Persist the hint on the StruggleEvent + create a MentorResponse record
    4. Push the hint to the student via WebSocket

    Falls back to static templates gracefully if Bedrock is unavailable.
    """
    stmt = select(StruggleEvent).where(StruggleEvent.id == event_id)
    result = await db.execute(stmt)
    struggle = result.scalar_one_or_none()

    if not struggle:
        logger.warning(f"generate_mentor_hint: event_id={event_id} not found")
        return "Unable to generate hint — event not found."

    # Fetch lesson title for context (best-effort)
    lesson_title = _get_lesson_title(struggle.lesson_id)

    # Run Bedrock call in thread pool — does not block the event loop
    loop = asyncio.get_event_loop()
    import time
    t0 = time.monotonic()
    hint = await loop.run_in_executor(
        _bedrock_executor,
        _invoke_bedrock,
        lesson_title,
        struggle.lesson_timestamp_ms,
        struggle.struggle_score or 0.0,
        struggle.fixation_duration_ms or 0,
        struggle.inactivity_duration_ms or 0,
        hint_level,
    )
    latency_ms = int((time.monotonic() - t0) * 1000)

    # Persist hint on the struggle event
    struggle.mentor_hint = hint
    struggle.mentor_hint_level = hint_level
    struggle.mentor_generated_at = datetime.now(timezone.utc)

    # Create a MentorResponse record for analytics
    mentor_response = MentorResponse(
        struggle_event_id=event_id,
        response_text=hint,
        response_type=hint_level,
        latency_ms=latency_ms,
    )
    db.add(mentor_response)
    await db.commit()

    logger.info(
        f"Hint generated ({hint_level}) for struggle event {event_id} "
        f"in {latency_ms}ms"
    )

    # Push real-time notification to the student via WebSocket
    try:
        await manager.broadcast_to_user(
            struggle.user_id,
            {
                "type": "mentor_hint",
                "data": {
                    "struggle_event_id": event_id,
                    "lesson_id": struggle.lesson_id,
                    "hint": hint,
                    "hint_level": hint_level,
                    "latency_ms": latency_ms,
                    "auto_triggered": False,
                },
            },
        )
    except Exception as exc:
        logger.warning(f"WS push for mentor hint failed: {exc}")

    return hint


async def auto_trigger_hint_if_threshold(
    struggle: StruggleEvent,
    db: AsyncSession,
) -> bool:
    """
    Check if a struggle event's score exceeds STRUGGLE_HINT_THRESHOLD.
    If so, push an automatic hint suggestion (not the full hint — the student
    still chooses the level). Returns True if a suggestion was pushed.

    Called after ingesting a new struggle event.
    """
    if (struggle.struggle_score or 0.0) < settings.STRUGGLE_HINT_THRESHOLD:
        return False

    # Push a lightweight "hint available" nudge — student chooses level
    try:
        await manager.broadcast_to_user(
            struggle.user_id,
            {
                "type": "hint_suggestion",
                "data": {
                    "struggle_event_id": struggle.id,
                    "lesson_id": struggle.lesson_id,
                    "lesson_timestamp_ms": struggle.lesson_timestamp_ms,
                    "struggle_score": struggle.struggle_score,
                    "message": (
                        "It looks like you might be stuck here. "
                        "Would you like an AI mentor hint?"
                    ),
                },
            },
        )
        logger.info(
            f"Auto-hint suggestion pushed to user_id={struggle.user_id} "
            f"for event_id={struggle.id} (score={struggle.struggle_score:.2f})"
        )
        return True
    except Exception as exc:
        logger.warning(f"Auto-hint WS push failed: {exc}")
        return False


# ── Internal helpers ───────────────────────────────────────────────────────────

def _get_lesson_title(lesson_id: int) -> str:
    """
    Best-effort lesson title fetch for Bedrock prompt context.
    Returns a generic fallback string if the title cannot be retrieved
    (avoids making an async DB call inside a sync helper).
    """
    # In practice the lesson title is not critical for hint quality —
    # the video timestamp and struggle metrics carry most of the context.
    # A richer implementation would pass the lesson title from the caller.
    return f"Lesson #{lesson_id}"
