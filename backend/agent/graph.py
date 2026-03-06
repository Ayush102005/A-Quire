import re
import time
import logging
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END

logger = logging.getLogger("aquire.agent")

from services.llm import invoke_llm, BASE_SYSTEM_PROMPT
from services.dynamodb import fetch_lesson_context
from services.rekognition import analyze_face_emotion
from services.comprehend import analyze_code_confusion


class AgentState(TypedDict):
    student_id: str
    course_id: str
    lesson_id: str
    gaze_state: str               # "focused" | "confused" | "distracted" | "chat_message"
    lesson_context: dict
    chat_history: List[dict]
    screen_image_b64: str         # Base64 JPEG screenshot
    code_snapshot: str            # Student's current code
    final_response: str
    loop_count: int               # Iteration counter (used by caller)
    # Enrichment signals (set by enrichment_node)
    face_emotion: str             # e.g. "CONFUSED", "CALM"
    face_confusion_score: float
    code_confusion_score: float


# ── Node 1: Fetch lesson context from S3 ──────────────────────────────────────
def retrieve_context_node(state: AgentState):
    context = fetch_lesson_context(state["course_id"], state["lesson_id"])
    return {"lesson_context": context}


# ── Node 2: Enrich with Rekognition + Comprehend signals ─────────────────────
def enrichment_node(state: AgentState):
    """
    Runs two AWS enrichment services in parallel context:
      1. Amazon Rekognition — face emotion from webcam screenshot
      2. Amazon Comprehend — code/comment confusion NLP
    Results are added to state for the mentor_response_node.
    """
    face_emotion       = ""
    face_conf_score    = 0.0
    code_conf_score    = 0.0

    # Rekognition: face emotion from screenshot
    screen_b64 = state.get("screen_image_b64", "")
    if screen_b64:
        face_data = analyze_face_emotion(screen_b64)
        face_emotion    = face_data.get("dominant_emotion", "")
        face_conf_score = face_data.get("confusion_score", 0.0)

    # Comprehend: confusion in code comments
    code = state.get("code_snapshot", "")
    if code:
        code_data = analyze_code_confusion(code)
        code_conf_score = code_data.get("confusion_score", 0.0)

    return {
        "face_emotion":         face_emotion,
        "face_confusion_score": face_conf_score,
        "code_confusion_score": code_conf_score,
    }


# ── Node 3: Single-pass Socratic mentor response ───────────────────────────────
def mentor_response_node(state: AgentState):
    """
    One LLM call — produces the final Kiro Hinglish response.
    Context includes: gaze state, face emotion (Rekognition), code
    confusion NLP (Comprehend), lesson data, chat history, and vision.
    """
    gaze_state       = state.get("gaze_state", "confused")
    lesson           = state.get("lesson_context", {})
    code             = state.get("code_snapshot", "").strip()
    screen_b64       = state.get("screen_image_b64", "").strip()
    history          = state.get("chat_history", [])[-6:]
    face_emotion     = state.get("face_emotion", "")
    face_conf_score  = state.get("face_confusion_score", 0.0)
    code_conf_score  = state.get("code_confusion_score", 0.0)

    # Build rich multi-signal context
    code_section = f"\nStudent's current code:\n```\n{code[:2000]}\n```" if code else ""
    screen_note  = "You will also receive a screenshot of the screen." if screen_b64 else ""

    face_section = ""
    if face_emotion:
        face_section = (
            f"\nFacial emotion (Amazon Rekognition): {face_emotion} "
            f"(confusion_score={face_conf_score:.2f})"
        )

    code_nlp_section = ""
    if code_conf_score > 0.2:
        code_nlp_section = (
            f"\nCode NLP confusion score (Amazon Comprehend): {code_conf_score:.2f} "
            f"— student's comments/code suggest confusion."
        )

    # Combined confusion signal for prompt guidance
    combined_conf = max(face_conf_score, code_conf_score)
    intensity = "bahut zyada confused" if combined_conf > 0.6 else "thoda confused"

    # Instruction line changes based on whether this is a direct chat vs gaze event
    if gaze_state == "chat_message":
        instruction = "The student has asked you a direct question (last message in chat history). Answer it helpfully in Hinglish, 2-4 sentences. Be specific and practical."
    elif gaze_state == "confused":
        instruction = "Student lagta hai stuck hai. Ek Socratic hint do — seedha answer mat do. Sirf 1-2 Hinglish sentences."
    else:  # distracted
        instruction = "Student screen se door tha. Friendly re-engage karo. Sirf 1-2 Hinglish sentences."

    lesson_description = lesson.get("description", "") or lesson.get("transcript_summary", "")
    lesson_desc_section = f"\nProblem description:\n{lesson_description}" if lesson_description else ""

    system_content = f"""{BASE_SYSTEM_PROMPT}

--- CONTEXT ---
Lesson: {state.get("lesson_id", "Unknown")}
Topic: {lesson.get("title", "Unknown")} (Difficulty: {lesson.get("difficulty", "Unknown")})
Key concepts: {lesson.get("key_concepts", "N/A")}{lesson_desc_section}
Student gaze state: {gaze_state}  ("confused"=staring/stuck, "distracted"=looked away, "chat_message"=direct question)
Confusion signal: Student lagta hai {intensity} hai (combined score: {combined_conf:.2f})
{face_section}{code_nlp_section}
{code_section}
{screen_note}
--- END CONTEXT ---

{instruction}"""

    # Build message history (system_content passed separately)
    converse_messages = []

    for msg in history:
        if msg.get("sender") in ("user", "student"):
            converse_messages.append({"role": "user", "content": msg["text"]})
        elif msg.get("sender") == "kiro":
            converse_messages.append({"role": "assistant", "content": msg["text"]})

    # Nova requires first message to be "user" — drop leading assistant messages
    while converse_messages and converse_messages[0]["role"] == "assistant":
        converse_messages.pop(0)

    # Final trigger
    trigger_text = (
        "[Answer the student's question above.]"
        if gaze_state == "chat_message"
        else f"[Student gaze state: '{gaze_state}'. Respond now.]"
    )
    converse_messages.append({"role": "user", "content": trigger_text})

    try:
        reply = invoke_llm(converse_messages, max_tokens=300, system=system_content)
        reply = re.sub(r"<[^>]+>", "", reply).strip()
    except Exception as e:
        logger.exception("LLM error in mentor_response_node")
        if gaze_state == "chat_message":
            reply = "Yaar, abhi kuch technical issue aa gaya. Thoda wait karke dobara try karo!"
        elif gaze_state == "confused":
            reply = "Yaar, ek baar socho — is problem ka sabse chhota part kya solve kar sakte ho?"
        else:
            reply = "Wapas aa gaye! Kahan atke the — refresher chahiye?"

    return {"final_response": reply}


# ── Graph ──────────────────────────────────────────────────────────────────────
def build_agent_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("retrieve_context", retrieve_context_node)
    workflow.add_node("enrich_signals",   enrichment_node)
    workflow.add_node("mentor_response",  mentor_response_node)

    workflow.set_entry_point("retrieve_context")
    workflow.add_edge("retrieve_context", "enrich_signals")
    workflow.add_edge("enrich_signals",   "mentor_response")
    workflow.add_edge("mentor_response",  END)

    return workflow.compile()


agent_executor = build_agent_graph()
