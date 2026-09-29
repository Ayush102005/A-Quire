"""
app/services/generation_budget.py
──────────────────────────────────
Lightweight in-memory rate limiting + in-flight locking for AMATTA's AI
question-generation fallback (adaptive_engine.py's get_next_question).

Both the session and topic budgets are sliding time windows (mirrors
app/core/rate_limit.py's IP rate limiter) — NOT a lifetime cap. A topic's
item bank must keep growing as more students attempt it over time; a
permanent "N generations ever" ceiling would freeze a topic's pool at a
handful of items forever after the first burst of usage (across every
session, since these counters are process-global) — which is exactly what
happened before this was windowed: once AI_GENERATION_MAX_PER_TOPIC
generations had ever been attempted for a topic, no more were ever
generated again for the life of the process, so every student eventually
saw the same small, static pool cycle ("same question in rotation").

Counts are incremented on every *attempt* (not just successes) — a run of
failed LLM calls should still count against the budget rather than allow
unbounded retries.

Process-local state, no new DB table; reset via reset_generation_budget()
in tests.
"""
from __future__ import annotations

import time
from collections import defaultdict

from app.core.config import settings

_session_attempts: dict[int, list[float]] = defaultdict(list)
_topic_attempts: dict[int, list[float]] = defaultdict(list)
_in_progress_topics: set[int] = set()


def _prune(timestamps: list[float], window_seconds: float, now: float) -> list[float]:
    return [t for t in timestamps if now - t < window_seconds]


def can_generate(session_id: int, topic_id: int, max_per_session: int, max_per_topic: int) -> bool:
    """True if a new generation attempt for this session/topic is currently allowed."""
    if topic_id in _in_progress_topics:
        return False

    now = time.monotonic()
    _session_attempts[session_id] = _prune(
        _session_attempts[session_id], settings.AI_GENERATION_SESSION_WINDOW_SECONDS, now
    )
    _topic_attempts[topic_id] = _prune(
        _topic_attempts[topic_id], settings.AI_GENERATION_TOPIC_WINDOW_SECONDS, now
    )

    if len(_session_attempts[session_id]) >= max_per_session:
        return False
    if len(_topic_attempts[topic_id]) >= max_per_topic:
        return False
    return True


def begin_generation(session_id: int, topic_id: int) -> None:
    """Call immediately before starting a generation attempt."""
    _in_progress_topics.add(topic_id)
    now = time.monotonic()
    _session_attempts[session_id].append(now)
    _topic_attempts[topic_id].append(now)


def end_generation(topic_id: int) -> None:
    """Call in a `finally` after the generation attempt settles (success or failure)."""
    _in_progress_topics.discard(topic_id)


def reset_generation_budget() -> None:
    """Clear every counter and in-flight lock — call from test fixtures."""
    _session_attempts.clear()
    _topic_attempts.clear()
    _in_progress_topics.clear()
