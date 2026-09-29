"""
app/services/confidence_adapter.py
──────────────────────────────────
Confidence-Aware Difficulty Tuning Module.

This module is strictly a SECONDARY, bounded heuristic layered on top of the
primary IRT theta update (see `adaptive_engine.py`'s `process_answer`). It
never snaps theta to a difficulty-tier bucket — `theta` and `b` live on the
continuous [-4.0, 4.0] spectrum throughout the engine. `get_difficulty_tier`
is kept only to populate `QuizResponse.difficulty` for instructor UX and
analytics; it has no influence on item selection or theta.
"""

from typing import List
from pydantic import BaseModel

# Bounded nudge applied by apply_confidence_adjustment — small relative to
# the primary IRT gradient step, by design (this is a secondary signal).
CONFIDENCE_NUDGE = 0.25
THETA_MIN, THETA_MAX = -4.0, 4.0


class RecentResponse(BaseModel):
    """
    Represents a student's response to a specific question.
    """
    question_id: str | int
    is_correct: bool
    confidence: int  # Scale of 1 to 4: 1 (Just guessing) to 4 (Very confident)
    difficulty: float  # IRT difficulty (b) parameter of the answered question


def compute_confidence_score(responses: List[RecentResponse]) -> float:
    """
    Computes a normalized average confidence score from a list of recent responses.
    Maps 1-4 scale to [0.0, 0.33, 0.66, 1.0].
    """
    if not responses:
        return 0.5

    # Map 1-4 to 0.0 - 1.0
    mapping = {1: 0.0, 2: 0.33, 3: 0.66, 4: 1.0}
    total_confidence = sum(mapping.get(resp.confidence, 0.33) for resp in responses)
    return total_confidence / len(responses)


def get_difficulty_tier(difficulty_b: float) -> str:
    """
    Map numeric IRT difficulty to a human-readable tier — display/analytics
    only (e.g. `QuizResponse.difficulty`, instructor dashboards). Never used
    to filter or select questions; selection ranks purely on continuous
    Fisher information at the continuous theta (see adaptive_engine.py).
    """
    if difficulty_b < -0.5:
        return "easy"
    elif difficulty_b > 0.5:
        return "hard"
    return "medium"


def apply_confidence_adjustment(theta: float, recent_responses: List[RecentResponse]) -> float:
    """
    Applies a small, bounded, continuous nudge to theta based on recent
    performance and self-reported confidence — a secondary heuristic applied
    AFTER the primary IRT gradient-ascent update, not a replacement for it.

    Rules (evaluated over the trailing up-to-3 responses, oldest→newest):
    - 2+ wrong in a row, OR avg confidence <= 0.25  -> nudge theta down by CONFIDENCE_NUDGE.
    - 2+ correct in a row AND avg confidence >= 0.75 -> nudge theta up by CONFIDENCE_NUDGE.
    - Otherwise -> no change.

    Unlike the old tier-snapping `adjust_difficulty`, this never jumps theta
    to a bucket boundary — it only ever moves it by a fixed small amount and
    always returns a value clamped to [-4.0, 4.0].
    """
    if not recent_responses:
        return max(THETA_MIN, min(THETA_MAX, theta))

    recent_streak = recent_responses[-3:]

    # Count the run of same-outcome responses ending at the MOST RECENT one
    # (iterate newest -> oldest, stop at the first outcome change). A naive
    # "reset the other counter on each flip" loop without an early break
    # would let an older, unrelated response silently overwrite the streak
    # length once the loop keeps going past the actual break point.
    consecutive_correct = 0
    consecutive_wrong = 0
    for resp in reversed(recent_streak):
        if resp.is_correct:
            if consecutive_wrong > 0:
                break
            consecutive_correct += 1
        else:
            if consecutive_correct > 0:
                break
            consecutive_wrong += 1

    avg_confidence = compute_confidence_score(recent_streak)

    adjusted = theta
    if consecutive_wrong >= 2 or avg_confidence <= 0.25:
        adjusted = theta - CONFIDENCE_NUDGE
    elif consecutive_correct >= 2 and avg_confidence >= 0.75:
        adjusted = theta + CONFIDENCE_NUDGE

    return max(THETA_MIN, min(THETA_MAX, adjusted))
