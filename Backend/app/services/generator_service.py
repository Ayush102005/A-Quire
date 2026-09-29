"""
app/services/generator_service.py
───────────────────────────────
Claude-powered Question Generator for AMATTA.
"""

import json
import logging
import asyncio
from typing import Any

from app.core.config import settings
from app.models.assessment import Question

logger = logging.getLogger(__name__)

# Cap the transcript text fed into the prompt so a long video can't blow up
# the request's token budget/cost. Leading portion only — a truncation
# strategy simple enough to reason about; most lesson transcripts covering
# a single focused concept fit well within this.
MAX_TRANSCRIPT_CHARS = 6000


# Concrete, per-exam style guidance for the generation prompt. A generic
# "match {exam}'s style" instruction wasn't enough to keep Claude away from
# bare definition-recall questions ("which of the following defines X?") —
# real GATE/JEE/NEET questions almost never ask that; they present a
# concrete scenario or small computation and require the student to apply
# the concept. Each entry below spells out what that actually looks like for
# that exam. Falls back to the generic instruction for any category without
# a specific entry here.
_EXAM_STYLE_NOTES: dict[str, str] = {
    "GATE": (
        "Real GATE questions (Computer Science/Engineering stream) are almost never bare "
        "definition-recall (\"which of the following defines X\") — they present a concrete "
        "scenario, example, or small computation and require the student to apply or "
        "compute something, e.g. \"Let R be a relation on {1, 2, 3, 4} defined by...\", "
        "\"How many distinct equivalence relations exist on a set of size 4?\", \"Consider "
        "the Hasse diagram below...\". Write this question the same way — grounded in a "
        "specific, concrete instance of the concept, requiring the student to reason or "
        "compute, not just recall a definition. Match GATE's precise, technical register "
        "and the level of multi-step reasoning a real GATE question demands."
    ),
    "JEE": (
        "Real JEE questions are computation-heavy and scenario-based, not definition-recall "
        "— they give specific numeric values, equations, or configurations and require "
        "multi-step calculation or derivation to reach the answer. Write this question the "
        "same way: a concrete, numeric or symbolic setup the student must work through, at "
        "JEE's characteristic difficulty and pace, not a bare \"what is X\" question."
    ),
    "NEET": (
        "Real NEET questions test applied conceptual understanding through specific "
        "scenarios (a described organism, process, or experimental observation), not bare "
        "definition-recall. Write this question the same way — grounded in a concrete "
        "example or scenario that requires applying the concept, at NEET's characteristic "
        "rigor."
    ),
}


def _exam_style_block(exam_category: str | None) -> str:
    if not exam_category:
        return ""
    cat = exam_category.strip()
    note = _EXAM_STYLE_NOTES.get(cat.upper())
    if not note:
        note = (
            f"Match {cat}'s real question style, register, and rigor exactly — the "
            f"phrasing, the kind of reasoning expected, and the level of detail an actual "
            f"{cat} question on this subject would have, not a generic textbook question."
        )
    return f"This question is for a student preparing for the **{cat}** exam. {note}\n\n"


def _transcript_to_text(transcript: list[dict] | None) -> str | None:
    """Flatten a Lesson.transcript segment list (see app/utils/youtube.py)
    into plain text for the generation prompt, or None if there's nothing
    usable."""
    if not transcript:
        return None
    text = " ".join(seg.get("text", "") for seg in transcript if seg.get("text")).strip()
    if not text:
        return None
    if len(text) > MAX_TRANSCRIPT_CHARS:
        text = text[:MAX_TRANSCRIPT_CHARS].rsplit(" ", 1)[0] + "…"
    return text


