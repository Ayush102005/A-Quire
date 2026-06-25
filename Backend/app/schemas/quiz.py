from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuizQuestionBase(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"
    correct_answer: Optional[str] = None
    options: Optional[str] = None


class QuizQuestionResponse(QuizQuestionBase):
    id: int
    quiz_id: int
    order: int
    
    class Config:
        from_attributes = True


class QuizBase(BaseModel):
    title: str
    description: Optional[str] = None


class QuizCreate(QuizBase):
    lesson_id: Optional[int] = None


class QuizResponse(QuizBase):
    id: int
    lesson_id: Optional[int] = None
    questions: List[QuizQuestionResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


class QuizSubmitResponse(BaseModel):
    question_id: int
    answer: str


class QuizSubmit(BaseModel):
    quiz_id: int
    responses: List[QuizSubmitResponse]


class QuizResultResponse(BaseModel):
    quiz_id: int
    score: float
    total_questions: int
    correct_answers: int
