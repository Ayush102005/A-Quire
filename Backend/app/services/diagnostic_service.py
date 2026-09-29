"""
app/services/diagnostic_service.py
──────────────────────────────────
Claude-powered Diagnostic Engine.
Classifies student misconceptions and generates targeted feedback.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

class DiagnosticService:
    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        if not settings.ANTHROPIC_API_KEY:
            logger.info("DiagnosticService: ANTHROPIC_API_KEY not set.")
            return
        try:
            import anthropic
            headers = {}
            if settings.ANTHROPIC_WORKSPACE_ID:
                headers["anthropic-workspace-id"] = settings.ANTHROPIC_WORKSPACE_ID
            self.client = anthropic.Anthropic(
                api_key=settings.ANTHROPIC_API_KEY,
                default_headers=headers if headers else None
            )
        except ImportError:
            logger.warning("anthropic package not installed, diagnostic engine will use fallback")
        except Exception as e:
            logger.error(f"Failed to init Anthropic client: {e}")

    def _build_prompt(self, question: str, options: dict[str, Any], correct_option: str, selected_option: str, student_explanation: str) -> str:
        prompt = f"""You are an expert AI tutor named A-Quire.
A student has answered a question incorrectly and provided their reasoning.
Your task is to:
1. Classify the type of error into exactly one of these categories: ["concept_error", "procedure_error", "calculation_slip", "guess_low_confidence"].
2. Write a short (1-2 sentence), specific, encouraging explanation that directly addresses the
   student's stated reasoning and corrects their exact misunderstanding — reference the actual
   concept, terms, or numbers involved. Do not give a generic statement; write as if you read
   their explanation and are responding to it directly. Do NOT simply restate the correct answer.

Here is the context:
Question: {question}
Options: {json.dumps(options)}
Correct Answer was: {correct_option}
Student selected: {selected_option}
Student's reasoning: "{student_explanation}"

Respond ONLY with a JSON object in this exact format, with no markdown formatting or other text:
{{
    "error_type": "Category Name",
    "feedback_message": "Your personalized explanation here."
}}
"""
        return prompt

    def _get_feedback_template(self, error_type: str) -> str:
        templates = {
            "concept_error": "It looks like the underlying concept is unclear. Let's revisit the definition and a simpler example.",
            "procedure_error": "The concept is right, but the steps are off. Let's walk through the procedure step by step.",
            "calculation_slip": "Your setup is correct, but there's a calculation mistake. Re-check your arithmetic and units.",
            "guess_low_confidence": "This looks like a guess. Let's rebuild your understanding with an easier follow-up question."
        }
        return templates.get(error_type, "Let's review this topic carefully and try again.")

    async def classify_and_generate_feedback(
        self, question: str, options: dict[str, Any], correct_option: str, selected_option: str, student_explanation: str
    ) -> tuple[str, str]:
        """
        Calls the Anthropic API (Claude) to classify the error and generate feedback.
        Returns a tuple: (error_type, feedback_message)
        """
        prompt = self._build_prompt(question, options, correct_option, selected_option, student_explanation)

        if not self.client:
            # Fallback if Anthropic API is not configured
            error_type = "procedure_error"
            return error_type, self._get_feedback_template(error_type)

        try:
            response = await asyncio.to_thread(
                self.client.messages.create,
                model=settings.ANTHROPIC_MODEL_ID,
                max_tokens=256,
                output_config={"effort": "low"},
                messages=[{"role": "user", "content": prompt}],
            )

            # Sonnet 5 has thinking on by default, so content[0] may be a
            # ThinkingBlock rather than the text block — find it by type.
            content = next(
                block.text for block in response.content if block.type == "text"
            )

            # Parse the JSON from the LLM
            result = json.loads(content)
            error_type = result.get("error_type", "procedure_error")

            # Normalize error type
            if error_type not in ["concept_error", "procedure_error", "calculation_slip", "guess_low_confidence"]:
                error_type = "procedure_error"

            feedback_message = (result.get("feedback_message") or "").strip()
            if not feedback_message:
                feedback_message = self._get_feedback_template(error_type)

            return error_type, feedback_message

        except Exception as e:
            logger.error(f"Anthropic invocation failed: {e}")
            return "Unknown Error", "Oops, our AI mentor is taking a break. Let's review the concepts and try again!"

diagnostic_service = DiagnosticService()
