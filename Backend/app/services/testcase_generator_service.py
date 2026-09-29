"""
app/services/testcase_generator_service.py
──────────────────────────────────────────
AI-powered test case generator service.

Given a problem definition (title, description, constraints, examples),
this service asks Claude to write a complete Python generator function.

The generated code is:
  1. Saved to problems/testcases/generators/{slug}.py
  2. Immediately executed to produce N random test cases
  3. Test cases are merged into problems/testcases/{slug}.json

Instructors can also manually supply their own generator code via the
POST /problems/{id}/testcase-generator endpoint.
"""
from __future__ import annotations

import asyncio
import importlib.util
import json
import logging
import os
import sys
import textwrap
import types
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Root of the A-Quire monorepo relative to this file:
# Backend/app/services/ -> Backend/app/ -> Backend/ -> A-Quire/
_REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
_TESTCASES_DIR = os.path.join(_REPO_ROOT, "problems", "testcases")
_GENERATORS_DIR = os.path.join(_TESTCASES_DIR, "generators")

# ── AI Prompt ─────────────────────────────────────────────────────────────────

_GENERATOR_SYSTEM_PROMPT = textwrap.dedent("""\
    You are an expert competitive-programming problem setter.
    You write Python test case generators that produce random but valid
    inputs and correct expected outputs for DSA problems.
    You must write clean, minimal Python 3 code. Return ONLY a raw JSON
    object — no markdown fences, no explanation, just JSON.
""")

_GENERATOR_USER_TEMPLATE = """\
Problem: {title}

Description:
{description}

Constraints:
{constraints}

Examples:
{examples}

Write a Python function with the exact signature:

    def generate_test_case(mode: str = "normal") -> list:
        ...

Rules:
1. Use the `random` module. Do NOT import anything else.
2. The function must generate ONE random test case that satisfies all constraints.
3. It must return a list of exactly 2 elements: [input_value, expected_output].
   - `input_value` may itself be a list or dict (e.g., for two-sum: [[nums, target], [i, j]])
   - Both elements must be JSON-serializable (only int, float, str, list, dict — NO tuples).
4. The function must contain a reference solver that computes the expected output
   from the generated input — it must NOT hardcode expected values.
7. Honor ALL stated constraints (array sizes, value ranges, etc.).
   If `mode == "stress"`, you MUST generate near-max-constraint cases (e.g. n=10^4, values=±10^9) 100% of the time to test performance.
6. Handle edge cases explicitly: empty arrays, single elements, negative values, etc.

Return ONLY a valid JSON object with this exact structure:
{{
  "function_code": "def generate_test_case(mode: str = \\"normal\\") -> list:\\n    import random\\n    ...",
  "description": "One sentence describing what this generator produces."
}}
"""


