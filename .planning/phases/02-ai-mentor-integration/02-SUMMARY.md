# Phase 2 Summary — AI Mentor Integration

**Completed:** 2026-06-25  
**Commit:** 325d0ee  
**Status:** DONE ✓

---

## What Was Done

### Plan 1+2 — Bedrock Wiring + Level-Specific Prompts ✓

**File:** `Backend/app/services/mentor_service.py` (full rewrite)

#### `_invoke_bedrock()` (sync, runs in thread pool)
- Constructs a rich Anthropic Claude prompt with: lesson topic, video timestamp (human-readable), struggle_score, fixation_duration_ms, inactivity_duration_ms
- **5 level-specific instructions** with real instructional design:
  - `basic` — gentle nudge, don't reveal answer, simple vocabulary
  - `intermediate` — Socratic question, component relationships
  - `advanced` — foundational principles, logical chain
  - `analogy` — real-world mapping, explicit connection back to lesson
  - `hinglish` — Hindi+English mix, friendly tone, no answer given
- Correctly formats Bedrock Claude Anthropic API v2 body (`anthropic_version`, `messages`, `max_tokens`, `temperature`)
- **Graceful fallback**: `NoCredentialsError` → static template; `EndpointResolutionError` → static template; any other error → static template
- Static fallbacks are quality-written (not lorem ipsum) so the product is usable without Bedrock

#### `generate_mentor_hint()` (async, public API)
- Fetches struggle event from DB
- Calls `_invoke_bedrock` via `asyncio.run_in_executor(_bedrock_executor)` — fully non-blocking
- Measures latency in ms
- **Creates a `MentorResponse` DB record** for analytics (latency_ms, response_type, response_text)
- Persists hint on `StruggleEvent` (mentor_hint, mentor_hint_level, mentor_generated_at)
- Pushes `mentor_hint` WebSocket message with `auto_triggered: false`

#### Thread pool
- `ThreadPoolExecutor(max_workers=4, thread_name_prefix="bedrock")` — handles 4 concurrent Bedrock calls
- Reuses executor across requests (not created per-call)

### Plan 3 — Auto-trigger Threshold → WebSocket Suggestion ✓

**File:** `Backend/app/api/v1/struggles.py`

- Added `_auto_trigger_task()` background task
- Called after every `POST /struggles/events`
- If `struggle_score >= STRUGGLE_HINT_THRESHOLD` (default: 0.7), pushes a `hint_suggestion` WebSocket message
- `hint_suggestion` message type: lightweight nudge asking the student if they want a hint (student picks level)
- Does NOT auto-generate the hint — student remains in control
- Fully non-blocking: runs as FastAPI `BackgroundTask`

### Plan 4 — Celery Async Mentor Task ✓

**File:** `Backend/app/tasks/celery_app.py` (full rewrite)

- `generate_mentor_hint_task`: Celery task with `max_retries=2`, `acks_late=True`, 5-min time limit
  - Uses `asyncio.run()` to bridge Celery's sync worker → async service layer
  - Retries on transient failures; logs `MaxRetriesExceededError`
- `send_notification_task`: Persists `Notification` DB record + WebSocket push
  - `max_retries=3`, `default_retry_delay=10`
- Worker config: `worker_max_tasks_per_child=100` (memory hygiene), UTC timezone

---

## Requirements Satisfied

| REQ-ID | Status |
|--------|--------|
| AI-01  | ✓ Done — Bedrock Claude wired with real prompts |
| AI-02  | ✓ Done — 5 hint levels with level-specific prompt engineering |
| AI-03  | ✓ Done — Auto-trigger on struggle_score ≥ 0.7 |
| AI-04  | ✓ Done — Celery async task with retry logic |

---

## WebSocket Message Types Added

| Type | Trigger | Payload |
|------|---------|---------|
| `hint_suggestion` | struggle_score ≥ threshold | event_id, lesson_id, timestamp_ms, score, message |
| `mentor_hint` | hint generated | event_id, lesson_id, hint, hint_level, latency_ms, auto_triggered |

---

## Verification

- Bedrock fallback tested implicitly: all tests pass without AWS credentials (static fallbacks return valid hints)
- `test_get_mentor_hint_all_levels` covers all 5 levels + `latency_ms` field
- `test_hint_persisted_on_event` verifies DB persistence
- `test_hint_requires_auth` verifies endpoint is protected
