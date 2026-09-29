"""
app/services/adaptive_engine.py
───────────────────────────────
AMATTA (Adaptive Engine) implementation using Item Response Theory.

theta (learner ability) and b (item difficulty) live on the continuous
[-4.0, 4.0] spectrum throughout — there is no tier-snapping in the selection
or theta-update math. `get_difficulty_tier` (confidence_adapter.py) is used
only to populate `QuizResponse.difficulty` for instructor UX/analytics.
"""
import logging
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.assessment import Question, LearnerAbility, QuizSession, QuizResponse, Topic
from app.models.course import Course
from app.models.lesson import Lesson
from app.services.generator_service import generator_service
from app.services.confidence_adapter import apply_confidence_adjustment, get_difficulty_tier, RecentResponse
from app.services import generation_budget

logger = logging.getLogger(__name__)

THETA_MIN, THETA_MAX = -4.0, 4.0

# Reasons get_next_question's internal generation decision can report — see
# _decide_generation(). Logged (not returned over the public Question | None
# API, which callers in app/api/v1/assessments.py already treat as "no more
# questions" on None) and exposed on AdaptiveEngine for direct unit testing.
REASON_NO_ELIGIBLE_ITEMS = "no_eligible_items"
REASON_NO_UNUSED_ITEMS = "no_unused_items"
REASON_LOW_INFORMATION = "low_information"
REASON_MISSING_IRT_PARAMETERS = "missing_irt_parameters"
REASON_GENERATION_BUDGET_EXHAUSTED = "generation_budget_exhausted"