class TestCaseGeneratorService:
    """
    Uses Claude to write a Python generator function for any DSA problem,
    saves it to disk, and executes it to produce test cases.
    """

    def __init__(self) -> None:
        self._client = None
        if settings.ANTHROPIC_API_KEY:
            try:
                import anthropic
                headers: dict[str, str] = {}
                if settings.ANTHROPIC_WORKSPACE_ID:
                    headers["anthropic-workspace-id"] = settings.ANTHROPIC_WORKSPACE_ID
                self._client = anthropic.Anthropic(
                    api_key=settings.ANTHROPIC_API_KEY,
                    default_headers=headers or None,
                )
                logger.info("TestCaseGeneratorService: Anthropic client ready (model=%s)", settings.ANTHROPIC_MODEL_ID)
            except ImportError:
                logger.warning("TestCaseGeneratorService: anthropic package not installed.")
            except Exception as exc:
                logger.error("TestCaseGeneratorService: failed to init client: %s", exc)
        else:
            logger.info("TestCaseGeneratorService: ANTHROPIC_API_KEY not set — AI generation disabled.")

    # ── Public API ────────────────────────────────────────────────────────────

    async def ai_generate_generator(
        self,
        problem_id: str,
        problem: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Ask Claude to write a generator function for `problem_id`.
        Saves the code to generators/{problem_id}.py.
        Returns {"ok": True, "code": "...", "description": "..."} or
                {"ok": False, "error": "..."}.
        """
        if not self._client:
            return {"ok": False, "error": "AI generation is disabled (ANTHROPIC_API_KEY not set)."}

        prompt = _GENERATOR_USER_TEMPLATE.format(
            title=problem.get("title", problem_id),
            description=problem.get("description", ""),
            constraints="\n".join(f"- {c}" for c in problem.get("constraints", [])) or "No explicit constraints listed.",
            examples="\n".join(
                f"Input: {ex.get('input', '')}  Output: {ex.get('output', '')}"
                for ex in problem.get("examples", [])
            ) or "No examples available.",
        )

        raw_text = ""
        try:
            response = await asyncio.to_thread(
                self._client.messages.create,
                model=settings.ANTHROPIC_MODEL_ID,
                max_tokens=2048,
                system=_GENERATOR_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = next(
                block.text for block in response.content if block.type == "text"
            ).strip()

            # Strip accidental markdown fences
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

            data = json.loads(raw_text)
            code = data.get("function_code", "").strip()
            description = data.get("description", "AI-generated generator.")

            if not code or "def generate_test_case" not in code:
                return {"ok": False, "error": "AI returned code without a generate_test_case function."}

            self._save_generator_code(problem_id, code)
            return {"ok": True, "code": code, "description": description}

        except json.JSONDecodeError as exc:
            logger.error("TestCaseGeneratorService: JSON parse error: %s\nRaw: %s", exc, raw_text)
            return {"ok": False, "error": f"AI response was not valid JSON: {exc}"}
        except Exception as exc:
            logger.error("TestCaseGeneratorService: unexpected error: %s", exc)
            return {"ok": False, "error": str(exc)}

    def save_manual_generator(self, problem_id: str, code: str) -> dict[str, Any]:
        """
        Save instructor-provided generator code for a problem.
        Validates the code has a generate_test_case function before saving.
        Returns {"ok": True} or {"ok": False, "error": "..."}.
        """
        if "def generate_test_case" not in code:
            return {"ok": False, "error": "Code must define a function named `generate_test_case`."}

        # Syntax check
        try:
            compile(code, "<string>", "exec")
        except SyntaxError as exc:
            return {"ok": False, "error": f"Syntax error in generator code: {exc}"}

        self._save_generator_code(problem_id, code)
        return {"ok": True}

    async def run_generator(
        self,
        problem_id: str,
        count: int = 50,
        mode: str = "normal",
    ) -> dict[str, Any]:
        """
        Load the saved generator for `problem_id`, run it `count` times,
        and merge the results into problems/testcases/{problem_id}.json.

        Returns {"ok": True, "generated": N, "total": M} or {"ok": False, "error": "..."}.
        """
        generator_path = os.path.join(_GENERATORS_DIR, f"{problem_id}.py")
        if not os.path.exists(generator_path):
            return {"ok": False, "error": f"No generator found for '{problem_id}'. Generate one first via AI or manual upload."}

        try:
            fn = self._load_generator_fn(generator_path)
        except Exception as exc:
            return {"ok": False, "error": f"Failed to load generator: {exc}"}

        generated: list = []
        errors: list[str] = []
        for i in range(count):
            try:
                import inspect
                sig = inspect.signature(fn)
                if 'mode' in sig.parameters:
                    case = fn(mode=mode)
                else:
                    case = fn()
                # Validate structure
                if not isinstance(case, list) or len(case) != 2:
                    errors.append(f"case {i}: expected [input, expected], got {type(case).__name__}")
                    continue
                # Validate JSON-serializability (catches tuples, numpy types, etc.)
                json.dumps(case)
                generated.append(case)
            except Exception as exc:
                errors.append(f"case {i}: {exc}")
                if len(errors) >= 5:
                    break  # bail after 5 consecutive errors

        if errors:
            logger.warning("TestCaseGeneratorService: %d errors during generation for '%s': %s", len(errors), problem_id, errors[:3])

        if not generated:
            return {"ok": False, "error": f"Generator produced no valid test cases. Errors: {errors[:3]}"}

        # Merge with existing JSON
        json_path = self._json_path(problem_id)
        data: dict[str, Any] = {"hand_crafted": [], "generated": []}
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                pass  # corrupt file — start fresh

        data["generated"] = generated
        os.makedirs(_TESTCASES_DIR, exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return {
            "ok": True,
            "generated": len(generated),
            "errors": len(errors),
            "total": len(data["hand_crafted"]) + len(data["generated"]),
        }

    def get_generator_code(self, problem_id: str) -> str | None:
        """Return the saved generator source code, or None if not found."""
        path = os.path.join(_GENERATORS_DIR, f"{problem_id}.py")
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    # ── Internals ─────────────────────────────────────────────────────────────

    def _save_generator_code(self, problem_id: str, code: str) -> None:
        os.makedirs(_GENERATORS_DIR, exist_ok=True)
        path = os.path.join(_GENERATORS_DIR, f"{problem_id}.py")
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)
        logger.info("TestCaseGeneratorService: saved generator to %s", path)

    @staticmethod
    def _load_generator_fn(path: str):
        """Dynamically import a generator .py file and return its generate_test_case function."""
        spec = importlib.util.spec_from_file_location("_tc_gen", path)
        module = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(module)  # type: ignore[union-attr]
        fn = getattr(module, "generate_test_case", None)
        if fn is None or not callable(fn):
            raise ValueError("Generator file has no callable `generate_test_case`.")
        return fn

    @staticmethod
    def _json_path(problem_id: str) -> str:
        return os.path.join(_TESTCASES_DIR, f"{problem_id}.json")


# Module-level singleton
testcase_generator_service = TestCaseGeneratorService()
