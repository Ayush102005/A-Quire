from __future__ import annotations

import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.struggle_event import StruggleEvent
from app.models.mentor_intervention import MentorIntervention
from app.models.lesson import Lesson
from app.models.student import User
from app.services.problem_bank import get_problem
from app.core.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

# ── Thread pool for sync SDK calls (Anthropic, boto3) run off the event loop ──
_hint_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="mentor-hint")

# ── Anthropic client — module-level singleton so requests reuse the same
# connection pool (keep-alive) instead of paying a fresh TCP/TLS handshake
# on every hint. ─────────────────────────────────────────────────────────
_anthropic_client = None
if settings.ANTHROPIC_API_KEY:
    import anthropic
    headers = {}
    if settings.ANTHROPIC_WORKSPACE_ID:
        headers["anthropic-workspace-id"] = settings.ANTHROPIC_WORKSPACE_ID
    _anthropic_client = anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        default_headers=headers if headers else None
    )

# ── Level-appropriate prompt templates ─────────────────────────────────────────

_HINT_LEVEL_INSTRUCTIONS: dict[str, str] = {
    "basic": (
        "Provide a SHORT, gentle nudge (2-3 sentences). "
        "Do NOT reveal the answer. Guide the student to look at the right part of the concept. "
        "Use simple vocabulary. Focus on the first sub-step they should try."
    ),
    "detailed": (
        "Provide a DETAILED explanation (4-6 sentences). "
        "Connect the current concept to foundational principles from earlier in the lesson. "
        "Show the logical chain of reasoning. Still leave the final step for the student to complete."
    ),
    "example": (
        "Give a CONCRETE, WORKED EXAMPLE illustrating the concept — a different instance of it, not "
        "the exact problem the student is on. Walk through the example step by step, then let the "
        "student apply the same idea themselves."
    ),
    "custom": (
        "The student has a specific question or request (see below) — address it directly and "
        "helpfully, in the context of the lesson. Do NOT ignore it in favor of a generic hint."
    ),
}

_LANGUAGE_INSTRUCTIONS: dict[str, str] = {
    "en": "Respond in clear, simple English.",
    "hi": "Respond in Hindi, written in Devanagari script.",
    "hinglish": (
        "Respond in Hinglish — a natural mix of Hindi and English written in Roman "
        "script, the way Indian students actually speak to each other (e.g. "
        "\"Pehle yeh formula samjho, phir substitute karo\"). Keep technical terms "
        "in English."
    ),
}

_FALLBACK_HINTS: dict[str, str] = {
    "basic": (
        "Try breaking down the concept into smaller steps. "
        "Focus on one sub-idea at a time and work through it methodically."
    ),
    "detailed": (
        "This concept builds on foundational principles from earlier in the lesson. "
        "Review those first, then apply them systematically to what you see here."
    ),
    "example": (
        "Try working through a simple example with small, easy numbers first, then apply the same "
        "steps to what's in front of you."
    ),
    "custom": (
        "I'm having trouble answering that specific request right now — try rephrasing it, "
        "or ask for a basic hint instead."
    ),
}


# ── Claude caller (synchronous — runs in thread pool) ──────────────────────────