class QuestionGenerator:
    """
    Generates dynamic assessment questions using the Anthropic API (Claude).
    """

    def __init__(self):
        self.client = None
        if settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                headers = {}
                if settings.ANTHROPIC_WORKSPACE_ID:
                    headers["anthropic-workspace-id"] = settings.ANTHROPIC_WORKSPACE_ID
                self.client = anthropic.Anthropic(
                    api_key=settings.ANTHROPIC_API_KEY,
                    default_headers=headers if headers else None
                )
                logger.info(f"QuestionGenerator Anthropic client initialized (model={settings.ANTHROPIC_MODEL_ID})")
            except ImportError:
                logger.warning("QuestionGenerator: anthropic package not installed.")
            except Exception as e:
                logger.error(f"Failed to init Anthropic client in QuestionGenerator: {e}")
        else:
            logger.info("QuestionGenerator: ANTHROPIC_API_KEY not set.")

    async def generate_question(
        self, topic_id: int, topic_name: str, target_b: float,
        transcript: list[dict] | None = None,
        previously_asked_content: list[str] | None = None,
        exam_category: str | None = None,
        lesson_title: str | None = None,
    ) -> Question | None:
        """
        Generates a new Question for a given topic, targeting a precise
        continuous IRT difficulty (`target_b`, on the [-4.0, 4.0] scale) —
        no tier bucketing. `target_b` is normally
        `selection_result.recommended_target_b or quiz_session.current_theta`,
        clamped to [-4.0, 4.0] by the caller (see adaptive_engine.py).

        `exam_category` (e.g. "GATE", "JEE", "NEET" — from the launching
        Course, see adaptive_engine.py) and `lesson_title` (the specific
        video's title, e.g. "Discrete Mathematics") ground both the subject
        matter AND the exam-appropriate style/register of the question —
        a GATE-level question on the same topic reads very differently from
        a NEET-level one, even at the same numeric IRT difficulty.

        When `transcript` (the lesson video's transcript segments, see
        app/utils/youtube.py) is provided, the question is grounded in that
        specific content instead of only the topic name — every generated
        question, options, and answer must be answerable from what was
        actually said in the video. Falls back to topic-name-only generation
        when no transcript is available (e.g. standalone topic practice).

        Returns an unsaved Question SQLAlchemy model instance (with
        `is_provisional=True` — the LLM-produced `b` is a seed, not
        empirically validated), or None if it fails.
        """
        if not self.client:
            logger.warning("QuestionGenerator: Anthropic client not available. Cannot generate question.")
            return None

        target_b = max(-4.0, min(4.0, target_b))

        transcript_text = _transcript_to_text(transcript)

        exclusion_prompt = ""
        if previously_asked_content:
            exclusion_prompt = "\nIMPORTANT: Do NOT generate questions identical or extremely similar to these recently asked questions:\n"
            for past_q in previously_asked_content:
                exclusion_prompt += f"- {past_q}\n"

        subject_label = f'"{lesson_title}"' if lesson_title else f'"{topic_name}"'
        exam_block = _exam_style_block(exam_category)

        if transcript_text:
            prompt = f"""You are an expert educator and psychometrician creating content for an adaptive assessment platform.

{exam_block}Below is the transcript of a lesson video titled {subject_label} (topic: "{topic_name}"):
---
{transcript_text}
---

Generate ONE multiple-choice question that tests understanding of the core concepts covered in this transcript. Focus purely on the educational subject matter. Do NOT ask "meta" questions about the video itself (e.g., do not ask about the video's structure, chapter lists, what the instructor said, or future videos). Do not invent facts that aren't in it, and do not ask something a viewer could only answer from outside knowledge. Every option must be plausible to someone who watched the video but didn't fully grasp the concept.{exclusion_prompt}

The question's difficulty must be precisely calibrated to target an IRT
difficulty parameter (b) of {target_b:.2f} on a continuous scale from -4.0
(easiest) to 4.0 (hardest), where 0.0 is average difficulty for this topic.
Do not round to a coarse easy/medium/hard bucket — aim for this exact value.

The question must be rigorous, clear, and unambiguous, with exactly 4 options.
Return ONLY a valid JSON object (no markdown formatting, no code blocks, just raw JSON) matching this exact structure:
{{
  "content": "The question text, clear and concise.",
  "options": {{"A": "First option", "B": "Second option", "C": "Third option", "D": "Fourth option"}},
  "correct_option": "A",
  "difficulty_b": {target_b:.2f},
  "discrimination_a": 1.0,
  "guessing_c": 0.25
}}
"""
        else:
            prompt = f"""You are an expert educator and psychometrician creating content for an adaptive assessment platform.

{exam_block}Generate a multiple-choice question on the topic: {subject_label}.{exclusion_prompt}

The question's difficulty must be precisely calibrated to target an IRT
difficulty parameter (b) of {target_b:.2f} on a continuous scale from -4.0
(easiest) to 4.0 (hardest), where 0.0 is average difficulty for this topic.
Do not round to a coarse easy/medium/hard bucket — aim for this exact value.

The question must be rigorous, clear, and unambiguous, with exactly 4 options.
Return ONLY a valid JSON object (no markdown formatting, no code blocks, just raw JSON) matching this exact structure:
{{
  "content": "The question text, clear and concise.",
  "options": {{"A": "First option", "B": "Second option", "C": "Third option", "D": "Fourth option"}},
  "correct_option": "A",
  "difficulty_b": {target_b:.2f},
  "discrimination_a": 1.0,
  "guessing_c": 0.25
}}
"""

        content_text = ""
        try:
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=settings.ANTHROPIC_MODEL_ID,
                max_tokens=4096,
                output_config={"effort": "low"},
                messages=[{"role": "user", "content": prompt}],
            )

            # Sonnet 5 has thinking on by default, so content[0] may be a
            # ThinkingBlock rather than the text block — find it by type.
            content_text = next(
                block.text for block in response.content if block.type == "text"
            ).strip()

            # Clean up the output in case the LLM returned markdown blocks
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.startswith("```"):
                content_text = content_text[3:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
            
            content_text = content_text.strip()
            data = json.loads(content_text)

            # Validate basic fields
            if not all(k in data for k in ["content", "options", "correct_option"]):
                raise ValueError("Missing required fields in generated JSON")
            if not isinstance(data["options"], dict) or len(data["options"]) != 4:
                raise ValueError(f"Expected exactly 4 options, got {data.get('options')!r}")
            if data["correct_option"] not in data["options"]:
                raise ValueError(f"correct_option {data['correct_option']!r} not among options {list(data['options'])!r}")

            new_question = Question(
                topic_id=topic_id,
                content=data["content"],
                options=data["options"],
                correct_option=data["correct_option"],
                difficulty_b=data.get("difficulty_b", target_b),
                discrimination_a=data.get("discrimination_a", 1.0),
                guessing_c=data.get("guessing_c", 0.25),
                response_count=0,
                correct_count=0,
                skip_count=0,
                avg_response_time_ms=0,
                is_flagged=False,
                # The LLM's difficulty_b is a seed estimate, not empirically
                # calibrated from real response data — flag it as such so
                # instructor tooling / future re-calibration jobs can find it.
                is_provisional=True,
            )

            logger.info(f"QuestionGenerator: Successfully generated a question (b={target_b:.2f}) for topic '{topic_name}'")
            return new_question

        except json.JSONDecodeError as e:
            logger.error(f"QuestionGenerator failed to parse JSON from Anthropic: {e}\nRaw output: {content_text}")
            return None
        except Exception as e:
            logger.error(f"QuestionGenerator unexpected error: {e}")
            return None

generator_service = QuestionGenerator()
