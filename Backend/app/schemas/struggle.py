from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StruggleEventBase(BaseModel):
    client_event_id: str
    lesson_timestamp_ms: int
    struggle_score: float
    fixation_duration_ms: int = 0
    inactivity_duration_ms: int = 0
    transcript_window_id: Optional[str] = None


class StruggleEventCreate(StruggleEventBase):
    lesson_id: int


class StruggleEventResponse(StruggleEventBase):
    id: int
    user_id: int
    lesson_id: int
    mentor_hint: Optional[str] = None
    mentor_hint_level: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class MentorHintRequest(BaseModel):
    hint_level: str = "basic"  # basic, intermediate, advanced, hinglish, analogy


class MentorHintResponse(BaseModel):
    hint: str
    hint_level: str
    latency_ms: int
