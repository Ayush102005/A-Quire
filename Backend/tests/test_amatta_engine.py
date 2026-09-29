import pytest
import math
from unittest.mock import MagicMock, AsyncMock

from app.services.adaptive_engine import (
    AdaptiveEngine,
    REASON_NO_ELIGIBLE_ITEMS,
    REASON_NO_UNUSED_ITEMS,
    REASON_LOW_INFORMATION,
    REASON_MISSING_IRT_PARAMETERS,
    REASON_GENERATION_BUDGET_EXHAUSTED,
)
from app.models.assessment import Question, QuizSession, QuizResponse, LearnerAbility
from app.services import generation_budget
from app.services.confidence_adapter import get_difficulty_tier

@pytest.mark.asyncio
class TestAdaptiveEngine:
    def test_calculate_probability_normal(self):
        # 1PL Rasch
        p = AdaptiveEngine.calculate_probability(theta=1.0, b=1.0)
        assert math.isclose(p, 0.5, abs_tol=1e-5)
        
        # Easy question, high ability
        p = AdaptiveEngine.calculate_probability(theta=2.0, b=-2.0)
        assert p > 0.95
        
        # Hard question, low ability
        p = AdaptiveEngine.calculate_probability(theta=-2.0, b=2.0)
        assert p < 0.05

    def test_calculate_probability_nan_inf(self):
        # Should gracefully fallback to guessing parameter (0.0 default) if NaN
        p = AdaptiveEngine.calculate_probability(theta=float('nan'), b=1.0)
        assert p == 0.0

        p = AdaptiveEngine.calculate_probability(theta=1.0, b=float('inf'))
        assert p == 0.0

    def test_calculate_probability_overflow(self):
        # Extreme theta differences should not raise MathDomainError
        p = AdaptiveEngine.calculate_probability(theta=1000.0, b=-1000.0)
        assert p == 1.0

        p = AdaptiveEngine.calculate_probability(theta=-1000.0, b=1000.0)
        assert p == 0.0
        
    async def test_process_answer_bounds(self):
        mock_db = AsyncMock()
        session = QuizSession(id=1, user_id=1, topic_id=1, current_theta=3.9)
        question = Question(id=1, difficulty_b=-2.0, response_count=0, correct_count=0) # Easy
        
        # Mocking scalar_one_or_none returns
        mock_result_session = MagicMock()
        mock_result_session.scalar_one_or_none.return_value = session
        
        mock_result_question = MagicMock()
        mock_result_question.scalar_one_or_none.return_value = question
        
        mock_result_dup = MagicMock()
        mock_result_dup.scalar_one_or_none.return_value = None

        # process_answer now fetches the last 2 prior responses (for the
        # confidence-adjustment streak check) between the duplicate check
        # and the LearnerAbility lookup.
        mock_result_prior = MagicMock()
        mock_result_prior.all.return_value = []

        mock_result_ability = MagicMock()
        mock_result_ability.scalar_one_or_none.return_value = None

        mock_db.execute.side_effect = [
            mock_result_session,
            mock_result_question,
            mock_result_dup,
            mock_result_prior,
            mock_result_ability
        ]

        # Student gets it correct. Expected score is close to 1.0. Delta theta will be small.
        # But if they got it right, theta goes up. If it goes above 4.0, it should clamp.
        new_theta, _ = await AdaptiveEngine.process_answer(mock_db, 1, 1, True, "A")
        assert new_theta <= 4.0
        
    async def test_process_answer_duplicate(self):
        mock_db = AsyncMock()
        session = QuizSession(id=1, user_id=1, topic_id=1, current_theta=0.0)
        question = Question(id=1, difficulty_b=0.0)
        existing_response = QuizResponse(id=99)
        
        mock_result_session = MagicMock()
        mock_result_session.scalar_one_or_none.return_value = session
        
        mock_result_question = MagicMock()
        mock_result_question.scalar_one_or_none.return_value = question
        
        mock_result_dup = MagicMock()
        mock_result_dup.scalar_one_or_none.return_value = existing_response
        
        mock_db.execute.side_effect = [
            mock_result_session,
            mock_result_question,
            mock_result_dup
        ]
        
        new_theta, resp_id = await AdaptiveEngine.process_answer(mock_db, 1, 1, True, "A")

        # Theta shouldn't change, returns existing response ID
        assert new_theta == 0.0
        assert resp_id == 99

    # ── Eligibility ────────────────────────────────────────────────────────

    def test_has_valid_irt_params_rejects_none_nan_inf(self):
        assert AdaptiveEngine.has_valid_irt_params(
            Question(difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        ) is True
        assert AdaptiveEngine.has_valid_irt_params(
            Question(difficulty_b=None, discrimination_a=1.0, guessing_c=0.0)
        ) is False
        assert AdaptiveEngine.has_valid_irt_params(
            Question(difficulty_b=float('nan'), discrimination_a=1.0, guessing_c=0.0)
        ) is False
        assert AdaptiveEngine.has_valid_irt_params(
            Question(difficulty_b=float('inf'), discrimination_a=1.0, guessing_c=0.0)
        ) is False

    def test_filter_eligible_excludes_asked_and_invalid_irt(self):
        q_ok = Question(id=1, difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        q_asked = Question(id=2, difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        q_bad_irt = Question(id=3, difficulty_b=None, discrimination_a=1.0, guessing_c=0.0)

        eligible = AdaptiveEngine.filter_eligible([q_ok, q_asked, q_bad_irt], asked_question_ids={2})

        assert eligible == [q_ok]

    def test_diagnose_empty_pool_reasons(self):
        # No status-eligible items at all (simulated via the defensive
        # is_active/is_archived hooks, which default permissive today).
        assert AdaptiveEngine.diagnose_empty_pool([]) == REASON_NO_ELIGIBLE_ITEMS

        # Status-eligible but all missing valid IRT params.
        q_bad = Question(id=1, difficulty_b=None, discrimination_a=1.0, guessing_c=0.0)
        assert AdaptiveEngine.diagnose_empty_pool([q_bad]) == REASON_MISSING_IRT_PARAMETERS

        # Status- and IRT-eligible, so filter_eligible() coming back empty
        # must mean they were all already asked.
        q_ok = Question(id=1, difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        assert AdaptiveEngine.diagnose_empty_pool([q_ok]) == REASON_NO_UNUSED_ITEMS

    # ── Ranking by Fisher information (not raw |theta - b| distance) ───────

    def test_rank_by_information_prefers_higher_discrimination_over_closer_b(self):
        theta = 0.0
        # Numerically closer to theta, but low discrimination -> low info.
        q_close_low_disc = Question(id=1, difficulty_b=0.0, discrimination_a=0.3, guessing_c=0.0)
        # Numerically farther from theta, but high discrimination -> higher info.
        q_far_high_disc = Question(id=2, difficulty_b=1.0, discrimination_a=3.0, guessing_c=0.0)

        info_close = AdaptiveEngine.calculate_information(theta, q_close_low_disc.difficulty_b, q_close_low_disc.discrimination_a, q_close_low_disc.guessing_c)
        info_far = AdaptiveEngine.calculate_information(theta, q_far_high_disc.difficulty_b, q_far_high_disc.discrimination_a, q_far_high_disc.guessing_c)
        assert info_far > info_close  # sanity-check the premise

        best, max_info = AdaptiveEngine.rank_by_information([q_close_low_disc, q_far_high_disc], theta)
        assert best is q_far_high_disc
        assert max_info == pytest.approx(info_far)

    def test_rank_by_information_ties_break_on_lowest_id(self):
        theta = 0.0
        q_a = Question(id=5, difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        q_b = Question(id=2, difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        best, _ = AdaptiveEngine.rank_by_information([q_a, q_b], theta)
        assert best is q_b

    def test_difficulty_tier_does_not_influence_ranking(self):
        # Two items straddling the easy/medium tier boundary near theta —
        # under the OLD tier-snapping selection, a theta that mapped to
        # "medium" would have excluded the "easy" item entirely. The new
        # continuous ranking must still be able to pick it purely on info.
        theta = 0.1  # tier("medium") under the old bucketing
        q_easy_but_informative = Question(id=1, difficulty_b=-0.6, discrimination_a=1.0, guessing_c=0.0)  # tier("easy")
        assert get_difficulty_tier(theta) == "medium"
        assert get_difficulty_tier(q_easy_but_informative.difficulty_b) == "easy"

        best, max_info = AdaptiveEngine.rank_by_information([q_easy_but_informative], theta)
        assert best is q_easy_but_informative
        assert max_info > 0.0

    # ── Generation decision ─────────────────────────────────────────────────

    def setup_method(self, method):
        generation_budget.reset_generation_budget()

    def test_decide_generation_skips_when_informative_item_exists(self):
        q = Question(id=1, difficulty_b=0.0, discrimination_a=1.0, guessing_c=0.0)
        max_info = AdaptiveEngine.calculate_information(0.0, 0.0, 1.0, 0.0)  # 0.25, well above default threshold
        should_generate, reason = AdaptiveEngine.decide_generation(
            eligible_questions=[q], max_info=max_info, session_id=1, topic_id=1, topic_exists=True,
        )
        assert should_generate is False
        assert reason is None

    def test_decide_generation_triggers_on_no_eligible_items(self):
        should_generate, reason = AdaptiveEngine.decide_generation(
            eligible_questions=[], max_info=-1.0, session_id=1, topic_id=1, topic_exists=True,
        )
        assert should_generate is True
        assert reason is None

    def test_decide_generation_triggers_on_low_information(self):
        q = Question(id=1, difficulty_b=10.0, discrimination_a=0.01, guessing_c=0.0)  # deliberately uninformative at theta=0
        max_info = AdaptiveEngine.calculate_information(0.0, 10.0, 0.01, 0.0)
        assert max_info < 0.05  # below the default AI_GENERATION_INFO_THRESHOLD
        should_generate, reason = AdaptiveEngine.decide_generation(
            eligible_questions=[q], max_info=max_info, session_id=1, topic_id=1, topic_exists=True,
        )
        assert should_generate is True
        assert reason is None

    def test_decide_generation_respects_session_budget(self):
        from app.core.config import settings
        for _ in range(settings.AI_GENERATION_MAX_PER_SESSION):
            generation_budget.begin_generation(session_id=1, topic_id=1)
            generation_budget.end_generation(topic_id=1)

        should_generate, reason = AdaptiveEngine.decide_generation(
            eligible_questions=[], max_info=-1.0, session_id=1, topic_id=1, topic_exists=True,
        )
        assert should_generate is False
        assert reason == REASON_GENERATION_BUDGET_EXHAUSTED

    def test_decide_generation_blocked_while_in_progress(self):
        generation_budget.begin_generation(session_id=1, topic_id=1)  # never ended -> still "in progress"

        should_generate, reason = AdaptiveEngine.decide_generation(
            eligible_questions=[], max_info=-1.0, session_id=1, topic_id=2, topic_exists=True,
        )
        # Different topic_id -> not blocked by the in-progress lock on topic 1.
        assert should_generate is True

        should_generate, reason = AdaptiveEngine.decide_generation(
            eligible_questions=[], max_info=-1.0, session_id=1, topic_id=1, topic_exists=True,
        )
        assert should_generate is False
        assert reason == REASON_GENERATION_BUDGET_EXHAUSTED

    # ── Marks/weightage (compute_marks) ────────────────────────────────────

    def test_compute_marks_gate_easy_question_correct(self):
        # difficulty_b < 0 -> 1-mark GATE question
        assert AdaptiveEngine.compute_marks(-1.0, "GATE", is_correct=True) == 1.0

    def test_compute_marks_gate_easy_question_wrong(self):
        # Implementation rounds to 2dp, so compare against that rounded value.
        assert math.isclose(AdaptiveEngine.compute_marks(-1.0, "GATE", is_correct=False), round(-1.0 / 3.0, 2), abs_tol=1e-6)

    def test_compute_marks_gate_hard_question_correct(self):
        # difficulty_b >= 0 -> 2-mark GATE question
        assert AdaptiveEngine.compute_marks(1.5, "GATE", is_correct=True) == 2.0

    def test_compute_marks_gate_hard_question_wrong(self):
        assert math.isclose(AdaptiveEngine.compute_marks(1.5, "GATE", is_correct=False), round(-2.0 / 3.0, 2), abs_tol=1e-6)

    def test_compute_marks_gate_boundary_is_two_mark(self):
        # difficulty_b == 0.0 is the >= boundary -> 2-mark, not 1-mark
        assert AdaptiveEngine.compute_marks(0.0, "GATE", is_correct=True) == 2.0

    def test_compute_marks_gate_case_insensitive(self):
        assert AdaptiveEngine.compute_marks(-1.0, "gate", is_correct=True) == 1.0

    def test_compute_marks_continuous_scales_with_difficulty(self):
        # [-4, 4] -> [1, 5]
        assert AdaptiveEngine.compute_marks(-4.0, "JEE", is_correct=True) == 1.0
        assert AdaptiveEngine.compute_marks(0.0, "JEE", is_correct=True) == 3.0
        assert AdaptiveEngine.compute_marks(4.0, "JEE", is_correct=True) == 5.0

    def test_compute_marks_continuous_no_negative_marking(self):
        assert AdaptiveEngine.compute_marks(4.0, "JEE", is_correct=False) == 0.0
        assert AdaptiveEngine.compute_marks(-4.0, None, is_correct=False) == 0.0

    def test_compute_marks_no_exam_category_uses_continuous_scheme(self):
        assert AdaptiveEngine.compute_marks(0.0, None, is_correct=True) == 3.0

    def test_compute_marks_none_difficulty_treated_as_average(self):
        assert AdaptiveEngine.compute_marks(None, None, is_correct=True) == 3.0
        assert AdaptiveEngine.compute_marks(None, "GATE", is_correct=True) == 2.0  # 0.0 >= 0 -> 2-mark

    def test_compute_marks_clamps_out_of_range_difficulty(self):
        assert AdaptiveEngine.compute_marks(100.0, "JEE", is_correct=True) == 5.0
        assert AdaptiveEngine.compute_marks(-100.0, "JEE", is_correct=True) == 1.0
