"""
app/api/v1/mentor.py
────────────────────
General AI Mentor interaction (not tied to a specific struggle event).
"""
from __future__ import annotations

import asyncio
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps.roles import get_student_user
from app.models.student import User
from app.api.deps import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.lesson import Lesson
import json
from app.services.mentor_service import _hint_executor, _invoke_claude

router = APIRouter(prefix="/mentor", tags=["Mentor"])

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|student|mentor)$")
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
async def mentor_chat(
    request: ChatRequest,
    current_user: User = Depends(get_student_user)
) -> ChatResponse:
    """
    Handle global chat messages from the student dashboard.
    """
    activity_label = "general computer science learning"
    context_block = "The student is on their main dashboard and asking a general question or asking for advice."
    
    # Normalize roles (frontend sends 'user' and 'assistant', backend _invoke_claude expects 'student' and 'mentor')
    normalized_history = []
    for msg in request.history:
        norm_role = "mentor" if msg.role == "assistant" else "student"
        normalized_history.append({"role": norm_role, "text": msg.text})

    loop = asyncio.get_event_loop()
    
    reply = await loop.run_in_executor(
        _hint_executor,
        _invoke_claude,
        activity_label,
        context_block,
        0.0,  # struggle_score
        0,    # fixation_duration_ms
        0,    # inactivity_duration_ms
        "custom",  # hint_level
        request.message,  # custom_message
        current_user.language or "en",
        normalized_history
    )
    
    return ChatResponse(reply=reply)


class AudioCheckinRequest(BaseModel):
    lesson_id: int
    current_timestamp_ms: int
    window_size_ms: int = 600000  # Default 10 minutes

class AudioCheckinResponse(BaseModel):
    question: str

@router.post("/audio-checkin/generate", response_model=AudioCheckinResponse)
async def generate_audio_checkin(
    request: AudioCheckinRequest,
    current_user: User = Depends(get_student_user),
    db: AsyncSession = Depends(get_db)
):
    lesson = await db.get(Lesson, request.lesson_id)
    if not lesson or not lesson.transcript:
        return AudioCheckinResponse(question="Are you still following along with the audio?")
        
    timestamp_float = request.current_timestamp_ms / 1000.0
    window_float = request.window_size_ms / 1000.0
    
    # Extract transcript for the last X minutes
    relevant_segments = []
    for seg in lesson.transcript:
        start = seg.get('start', 0.0)
        end = seg.get('end', start)
        if end >= (timestamp_float - window_float) and start <= timestamp_float:
            relevant_segments.append(seg)
            
    if not relevant_segments:
        return AudioCheckinResponse(question="Are you still following along with the audio?")
        
    transcript_text = "\n".join(
        f"[{int(seg.get('start', 0)) // 60}m {int(seg.get('start', 0)) % 60}s] {seg.get('text', '')}" 
        for seg in relevant_segments
    )
    
    activity_label = "listening to an audio lesson"
    context_block = f"Transcript of the last {int(window_float//60)} minutes:\n{transcript_text}"
    
    prompt = (
        "Generate exactly ONE very short, highly specific question based ONLY on the transcript provided. "
        "The question should be easy to answer in 1-2 words if the student was actually listening. "
        "Do NOT provide the answer. Just ask the question."
    )
    
    loop = asyncio.get_event_loop()
    question = await loop.run_in_executor(
        _hint_executor,
        _invoke_claude,
        activity_label,
        context_block,
        0.0, 0, 0,
        "custom",
        prompt,
        current_user.language or "en",
        []
    )
    
    return AudioCheckinResponse(question=question.strip())

class AudioCheckinVerifyRequest(BaseModel):
    question: str
    answer: str

class AudioCheckinVerifyResponse(BaseModel):
    is_correct: bool
    feedback: str

@router.post("/audio-checkin/verify", response_model=AudioCheckinVerifyResponse)
async def verify_audio_checkin(
    request: AudioCheckinVerifyRequest,
    current_user: User = Depends(get_student_user)
):
    activity_label = "evaluating an audio checkin answer"
    context_block = f"Question asked: {request.question}\nStudent's Answer: {request.answer}"
    
    prompt = (
        "Determine if the student's answer is correct for the question. "
        "Return your response in strict JSON format: {'is_correct': true/false, 'feedback': 'short explanation'} "
        "Do not include any markdown formatting, just the raw JSON."
    )
    
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _hint_executor,
        _invoke_claude,
        activity_label,
        context_block,
        0.0, 0, 0,
        "custom",
        prompt,
        current_user.language or "en",
        []
    )
    
    try:
        # Claude might wrap it in markdown or return plain text JSON
        clean_result = result.replace('```json', '').replace('```', '').strip()
        data = json.loads(clean_result)
        return AudioCheckinVerifyResponse(
            is_correct=data.get("is_correct", False),
            feedback=data.get("feedback", "Could not verify answer.")
        )
    except Exception as e:
        return AudioCheckinVerifyResponse(is_correct=False, feedback=str(e))