def _invoke_claude(
    activity_label: str,
    context_block: str,
    struggle_score: float,
    fixation_duration_ms: int,
    inactivity_duration_ms: int,
    hint_level: str,
    custom_message: str | None = None,
    language: str = "en",
    conversation_history: list[dict] | None = None,
) -> str:
    """
    Call the Anthropic API (Claude) to generate a personalized mentor hint.

    `activity_label` and `context_block` describe what the student is stuck
    on — either a lesson video or a DSA problem (see the two branches in
    generate_hint() below, which build these before calling this function).
    `custom_message` carries the student's actual typed question or the
    quick-action's auto-generated request (e.g. "Quiz me...", "Summarize
    so far...") — without it, hint_level="custom" has nothing to act on.
    `language` is the student's onboarding language preference (en/hi/hinglish),
    or a per-request override (e.g. the overlay's "Ask in Hinglish" button).
    `conversation_history` carries prior turns of this same hint conversation
    (oldest first, each a dict with "role" ∈ {"student","mentor"} and
    "text") — without it, every call is answered from scratch with no memory
    of what the mentor itself already said, so a short reply like "array" to
    the mentor's own question reads as an unrelated fragment rather than an
    answer to evaluate.

    Runs synchronously — must be invoked via asyncio.get_event_loop().run_in_executor()
    so it does not block the async event loop.
    """
    level_instruction = _HINT_LEVEL_INSTRUCTIONS.get(hint_level, _HINT_LEVEL_INSTRUCTIONS["basic"])
    language_instruction = _LANGUAGE_INSTRUCTIONS.get(language, _LANGUAGE_INSTRUCTIONS["en"])

    student_request_block = (
        f'- Student\'s specific question/request: "{custom_message}"\n' if custom_message else ""
    )

    history_block = ""
    if conversation_history:
        turns = "\n".join(
            f'{"Mentor" if turn.get("role") == "mentor" else "Student"}: {turn.get("text", "")}'
            for turn in conversation_history
        )
        history_block = (
            f"CONVERSATION SO FAR (oldest first — the student's latest message above may be a "
            f"direct reply to your own last message here, e.g. answering a question you asked; "
            f"read it in that light rather than treating it as an unclear, standalone fragment):\n"
            f"{turns}\n\n"
        )

    prompt = (
        f"You are an expert AI tutor helping a student who is struggling with {activity_label}.\n\n"
        f"CONTEXT:\n"
        f"{context_block}"
        f"{student_request_block}"
        f"- Struggle score: {struggle_score:.2f} / 1.0 (higher = more stuck)\n"
        f"- Fixation duration: {fixation_duration_ms}ms\n"
        f"- Inactivity duration: {inactivity_duration_ms}ms\n\n"
        f"{history_block}"
        f"TASK:\n"
        f"{level_instruction}\n\n"
        f"LANGUAGE:\n"
        f"{language_instruction}\n\n"
        f"CONSTRAINTS:\n"
        f"- Do NOT give away the full answer\n"
        f"- Be encouraging and supportive\n"
        f"- Keep the response concise\n"
        f"- If the student's message answers a question you previously asked, evaluate it: "
        f"confirm and build on it if correct, gently correct the misconception if wrong — "
        f"don't just repeat your previous hint\n\n"
        f"Hint:"
    )

    if not _anthropic_client:
        return _FALLBACK_HINTS.get(hint_level, _FALLBACK_HINTS["basic"])

    try:
        response = _anthropic_client.messages.create(
            model=settings.ANTHROPIC_MODEL_ID,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        # Sonnet 5 has thinking on by default, so content[0] may be a
        # ThinkingBlock rather than the text block — find it by type.
        return next(
            block.text for block in response.content if block.type == "text"
        ).strip()

    except Exception as exc:
        logger.error(f"Anthropic API call failed ({type(exc).__name__}): {exc}", exc_info=True)
        return _FALLBACK_HINTS.get(hint_level, _FALLBACK_HINTS["basic"])


def _generate_audio(text: str) -> Optional[str]:
    """
    Generate audio for the given text using AWS Polly.
    Returns the base64 encoded string of the audio stream, or None if failed.
    """
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.warning("AWS credentials not configured. Skipping Polly TTS.")
        return None
        
    try:
        import boto3
        import base64
        
        # Use boto3 client directly
        polly = boto3.client(
            'polly',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION_NAME
        )
        
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat='mp3',
            VoiceId=settings.POLLY_VOICE_ID,
            Engine='neural'
        )
        
        if "AudioStream" in response:
            audio_stream = response["AudioStream"].read()
            return base64.b64encode(audio_stream).decode('utf-8')
            
    except Exception as exc:
        logger.error(f"AWS Polly TTS failed: {exc}")
    
    return None

# ── Core public API ────────────────────────────────────────────────────────────

