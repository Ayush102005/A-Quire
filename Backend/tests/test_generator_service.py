import json
from unittest.mock import MagicMock

import pytest

from app.services.generator_service import generator_service


def _fake_client(payload: dict):
    """A MagicMock standing in for anthropic.AnthropicVertex, returning `payload` as JSON."""
    client = MagicMock()
    response = MagicMock()
    content_block = MagicMock()
    content_block.type = "text"
    content_block.text = json.dumps(payload)
    response.content = [content_block]
    client.messages.create.return_value = response
    return client


@pytest.mark.asyncio
class TestGenerateQuestion:
    async def test_returns_none_without_a_client(self, monkeypatch):
        monkeypatch.setattr(generator_service, "client", None)
        result = await generator_service.generate_question(topic_id=1, topic_name="Algebra", target_b=1.0)
        assert result is None

    async def test_generated_question_is_provisional(self, monkeypatch):
        monkeypatch.setattr(generator_service, "client", _fake_client({
            "content": "What is 2+2?",
            "options": {"A": "3", "B": "4", "C": "5", "D": "6"},
            "correct_option": "B",
            "difficulty_b": 1.23,
            "discrimination_a": 1.0,
            "guessing_c": 0.25,
        }))

        question = await generator_service.generate_question(topic_id=7, topic_name="Arithmetic", target_b=1.23)

        assert question is not None
        assert question.is_provisional is True
        assert question.topic_id == 7
        assert question.difficulty_b == pytest.approx(1.23)

    async def test_target_b_is_clamped_and_passed_through_to_the_prompt(self, monkeypatch):
        client = _fake_client({
            "content": "Q",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "correct_option": "A",
        })
        monkeypatch.setattr(generator_service, "client", client)

        # Out-of-range target_b must be clamped to the valid IRT scale before
        # being used anywhere (prompt text, default difficulty_b fallback).
        question = await generator_service.generate_question(topic_id=1, topic_name="Topic", target_b=9.0)

        assert question is not None
        assert question.difficulty_b == pytest.approx(4.0)  # clamped, and used as the fallback default

        prompt_used = client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "4.00" in prompt_used
        assert "9.0" not in prompt_used

    async def test_malformed_json_returns_none_without_raising(self, monkeypatch):
        client = MagicMock()
        response = MagicMock()
        content_block = MagicMock()
        content_block.type = "text"
        content_block.text = "not valid json"
        response.content = [content_block]
        client.messages.create.return_value = response
        monkeypatch.setattr(generator_service, "client", client)

        result = await generator_service.generate_question(topic_id=1, topic_name="Topic", target_b=0.0)
        assert result is None

    async def test_rejects_wrong_option_count(self, monkeypatch):
        monkeypatch.setattr(generator_service, "client", _fake_client({
            "content": "Q",
            "options": {"A": "1", "B": "2", "C": "3"},  # only 3
            "correct_option": "A",
        }))
        result = await generator_service.generate_question(topic_id=1, topic_name="Topic", target_b=0.0)
        assert result is None

    async def test_rejects_correct_option_not_among_options(self, monkeypatch):
        monkeypatch.setattr(generator_service, "client", _fake_client({
            "content": "Q",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "correct_option": "Z",
        }))
        result = await generator_service.generate_question(topic_id=1, topic_name="Topic", target_b=0.0)
        assert result is None


@pytest.mark.asyncio
class TestTranscriptGroundedGeneration:
    async def test_transcript_grounds_the_prompt(self, monkeypatch):
        client = _fake_client({
            "content": "According to the video, what is a binary search tree?",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "correct_option": "A",
        })
        monkeypatch.setattr(generator_service, "client", client)

        transcript = [
            {"id": 1, "start": 0.0, "end": 2.0, "text": "Today we'll cover binary search trees."},
            {"id": 2, "start": 2.0, "end": 5.0, "text": "Each node has at most two children."},
        ]
        question = await generator_service.generate_question(
            topic_id=1, topic_name="Trees", target_b=0.0, transcript=transcript,
        )

        assert question is not None
        prompt_used = client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "binary search trees" in prompt_used
        assert "at most two children" in prompt_used

    async def test_no_transcript_uses_topic_only_prompt(self, monkeypatch):
        client = _fake_client({
            "content": "Q",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "correct_option": "A",
        })
        monkeypatch.setattr(generator_service, "client", client)

        await generator_service.generate_question(topic_id=1, topic_name="Trees", target_b=0.0, transcript=None)

        prompt_used = client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "transcript" not in prompt_used.lower()

    async def test_empty_transcript_segments_fall_back_to_topic_only_prompt(self, monkeypatch):
        client = _fake_client({
            "content": "Q",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "correct_option": "A",
        })
        monkeypatch.setattr(generator_service, "client", client)

        # Segments with no usable text (e.g. all blank) — same as no transcript.
        await generator_service.generate_question(
            topic_id=1, topic_name="Trees", target_b=0.0, transcript=[{"id": 1, "text": ""}],
        )

        prompt_used = client.messages.create.call_args.kwargs["messages"][0]["content"]
        assert "transcript" not in prompt_used.lower()

    async def test_long_transcript_is_truncated(self, monkeypatch):
        from app.services.generator_service import MAX_TRANSCRIPT_CHARS

        client = _fake_client({
            "content": "Q",
            "options": {"A": "1", "B": "2", "C": "3", "D": "4"},
            "correct_option": "A",
        })
        monkeypatch.setattr(generator_service, "client", client)

        huge_text = "word " * 5000  # far beyond MAX_TRANSCRIPT_CHARS
        await generator_service.generate_question(
            topic_id=1, topic_name="Trees", target_b=0.0,
            transcript=[{"id": 1, "text": huge_text}],
        )

        prompt_used = client.messages.create.call_args.kwargs["messages"][0]["content"]
        # The transcript block in the prompt must be bounded, not the raw 25000-char string.
        assert len(prompt_used) < len(huge_text)
        assert "…" in prompt_used
