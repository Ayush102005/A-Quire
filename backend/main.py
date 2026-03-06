import os
import time
import logging
import threading
from collections import defaultdict
from dotenv import load_dotenv
load_dotenv()  # Must be FIRST — loads .env before any boto3 clients initialise

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import io

# ── Structured logging ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("aquire")

from dependencies import get_current_user
from agent.graph import agent_executor
from services.polly import synthesize_speech, VOICE_MAP
from services.dynamodb import (
    log_gaze_event, ensure_tables, mark_topic_complete, get_student_progress,
    save_user_profile, get_user_profile,
    save_user_checklist, get_user_checklist,
    save_learning_tracks, get_learning_tracks,
)
from services.cloudwatch import emit_gaze_event, emit_session_start
from services.transcribe import transcribe_audio
from services.ses import send_welcome_email, send_milestone_email, send_progress_email

app = FastAPI(title="A-Quire — Kiro AI Backend")

# Ensure DynamoDB tables exist on startup
try:
    ensure_tables()
except Exception as e:
    logger.warning("DynamoDB table check skipped: %s", e)

# ── CORS ───────────────────────────────────────────────────────────────────────
_DEFAULT_ORIGINS = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Security response headers ──────────────────────────────────────────────────
class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=()"
        return response


app.add_middleware(_SecurityHeadersMiddleware)


# ── Rate limiting (per-token, per-minute) ──────────────────────────────────────
_rate_lock = threading.Lock()
_rate_counters: dict = defaultdict(list)
_RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_MINUTE", "30"))
_RATE_LIMITED_PATHS = {"/api/chat", "/api/transcribe"}


class _RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in _RATE_LIMITED_PATHS:
            identity = (
                request.headers.get("Authorization") or
                (request.client.host if request.client else "unknown")
            )[:80]
            now = time.time()
            with _rate_lock:
                _rate_counters[identity] = [
                    t for t in _rate_counters[identity] if now - t < 60
                ]
                if len(_rate_counters[identity]) >= _RATE_LIMIT:
                    return JSONResponse(
                        {"detail": "Rate limit exceeded. Try again later."},
                        status_code=429,
                    )
                _rate_counters[identity].append(now)
        return await call_next(request)


app.add_middleware(_RateLimitMiddleware)

# ─── Models ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    id: str
    text: str
    sender: str
    timestamp: str

class GazeEventRequest(BaseModel):
    course_id: str
    lesson_id: str
    gaze_state: str                      # "confused" | "distracted"
    chat_history: Optional[List[ChatMessage]] = []
    screenshot_b64: Optional[str] = Field(default=None, max_length=5_500_000)  # ~4 MB image limit
    code_snapshot: Optional[str] = Field(default=None, max_length=5000)       # trimmed server-side too

class GazeEventResponse(BaseModel):
    ai_response: str
    internal_thought: str

class SpeakRequest(BaseModel):
    text: str
    voice_id: str = "Kajal"
    language_code: str = "hi-IN"

class TranscribeRequest(BaseModel):
    audio_b64: str = Field(max_length=20_000_000)  # ~15 MB audio limit
    language_code: str = "en-IN"

class StudentProfile(BaseModel):
    learning_pace: str

class ThresholdResponse(BaseModel):
    base_threshold_ms: int

class TopicCompleteRequest(BaseModel):
    course_id: str
    topic_id: str

class StudentProfilePayload(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=320)
    learning_pace: Optional[str] = Field(default=None, pattern="^(slow|medium|fast|reflective)$")
    goal: Optional[str] = Field(default=None, max_length=500)
    experience_level: Optional[str] = Field(default=None, max_length=100)

class ChecklistPayload(BaseModel):
    checklist: List[str] = Field(default_factory=list, max_length=500)

class TracksPayload(BaseModel):
    tracks: List[dict] = Field(default_factory=list, max_length=100)

class MilestoneRequest(BaseModel):
    track_title: str

class SessionStartRequest(BaseModel):
    course_id: str

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "healthy"}


@app.post("/api/threshold", response_model=ThresholdResponse)
async def get_intervention_threshold(
    profile: StudentProfile,
    current_user: dict = Depends(get_current_user)
):
    base_threshold = 5000
    if profile.learning_pace == "reflective":
        return ThresholdResponse(base_threshold_ms=int(base_threshold * 1.5))
    elif profile.learning_pace == "fast":
        return ThresholdResponse(base_threshold_ms=int(base_threshold * 0.8))
    return ThresholdResponse(base_threshold_ms=base_threshold)