async def generate_hint(
    event_id: int,
    db: AsyncSession,
    hint_level: str = "basic",
    custom_message: str | None = None,
    language: str | None = None,
    conversation_history: list | None = None,
) -> tuple[str, str | None]:
    """
    Generate a mentor hint for a struggle event via Claude and persist it.

    Flow:
    1. Fetch the StruggleEvent from DB
    2. Call Claude in a thread pool (non-blocking)
    3. Persist the hint on the StruggleEvent + create a MentorResponse record
    4. Push the hint to the student via WebSocket

    Falls back to static templates gracefully if the Anthropic API is unavailable.
    """
    stmt = select(StruggleEvent).where(StruggleEvent.id == event_id)
    result = await db.execute(stmt)
    struggle = result.scalar_one_or_none()

    if not struggle:
        logger.warning(f"generate_mentor_hint: event_id={event_id} not found")
        return "Unable to generate hint — event not found."

    # Resolve the language to respond in: an explicit per-request override
    # (e.g. the overlay's "Ask in Hinglish" button) takes priority over the
    # student's saved onboarding preference (User.language), which in turn
    # falls back to English.
    effective_language = language
    if not effective_language:
        student = await db.get(User, struggle.user_id)
        effective_language = (student.language if student else None) or "en"

    # Build the activity-specific prompt context — a lesson video or a DSA
    # problem (StruggleEvent has exactly one of lesson_id / problem_id set,
    # enforced by the ck_struggle_event_exactly_one_target constraint).
    if struggle.problem_id is not None:
        problem = get_problem(struggle.problem_id)
        activity_label = "a coding problem"
        context_block = (
            f"- Problem: {problem['title']} (difficulty: {problem['difficulty']})\n"
            f"- Problem description: {problem['description']}\n"
        )
    elif struggle.context_type == "dsa" and struggle.lesson_id is not None:
        # A DSA problem that's authored directly on the Lesson row rather
        # than linked to the app/services/problem_bank.py bank (no
        # Lesson.problem_id set — see DsaProblemPage.tsx's own fetch effect,
        # which builds its on-screen description from these same fields).
        # Previously this case fell through to the "lesson video" branch
        # below, which only knows a title and a video timestamp — neither
        # applies to a DSA problem (no video, no problem text at all), so
        # Claude was asked for a hint on "a lesson video" it had zero real
        # information about and produced generic, could-be-any-problem
        # advice ("restate the problem in your own words...") regardless of
        # what the student was actually looking at.
        lesson = await db.get(Lesson, struggle.lesson_id)
        activity_label = "a coding problem"
        if lesson is not None:
            parts = [f"- Problem: {lesson.title}"]
            if lesson.problem_statement:
                parts.append(f"- Problem statement: {lesson.problem_statement}")
            if lesson.examples:
                parts.append(f"- Examples: {lesson.examples}")
            if lesson.constraints:
                parts.append(f"- Constraints: {lesson.constraints}")
            if lesson.approaches:
                parts.append(f"- Known approaches (for your own reference — do not hand these to the student directly): {lesson.approaches}")
            context_block = "\n".join(parts) + "\n"
        else:
            context_block = f"- Problem: Lesson #{struggle.lesson_id} (lesson details unavailable)\n"
    else:
        # Falls back to a generic label if the lesson was deleted or
        # lesson_id is unset.
        lesson_title = f"Lesson #{struggle.lesson_id}"
        if struggle.lesson_id is not None:
            lesson = await db.get(Lesson, struggle.lesson_id)
            if lesson is not None and lesson.title:
                lesson_title = lesson.title

        timestamp_sec = struggle.lesson_timestamp_ms // 1000
        minutes, seconds = divmod(timestamp_sec, 60)
        timestamp_str = f"{minutes}m {seconds}s" if minutes else f"{seconds}s"

        transcript_context = ""
        if struggle.lesson_id is not None and not (struggle.notes and "Transcript context" in struggle.notes):
            lesson = await db.get(Lesson, struggle.lesson_id)
            if lesson and lesson.transcript:
                timestamp_float = struggle.lesson_timestamp_ms / 1000.0
                relevant_segments = []
                for seg in lesson.transcript:
                    start = seg.get('start', 0.0)
                    end = seg.get('end', start)
                    if end >= timestamp_float - 60 and start <= timestamp_float + 60:
                        relevant_segments.append(seg)
                if relevant_segments:
                    transcript_text = "\n".join(
                        f"[{int(seg.get('start', 0)) // 60}m {int(seg.get('start', 0)) % 60}s] {seg.get('text', '')}" 
                        for seg in relevant_segments
                    )
                    transcript_context = f"- Transcript context around the struggle time:\n{transcript_text}\n"

        activity_label = "a lesson video"
        context_block = (
            f"- Lesson topic: {lesson_title}\n"
            f"- Video position where student is stuck: {timestamp_str} ({struggle.lesson_timestamp_ms}ms)\n"
        )
        if struggle.notes:
            context_block += f"- Context: {struggle.notes}\n"
        elif transcript_context:
            context_block += transcript_context

    # Normalize conversation_history to plain dicts — the caller may pass
    # Pydantic ConversationTurn models (from the HTTP endpoint) or plain
    # dicts (from any internal caller); _invoke_claude only needs .get().
    history_dicts = (
        [
            turn.model_dump() if hasattr(turn, "model_dump") else dict(turn)
            for turn in conversation_history
        ]
        if conversation_history
        else None
    )

    # Run the Claude call in a thread pool — does not block the event loop
    loop = asyncio.get_event_loop()
    import time
    t0 = time.monotonic()
    hint = await loop.run_in_executor(
        _hint_executor,
        _invoke_claude,
        activity_label,
        context_block,
        struggle.struggle_score or 0.0,
        struggle.fixation_duration_ms or 0,
        struggle.inactivity_duration_ms or 0,
        hint_level,
        custom_message,
        effective_language,
        history_dicts,
    )
    latency_ms = int((time.monotonic() - t0) * 1000)

    # Generate TTS audio concurrently or sequentially (in thread pool)
    t1 = time.monotonic()
    hint_audio_base64 = await loop.run_in_executor(
        _hint_executor,
        _generate_audio,
        hint
    )
    audio_latency_ms = int((time.monotonic() - t1) * 1000)
    logger.debug(f"Audio generated in {audio_latency_ms}ms")

    # Persist hint on the struggle event.
    #
    # BUG FIX: this used to assign `struggle.mentor_hint` /
    # `mentor_hint_level` / `mentor_generated_at` — none of which are real
    # columns on StruggleEvent (only `hint_text` is; see
    # app/models/struggle_event.py). SQLAlchemy silently accepts an
    # assignment to an unmapped attribute as a plain Python attribute and
    # never persists it, so every hint generated through this function was
    # discarded here. The only reason the manual "Hint" button in
    # InterventionOverlay ever worked is that struggle_monitor.py's
    # `/events/{id}/hint` endpoint redundantly re-set `event.hint_text`
    # itself *after* calling this function and committed again. Any other
    # caller (e.g. an auto-hint triggered straight from struggle detection)
    # would have silently lost the hint. Fixed at the source so every
    # caller gets correct persistence for free.
    struggle.hint_text = hint

    # Create a MentorIntervention record for analytics
    mentor_intervention = MentorIntervention(
        struggle_event_id=struggle.id,
        action="ai_hint",
        notes=hint_level,
        status="delivered"
    )
    db.add(mentor_intervention)
    await db.commit()

    logger.info(
        f"Hint generated ({hint_level}) for struggle event {event_id} "
        f"in {latency_ms}ms"
    )

    # Push real-time notification to the student via WebSocket.
    #
    # BUG FIX: this used to send `{type: "mentor_hint", data: {hint: ...}}`,
    # but LessonPlayer.jsx's WS handler only reacts to `{type: "hint",
    # hint_text: ...}` (see its `msg.type === 'hint' && msg.hint_text`
    # check) — so this push was never actually received/displayed by the
    # frontend. The endpoint's own duplicate push (in the correct shape)
    # was carrying the manual-request flow; this is now the single correct
    # push point every caller (manual or auto-triggered) shares.
    try:
        await ws_manager.broadcast_to_user(
            struggle.user_id,
            {
                "type": "hint",
                "event_id": event_id,
                "hint_text": hint,
                "audio_base64": hint_audio_base64,
            },
        )
    except Exception as exc:
        logger.warning(f"WS push for mentor hint failed: {exc}")

    return hint, hint_audio_base64


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
        await ws_manager.broadcast_to_user(
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


