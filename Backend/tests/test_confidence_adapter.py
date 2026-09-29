import pytest

from app.services.confidence_adapter import (
    apply_confidence_adjustment,
    compute_confidence_score,
    get_difficulty_tier,
    RecentResponse,
    CONFIDENCE_NUDGE,
)


def _resp(is_correct: bool, confidence: int = 3, difficulty: float = 0.0) -> RecentResponse:
    return RecentResponse(question_id=1, is_correct=is_correct, confidence=confidence, difficulty=difficulty)


class TestApplyConfidenceAdjustment:
    def test_no_recent_responses_returns_theta_unchanged(self):
        assert apply_confidence_adjustment(1.23, []) == pytest.approx(1.23)

    def test_two_wrong_in_a_row_nudges_down(self):
        theta = 0.5
        recent = [_resp(True, confidence=4), _resp(False, confidence=2), _resp(False, confidence=2)]
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta - CONFIDENCE_NUDGE)

    def test_low_confidence_alone_nudges_down_even_without_a_streak(self):
        theta = 0.5
        # All correct, but very low self-reported confidence.
        recent = [_resp(True, confidence=1), _resp(True, confidence=1)]
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta - CONFIDENCE_NUDGE)

    def test_two_correct_in_a_row_with_high_confidence_nudges_up(self):
        theta = 0.5
        # avg_confidence is computed over the whole trailing window (up to 3
        # responses), not just the counted streak — so the older response
        # here must also carry high confidence for the window average to
        # clear the 0.75 threshold, even though it's not part of the streak.
        recent = [_resp(False, confidence=4), _resp(True, confidence=4), _resp(True, confidence=4)]
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta + CONFIDENCE_NUDGE)

    def test_two_correct_but_low_confidence_does_not_nudge_up(self):
        theta = 0.5
        recent = [_resp(True, confidence=1), _resp(True, confidence=1)]
        # Low confidence triggers the DOWN rule instead (avg_confidence <= 0.25).
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta - CONFIDENCE_NUDGE)

    def test_mixed_results_no_streak_leaves_theta_unchanged(self):
        theta = 0.5
        recent = [_resp(True, confidence=3), _resp(False, confidence=3)]
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta)

    def test_never_snaps_to_a_tier_boundary(self):
        # Old adjust_difficulty() would have snapped this straight to the
        # "hard" tier's numeric anchor (1.0). The new adjustment must only
        # ever move theta by the small bounded nudge.
        theta = 0.51  # just inside the old "hard" tier boundary
        recent = [_resp(False, confidence=1), _resp(False, confidence=1)]
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta - CONFIDENCE_NUDGE)
        assert result != 1.0
        assert result != 0.0

    def test_clamps_to_bounds(self):
        recent = [_resp(True, confidence=4), _resp(True, confidence=4)]
        assert apply_confidence_adjustment(3.9, recent) == pytest.approx(4.0)

        recent_down = [_resp(False, confidence=1), _resp(False, confidence=1)]
        assert apply_confidence_adjustment(-3.9, recent_down) == pytest.approx(-4.0)

    def test_only_last_three_responses_considered(self):
        theta = 0.5
        # Oldest two are wrong, but only the last 3 matter and those are all correct+confident.
        recent = [
            _resp(False, confidence=1), _resp(False, confidence=1),
            _resp(True, confidence=4), _resp(True, confidence=4), _resp(True, confidence=4),
        ]
        result = apply_confidence_adjustment(theta, recent)
        assert result == pytest.approx(theta + CONFIDENCE_NUDGE)


class TestGetDifficultyTierIsDisplayOnly:
    def test_tier_boundaries(self):
        assert get_difficulty_tier(-1.0) == "easy"
        assert get_difficulty_tier(0.0) == "medium"
        assert get_difficulty_tier(1.0) == "hard"


class TestComputeConfidenceScore:
    def test_empty_defaults_to_midpoint(self):
        assert compute_confidence_score([]) == 0.5

    def test_averages_mapped_scale(self):
        recent = [_resp(True, confidence=1), _resp(True, confidence=4)]
        assert compute_confidence_score(recent) == pytest.approx((0.0 + 1.0) / 2)
