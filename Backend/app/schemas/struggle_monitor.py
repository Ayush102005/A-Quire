"""app/schemas/struggle_monitor.py — Schemas for Struggle Monitoring."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StruggleEventCreate(BaseModel):
    student_id: int = Field(..., gt=0)
    course_id: int | None = None
    lesson_id: int | None = Field(default=None, gt=0)
    problem_id: str | None = Field(default=None, max_length=128)
    event_type: str = Field(..., min_length=3, max_length=64)
    severity: float = Field(..., ge=0.0, le=1.0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="new", min_length=3, max_length=32)
    notes: str | None = None
    context_type: str = Field(default="video")
    gaze_off_screen_ms: int = Field(default=0, ge=0)
    client_event_id: str | None = None
    struggle_score: float | None = None
    lesson_timestamp_ms: int = 0
    fixation_duration_ms: int = 0
    inactivity_duration_ms: int = 0


class StruggleEventResponse(BaseModel):
    id: int
    student_id: int
    course_id: int | None
    lesson_id: int | None
    problem_id: str | None
    event_type: str
    severity: float
    confidence_score: float
    status: str
    notes: str | None
    context_type: str
    # Was missing entirely — StruggleEvent.hint_text is a real column
    # (populated by generate_hint(), see mentor_service.py) but this
    # response never exposed it, so StudentDashboard.jsx's `e.hint_text`
    # read was always undefined and every intervention showed "No Hint
    # Yet" regardless of whether a hint had actually been generated.
    hint_text: str | None = None
    # Resolved server-side — the frontend previously built its own
    # "Lesson #{lesson_id}" fallback text, which rendered literally
    # "Lesson #null" for any problem_id-keyed (DSA bank-linked) event,
    # since lesson_id is always null there (see StruggleEvent's
    # exactly-one-target constraint). See list_struggle_events() for how
    # this gets filled in for both lesson- and problem-keyed events.
    title: str | None = None
    detected_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StruggleMonitorInput(BaseModel):
    student_id: int = Field(..., gt=0)
    course_id: int | None = Field(None, gt=0)
    lesson_id: int | None = Field(default=None, gt=0)
    problem_id: str | None = Field(default=None, max_length=128)
    question_id: int | None = Field(None, gt=0)
    rewatch_count: int = Field(default=0, ge=0)
    pause_count: int = Field(default=0, ge=0)
    quiz_score: int | None = Field(default=None, ge=0, le=100)
    idle_seconds: int = Field(default=0, ge=0)
    completion_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    failed_attempts: int = Field(default=0, ge=0)
    recent_activity_seconds: int = Field(default=0, ge=0)
    notes: str | None = Field(None, max_length=2000, strip_whitespace=True)
    manual_trigger: bool = Field(default=False)
    struggle_score: float | None = Field(default=None, ge=0.0, le=1.0)
    client_event_id: str | None = Field(None, max_length=100, strip_whitespace=True)
    lesson_timestamp_ms: int | None = Field(default=None, ge=0)
    fixation_duration_ms: int = Field(default=0, ge=0)
    inactivity_duration_ms: int = Field(default=0, ge=0)
    gaze_off_screen_ms: int = Field(default=0, ge=0)
    transcript_window_id: str | None = Field(None, max_length=100, strip_whitespace=True)
    event_type: str | None = Field(None, max_length=64, strip_whitespace=True)
    # Surface context: video | dsa | jee | neet
    context_type: str = Field(default="video", pattern="^(video|dsa|jee|neet|quiz)$")

    @model_validator(mode="after")
    def _exactly_one_target(self) -> "StruggleMonitorInput":
        if (self.lesson_id is None) == (self.problem_id is None):
            raise ValueError("Exactly one of lesson_id or problem_id must be set.")
        return self


class StruggleMonitorResult(BaseModel):
    detected: bool
    event_id: int | None = None
    event_type: str | None = None
    severity: float = 0.0
    confidence_score: float = 0.0
    status: str
    message: str


class ConversationTurn(BaseModel):
    role: str = Field(..., pattern="^(student|mentor)$")
    text: str


class HintRequest(BaseModel):
    hint_level: str = Field(default="basic", pattern="^(basic|detailed|example|custom)$")
    custom_message: str | None = None
    # Per-request override (e.g. the overlay's "Ask in Hinglish" button).
    # When unset, generate_hint() falls back to the student's saved
    # onboarding language preference (User.language).
    language: str | None = Field(default=None, pattern="^(en|hi|hinglish)$")
    # Prior turns in this hint conversation (oldest first), as the frontend
    # already renders them — without this, every hint request was answered
    # from scratch with zero memory of what the mentor itself just said, so
    # a short reply like "array" to the mentor's own question read as an
    # unrelated, unclear fragment instead of an answer to evaluate.
    conversation_history: list[ConversationTurn] | None = None


class HintResponse(BaseModel):
    event_id: int
    hint_text: str
    hint_level: str
    audio_base64: str | None = None

    model_config = ConfigDict(from_attributes=True)