class AdaptiveEngine:
    """
    Core engine for dynamic difficulty adjustment.
    Currently implements a 1PL (Rasch) or basic 3PL model for probability and information.
    """

    @staticmethod
    def calculate_probability(theta: float, b: float, a: float = 1.0, c: float = 0.0) -> float:
        """
        Calculate the probability of a correct response using the 3-Parameter Logistic (3PL) model.
        P(θ) = c + (1 - c) / (1 + exp(-a * (θ - b)))
        """
        if any(math.isnan(x) or math.isinf(x) for x in (theta, b, a, c)):
            return c

        exponent = -a * (theta - b)
        # Prevent math.exp overflow (exp(709) is the limit)
        if exponent > 500:
            return c
        if exponent < -500:
            return 1.0

        p = c + (1 - c) / (1 + math.exp(exponent))
        return p

    @staticmethod
    def calculate_information(theta: float, b: float, a: float = 1.0, c: float = 0.0) -> float:
        """
        Calculate Fisher Information for an item at a given ability level (theta).
        I(θ) = a^2 * (P(θ) - c)^2 * (1 - P(θ)) / ( (1 - c)^2 * P(θ) )
        For a 1PL model (a=1, c=0), this simplifies to P(θ) * (1 - P(θ)).
        """
        p = AdaptiveEngine.calculate_probability(theta, b, a, c)

        # Avoid division by zero if p is exactly 0 or 1
        if p <= 0.0 or p >= 1.0:
            return 0.0

        if c == 0.0 and a == 1.0:
            return p * (1 - p)

        # Prevent division by zero if c is exactly 1.0 (invalid test item but must not crash)
        c_safe = min(c, 0.99)
        info = (a**2 * (p - c_safe)**2 * (1 - p)) / (((1 - c_safe)**2) * p)
        return info

    # ── Eligibility ────────────────────────────────────────────────────────

    @staticmethod
    def has_valid_irt_params(q: Question) -> bool:
        """True if q.difficulty_b/discrimination_a/guessing_c are all real, finite numbers."""
        for val in (q.difficulty_b, q.discrimination_a, q.guessing_c):
            if val is None:
                return False
            if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                return False
        return True

    @staticmethod
    def compute_marks(difficulty_b: float | None, exam_category: str | None, is_correct: bool) -> float:
        """
        Marks/weightage for answering a question, exam-aware:

        - GATE: the real GATE convention — a question is worth 1 mark if it's
          easier than average for its topic (difficulty_b < 0) or 2 marks if
          harder (difficulty_b >= 0), with GATE's standard negative marking
          on a wrong answer (-1/3 for a 1-mark question, -2/3 for a 2-mark
          one). Correct answers earn the full mark value.
        - Every other exam category (or no course/exam context at all — e.g.
          standalone topic practice): a continuous weight tied directly to
          difficulty_b, linearly mapped from [-4, 4] to [1, 5] marks — harder
          questions are worth more, by construction, with no separate state
          to track. No negative marking; a wrong answer earns 0 — the *next*
          question's weight already drops on its own, since the adaptive
          engine re-selects a lower-difficulty item after a wrong answer.
        """
        b = 0.0 if difficulty_b is None else difficulty_b
        b = max(-4.0, min(4.0, b))

        if exam_category and exam_category.strip().upper() == "GATE":
            is_two_mark = b >= 0.0
            full_marks = 2.0 if is_two_mark else 1.0
            if is_correct:
                return full_marks
            return round(-(2.0 / 3.0), 2) if is_two_mark else round(-(1.0 / 3.0), 2)

        full_marks = round(1.0 + (b + 4.0) / 8.0 * 4.0, 1)  # [-4, 4] -> [1, 5]
        return full_marks if is_correct else 0.0

    @staticmethod
    def passes_status_checks(q: Question) -> bool:
        """
        Active/published/not-archived/not-pending-review/within-exposure-limit
        checks. None of these fields exist on the current Question model —
        every check is a defensive `getattr` with a permissive default, so
        this is a no-op today but honors the fields the moment a moderation/
        exposure-control workflow adds them, with no further code changes.
        """
        if getattr(q, "is_active", True) is False:
            return False
        if getattr(q, "is_published", True) is False:
            return False
        if getattr(q, "is_archived", False) is True:
            return False
        if getattr(q, "pending_review", False) is True:
            return False

        exposure_count = getattr(q, "exposure_count", None)
        max_exposure = getattr(q, "max_exposure", None)
        if exposure_count is not None and max_exposure is not None and exposure_count >= max_exposure:
            return False

        return True

    @staticmethod
    def filter_eligible(questions, asked_question_ids: set[int]) -> list[Question]:
        """Status + IRT-validity eligible AND not already served in this session."""
        return [
            q for q in questions
            if q.id not in asked_question_ids
            and AdaptiveEngine.passes_status_checks(q)
            and AdaptiveEngine.has_valid_irt_params(q)
        ]

    @staticmethod
    def diagnose_empty_pool(questions) -> str:
        """
        Only called when filter_eligible() returns empty — figures out which
        of the three possible reasons applies, for logging. Doesn't need
        asked_question_ids itself: if status- and IRT-eligible items exist
        here but filter_eligible() still came back empty, they must all
        already have been served in this session (by elimination).
        """
        status_ok = [q for q in questions if AdaptiveEngine.passes_status_checks(q)]
        if not status_ok:
            return REASON_NO_ELIGIBLE_ITEMS
        irt_ok = [q for q in status_ok if AdaptiveEngine.has_valid_irt_params(q)]
        if not irt_ok:
            return REASON_MISSING_IRT_PARAMETERS
        return REASON_NO_UNUSED_ITEMS

    @staticmethod
    def rank_by_information(questions: list[Question], theta: float) -> tuple[Question | None, float]:
        """Pick the eligible question with the highest Fisher information at theta (ties -> lowest id)."""
        best_question = None
        max_info = -1.0
        for q in questions:
            a = 1.0 if q.discrimination_a is None else q.discrimination_a
            c = 0.0 if q.guessing_c is None else q.guessing_c
            info = AdaptiveEngine.calculate_information(theta=theta, b=q.difficulty_b, a=a, c=c)

            if info > max_info:
                max_info = info
                best_question = q
            elif info == max_info and best_question is not None and q.id < best_question.id:
                best_question = q
        return best_question, max_info

    @staticmethod
    def decide_generation(
        *, eligible_questions: list[Question], max_info: float, session_id: int, topic_id: int,
        topic_exists: bool,
    ) -> tuple[bool, str | None]:
        """
        Whether get_next_question should attempt AI generation right now, and
        if not, the specific reason. Trigger conditions (either is enough to
        consider generating): no eligible unused item exists, OR max Fisher
        information among eligible items is below the configured threshold.
        Generation additionally requires: AI generation enabled, topic
        context available, per-session/per-topic budget not exhausted, and
        no matching generation already in progress for this topic.
        """
        needs_generation = (not eligible_questions) or (max_info < settings.AI_GENERATION_INFO_THRESHOLD)
        if not needs_generation:
            return False, None

        if not settings.AI_GENERATION_ENABLED:
            return False, REASON_LOW_INFORMATION if eligible_questions else REASON_NO_UNUSED_ITEMS
        if not topic_exists:
            return False, REASON_LOW_INFORMATION if eligible_questions else REASON_NO_UNUSED_ITEMS
        if not generation_budget.can_generate(
            session_id, topic_id,
            settings.AI_GENERATION_MAX_PER_SESSION, settings.AI_GENERATION_MAX_PER_TOPIC,
        ):
            return False, REASON_GENERATION_BUDGET_EXHAUSTED

        return True, None

    @staticmethod
    async def get_next_question(db: AsyncSession, session_id: int) -> Question | None:
        """
        Selects the next optimal question for the user in the given quiz
        session, ranking all eligible items by Fisher Information at the
        session's current (already confidence-adjusted, see process_answer)
        continuous theta. Falls back to AI generation only per
        decide_generation()'s rate-limited, eligibility-aware contract.
        """
        # Fetch the session
        result = await db.execute(select(QuizSession).where(QuizSession.id == session_id))
        quiz_session = result.scalar_one_or_none()

        if not quiz_session or not quiz_session.is_active:
            return None

        # Fetch all questions already asked in this session
        resp_result = await db.execute(
            select(QuizResponse.question_id).where(QuizResponse.session_id == session_id)
        )
        asked_question_ids = {r[0] for r in resp_result.all()}

        # Fetch the full topic question pool
        q_result = await db.execute(select(Question).where(Question.topic_id == quiz_session.topic_id))
        topic_questions = q_result.scalars().all()

        theta = quiz_session.current_theta

        eligible_questions = AdaptiveEngine.filter_eligible(topic_questions, asked_question_ids)
        best_question, max_info = AdaptiveEngine.rank_by_information(eligible_questions, theta)

        if not eligible_questions:
            logger.info(
                "AMATTA session=%s topic=%s: no eligible existing item (%s)",
                session_id, quiz_session.topic_id, AdaptiveEngine.diagnose_empty_pool(topic_questions),
            )

        topic = (await db.execute(select(Topic).where(Topic.id == quiz_session.topic_id))).scalar_one_or_none()

        should_generate, block_reason = AdaptiveEngine.decide_generation(
            eligible_questions=eligible_questions,
            max_info=max_info,
            session_id=session_id,
            topic_id=quiz_session.topic_id,
            topic_exists=topic is not None,
        )

        if should_generate:
            target_b = max(THETA_MIN, min(THETA_MAX, theta))

            # Grounds both subject matter (lesson_title) and exam-appropriate
            # style/register (exam_category) — see generate_question()'s
            # docstring. Neither is required: a topic-only practice session
            # (no course_id/lesson_id) still generates fine without them.
            exam_category = None
            if quiz_session.course_id is not None:
                course = (
                    await db.execute(select(Course).where(Course.id == quiz_session.course_id))
                ).scalar_one_or_none()
                if course is not None:
                    exam_category = course.exam_category

            lesson_title = None
            transcript = None
            if quiz_session.lesson_id is not None:
                lesson = (
                    await db.execute(select(Lesson).where(Lesson.id == quiz_session.lesson_id))
                ).scalar_one_or_none()
                if lesson is not None:
                    transcript = lesson.transcript
                    lesson_title = lesson.title
            elif quiz_session.module_id is not None:
                lessons = (
                    await db.execute(select(Lesson).where(Lesson.module_id == quiz_session.module_id))
                ).scalars().all()
                combined_transcript = []
                for lesson in lessons:
                    if lesson.transcript:
                        combined_transcript.extend(lesson.transcript)
                if combined_transcript:
                    transcript = combined_transcript

            previously_asked_content = [
                q.content for q in topic_questions if q.id in asked_question_ids
            ]

            generation_budget.begin_generation(session_id, quiz_session.topic_id)
            new_q = None
            try:
                new_q = await generator_service.generate_question(
                    topic_id=quiz_session.topic_id,
                    topic_name=topic.name,
                    target_b=target_b,
                    transcript=transcript,
                    previously_asked_content=previously_asked_content,
                    exam_category=exam_category,
                    lesson_title=lesson_title,
                )
            except Exception as e:
                logger.error("Question generation failed for topic %s: %s", quiz_session.topic_id, e)
            finally:
                generation_budget.end_generation(quiz_session.topic_id)

            if new_q:
                db.add(new_q)
                await db.commit()
                await db.refresh(new_q)
                best_question = new_q
            else:
                logger.info("AMATTA session=%s topic=%s: generation attempt failed", session_id, quiz_session.topic_id)
        elif block_reason:
            logger.info("AMATTA session=%s topic=%s: generation skipped (%s)", session_id, quiz_session.topic_id, block_reason)

        return best_question

    @staticmethod
    async def process_answer(
        db: AsyncSession, session_id: int, question_id: int, is_correct: bool, selected_option: str,
        confidence: int | None = None, error_type: str | None = None
    ) -> tuple[float, int]:
        """
        Processes a submitted answer:
          1. Computes theta_irt via the 3PL gradient-ascent update (delta_theta).
          2. Applies the secondary confidence-streak adjustment on top of theta_irt.
          3. Clamps and persists the result to session.current_theta / LearnerAbility.
        Returns (new_theta, response_id).
        """
        # 1. Fetch Session and Question
        session = (await db.execute(select(QuizSession).where(QuizSession.id == session_id))).scalar_one_or_none()
        if not session:
            raise ValueError("Invalid session")

        question = (await db.execute(select(Question).where(Question.id == question_id))).scalar_one_or_none()
        if not question:
            raise ValueError("Invalid question")

        # difficulty_tier is stored on QuizResponse purely for instructor
        # UX/analytics — it never feeds back into theta or item selection.
        difficulty_tier = get_difficulty_tier(question.difficulty_b)

        # 1.5 Prevent duplicate submissions for the same question in the same session
        existing_response = (await db.execute(
            select(QuizResponse).where(
                and_(QuizResponse.session_id == session_id, QuizResponse.question_id == question_id)
            )
        )).scalar_one_or_none()

        if existing_response:
            # If it's a duplicate, do not update theta. Just return the existing session theta and the old response id.
            return session.current_theta, existing_response.id

        # 1.6 Fetch the last 2 prior responses in this session (oldest-to-
        # newest), so the confidence adjustment below can evaluate a streak
        # INCLUDING the answer being processed right now.
        prior_raw = await db.execute(
            select(QuizResponse, Question.difficulty_b)
            .join(Question, QuizResponse.question_id == Question.id)
            .where(QuizResponse.session_id == session_id)
            .order_by(QuizResponse.created_at.desc())
            .limit(2)
        )
        prior_responses = [
            RecentResponse(
                question_id=resp.question_id,
                is_correct=resp.is_correct,
                confidence=resp.confidence or 2,
                difficulty=diff_b,
            )
            for resp, diff_b in prior_raw.all()
        ]
        recent_responses = list(reversed(prior_responses)) + [
            RecentResponse(
                question_id=question_id,
                is_correct=is_correct,
                confidence=confidence or 2,
                difficulty=question.difficulty_b,
            )
        ]

        # 2. Record Response
        response = QuizResponse(
            session_id=session_id,
            question_id=question_id,
            is_correct=is_correct,
            selected_option=selected_option,
            confidence=confidence,
            difficulty=difficulty_tier,
            error_type=error_type
        )
        db.add(response)

        # 4. Persist to LearnerAbility model
        ability = (await db.execute(
            select(LearnerAbility).where(
                and_(LearnerAbility.user_id == session.user_id, LearnerAbility.topic_id == session.topic_id)
            )
        )).scalar_one_or_none()

        response_count = ability.response_count if ability else 0

        # Update Theta using heuristic Stochastic Gradient Descent
        # Note: delta_theta = LR * (actual - expected) represents a scaled
        # gradient ascent step for the 1PL (Rasch) log-likelihood function.
        BASE_LEARNING_RATE = 0.5
        MAX_THETA_CHANGE = 1.0

        # Phase 1: Learning Rate Decay
        # Decrease LR as we get more responses so we don't wildly jump a well-calibrated student
        LEARNING_RATE = BASE_LEARNING_RATE / (1.0 + 0.1 * response_count)

        old_theta = session.current_theta

        a = 1.0 if getattr(question, 'discrimination_a', None) is None else question.discrimination_a
        c = 0.0 if getattr(question, 'guessing_c', None) is None else question.guessing_c

        expected_score = AdaptiveEngine.calculate_probability(
            theta=old_theta,
            b=question.difficulty_b,
            a=a,
            c=c
        )
        actual_score = 1.0 if is_correct else 0.0

        delta_theta = LEARNING_RATE * (actual_score - expected_score)
        delta_theta = max(-MAX_THETA_CHANGE, min(MAX_THETA_CHANGE, delta_theta))

        # Primary update: pure IRT gradient-ascent step.
        theta_irt = old_theta + delta_theta
        theta_irt = max(THETA_MIN, min(THETA_MAX, theta_irt))

        # Secondary: bounded confidence/streak nudge on top of theta_irt.
        new_theta = apply_confidence_adjustment(theta_irt, recent_responses)
        new_theta = max(THETA_MIN, min(THETA_MAX, new_theta))

        # Update session
        session.current_theta = new_theta

        # 5. Update Question Metrics (Phase 4)
        question.response_count += 1
        if is_correct:
            question.correct_count += 1

        # Very simple flagging heuristic: if it's very difficult but everyone gets it right, or very easy but everyone fails
        if question.response_count > 10:
            correct_rate = question.correct_count / question.response_count
            if (question.difficulty_b > 2.0 and correct_rate > 0.8) or (question.difficulty_b < -2.0 and correct_rate < 0.2):
                question.is_flagged = True

        if ability:
            ability.theta = new_theta
            ability.response_count += 1
        else:
            ability = LearnerAbility(
                user_id=session.user_id,
                topic_id=session.topic_id,
                theta=new_theta,
                response_count=1
            )
            db.add(ability)

        await db.commit()
        await db.refresh(response)
        return new_theta, response.id

adaptive_engine = AdaptiveEngine()