@app.post("/api/chat", response_model=GazeEventResponse)
async def handle_gaze_event(
    req: GazeEventRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Primary endpoint — triggered by gaze dwell events (confused/distracted).
    Pipeline: S3 context → Rekognition + Comprehend enrichment → Bedrock LLM
    Then: DynamoDB logging + CloudWatch metrics.
    """
    t_start = time.time()
    student_id = current_user.get("uid", "anonymous")

    try:
        initial_state = {
            "student_id":      student_id,
            "course_id":       req.course_id,
            "lesson_id":       req.lesson_id,
            "gaze_state":      req.gaze_state,
            "chat_history":    [msg.model_dump() for msg in req.chat_history],
            "screen_image_b64": req.screenshot_b64 or "",
            "code_snapshot":   (req.code_snapshot or "")[:2000],
            "loop_count":      0,
            # Enrichment defaults (filled by enrichment_node)
            "face_emotion":         "",
            "face_confusion_score": 0.0,
            "code_confusion_score": 0.0,
        }

        result = agent_executor.invoke(initial_state)
        ai_response = result.get("final_response", "Chalo, ek baar phir sochte hain!")
        latency_ms  = (time.time() - t_start) * 1000

        # ── Post-processing: DynamoDB + CloudWatch (non-blocking, best-effort) ──
        try:
            log_gaze_event(
                student_id=student_id,
                course_id=req.course_id,
                lesson_id=req.lesson_id,
                gaze_state=req.gaze_state,
                ai_response=ai_response,
                emotion=result.get("face_emotion", ""),
                confusion_score=result.get("face_confusion_score", 0.0),
            )
        except Exception as e:
            logger.warning("DynamoDB log error (non-fatal): %s", e)

        try:
            emit_gaze_event(
                gaze_state=req.gaze_state,
                latency_ms=latency_ms,
                confusion_score=result.get("face_confusion_score", 0.0),
            )
        except Exception as e:
            logger.warning("CloudWatch metric error (non-fatal): %s", e)

        return GazeEventResponse(
            ai_response=ai_response,
            internal_thought=result.get("planned_hint", ""),
        )

    except Exception as e:
        logger.exception("Unhandled error in /api/chat")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/speak")
async def text_to_speech(
    req: SpeakRequest,
    current_user: dict = Depends(get_current_user)
):
    """Amazon Polly (Kajal Neural) — Hinglish TTS."""
    try:
        audio_bytes = synthesize_speech(
            text=req.text,
            voice_id=req.voice_id,
            language_code=req.language_code,
        )
        if not audio_bytes:
            raise HTTPException(status_code=503, detail="Polly returned no audio")
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=kiro.mp3"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in /api/speak")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/transcribe")
async def voice_to_text(
    req: TranscribeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Amazon Transcribe — converts student's mic audio to text.
    Frontend sends base64 WebM blob; returns transcribed text.
    """
    try:
        text = transcribe_audio(req.audio_b64, req.language_code)
        return {"transcript": text}
    except Exception as e:
        logger.exception("Unhandled error in /api/transcribe")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/progress/complete")
async def complete_topic(
    req: TopicCompleteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Mark a topic as completed — stored in DynamoDB."""
    student_id = current_user.get("uid", "anonymous")
    mark_topic_complete(student_id, req.course_id, req.topic_id)
    return {"status": "ok"}


@app.get("/api/progress")
async def student_progress(current_user: dict = Depends(get_current_user)):
    """Fetch student's progress from DynamoDB."""
    student_id = current_user.get("uid", "anonymous")
    return get_student_progress(student_id)



@app.get("/api/user/profile")
async def fetch_profile(current_user: dict = Depends(get_current_user)):
    student_id = current_user.get("uid", "anonymous")
    data = get_user_profile(student_id)
    return {"profile": data}


@app.post("/api/user/profile")
async def upsert_profile(payload: StudentProfilePayload, current_user: dict = Depends(get_current_user)):
    student_id = current_user.get("uid", "anonymous")
    profile_data = payload.model_dump(exclude_none=True)
    # Check if first-time save → send welcome email
    existing = get_user_profile(student_id)
    is_new_user = not existing
    save_user_profile(student_id, profile_data)
    if is_new_user:
        email = profile_data.get("email") or current_user.get("email", "")
        name  = profile_data.get("name", "Student")
        if email:
            try:
                send_welcome_email(email, name)
            except Exception as e:
                logger.warning("SES welcome email failed (non-fatal): %s", e)
    return {"status": "ok"}


@app.get("/api/user/checklist")
async def fetch_checklist(current_user: dict = Depends(get_current_user)):
    student_id = current_user.get("uid", "anonymous")
    return {"checklist": get_user_checklist(student_id)}


@app.post("/api/user/checklist")
async def upsert_checklist(payload: ChecklistPayload, current_user: dict = Depends(get_current_user)):
    student_id = current_user.get("uid", "anonymous")
    save_user_checklist(student_id, payload.checklist)
    return {"status": "ok"}


@app.get("/api/user/tracks")
async def fetch_tracks(current_user: dict = Depends(get_current_user)):
    student_id = current_user.get("uid", "anonymous")
    return {"tracks": get_learning_tracks(student_id)}


@app.post("/api/user/tracks")
async def upsert_tracks(payload: TracksPayload, current_user: dict = Depends(get_current_user)):
    student_id = current_user.get("uid", "anonymous")
    save_learning_tracks(student_id, payload.tracks)
    return {"status": "ok"}


# ── SES: Milestone email when a track is 100% complete ────────────────────────

@app.post("/api/user/milestones/email")
async def send_track_milestone_email(
    req: MilestoneRequest,
    current_user: dict = Depends(get_current_user),
):
    """Called by frontend when a learning track reaches 100% completion."""
    profile = get_user_profile(current_user.get("uid", "anonymous"))
    email = profile.get("email") or current_user.get("email", "")
    name  = profile.get("name", "Student")
    if email:
        try:
            send_milestone_email(email, name, req.track_title)
        except Exception as e:
            logger.warning("SES milestone email failed (non-fatal): %s", e)
    return {"status": "ok"}


# ── CloudWatch: Session start when a student opens the learning page ──────────

@app.post("/api/session/start")
async def session_start(
    req: SessionStartRequest,
    current_user: dict = Depends(get_current_user),
):
    """Called by UnifiedLearning on mount — emits SessionStart metric to CloudWatch."""
    student_id = current_user.get("uid", "anonymous")
    try:
        emit_session_start(student_id, req.course_id)
    except Exception as e:
        logger.warning("CloudWatch emit_session_start failed (non-fatal): %s", e)
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
