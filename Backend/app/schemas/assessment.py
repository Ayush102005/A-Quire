"""
app/schemas/assessment.py
─────────────────────────
Pydantic schemas for the Adaptive Engine (AMATTA).
"""
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


# ── Topics ───────────────────────────────────────────────────────────────
class TopicBase(BaseModel):
    name: str = Field(..., max_length=255, strip_whitespace=True)
    subject: str | None = Field(None, max_length=255, strip_whitespace=True)

class TopicResponse(TopicBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ── Questions ────────────────────────────────────────────────────────────
class QuestionResponse(BaseModel):
    id: int
    topic_id: int
    content: str
    options: dict[str, Any]
    is_provisional: bool = False
    # Full-credit value if answered correctly (exam-aware — see
    # AdaptiveEngine.compute_marks). Not a real Question column; the
    # endpoint sets it after model_validate() since it depends on the
    # session's exam_category, not just the question itself.
    marks: float = 0.0

    # We do NOT include the correct_option or IRT params in the response to the user.
    model_config = ConfigDict(from_attributes=True)


class QuestionNextResponse(BaseModel):
    """Wrapper returned by GET /assessments/{session_id}/next"""
    question: QuestionResponse | None = None
    is_complete: bool = False


# ── Quiz Session ─────────────────────────────────────────────────────────
class QuizSessionCreate(BaseModel):
    topic_id: int | None = Field(None, description="The ID of the topic to start a quiz for", ge=1)
    topic_name: str | None = Field(None, description="The name of the topic, will be created if it does not exist")
    module_id: int | None = Field(None, description="The ID of the module, used to resolve topic name", ge=1)
    course_id: int | None = Field(None, description="Course this quiz was launched from, if any — enables course-scoped instructor analytics", ge=1)
    lesson_id: int | None = Field(None, description="Lesson (video) this quiz was launched from, if any — grounds AI-generated questions in the lesson transcript", ge=1)

class QuizSessionResponse(BaseModel):
    id: int
    topic_id: int
    topic_name: str | None = None
    course_id: int | None = None
    lesson_id: int | None = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


# ── Quiz Submission ──────────────────────────────────────────────────────
class SubmitAnswerRequest(BaseModel):
    session_id: int = Field(..., ge=1)
    question_id: int = Field(..., ge=1)
    selected_option: str = Field(..., max_length=10, strip_whitespace=True)
    confidence: int | None = Field(None, description="Student self-reported confidence (1-4)", ge=1, le=4)
    # Time taken in milliseconds can be added if we want to factor in response time
    # response_time_ms: int | None = None

class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    correct_option: str
    new_theta: float
    response_id: int | None = None
    error_type: str | None = None
    message: str | None = None
    is_complete: bool = False
    question: QuestionResponse | None = None
    # Exam-aware marks earned for this specific answer — see
    # AdaptiveEngine.compute_marks. Can be negative under GATE-style
    # negative marking.
    marks_earned: float = 0.0
    
    # If the answer was wrong and triggers a diagnostic loop, the backend might return 
    # a flag or a follow-up question here in the future.
    diagnostic_triggered: bool = False

# ── Diagnostic Loop ──────────────────────────────────────────────────────
class DiagnosticRequest(BaseModel):
    student_explanation: str = Field(..., description="The student's explanation for their wrong answer", max_length=2000, strip_whitespace=True)

class DiagnosticResponse(BaseModel):
    error_type: str = Field(..., description="Classified error type (e.g., Concept, Procedural)", max_length=50)
    feedback_message: str = Field(..., description="Targeted AI feedback")
