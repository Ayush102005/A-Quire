# CONCERNS.md — A-Quire Technical Debt & Concerns

## Critical Issues

### 1. AI Mentor Not Connected
- **Severity:** High (core feature)
- **File:** `Backend/app/services/mentor_service.py`
- **Issue:** `call_bedrock_for_hint()` is fully implemented and boto3-ready but is **never called** from `generate_mentor_hint()`. Hints are generated from static `_HINT_TEMPLATES` string lambdas.
- **Fix:** Replace template lookup with `call_bedrock_for_hint()` in `generate_mentor_hint()`; run it in thread pool executor (it's sync)
- **Blocker for:** Core product value proposition

### 2. Frontend API Base URL Hardcoded
- **Severity:** High (deployment blocker)
- **File:** `Frontend/src/services/api.js` line 1
- **Issue:** `const BASE_URL = "http://localhost:8000/api/v1"` — hardcoded localhost. Cannot deploy to any environment without code change.
- **Fix:** Use Vite environment variable: `const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"`
- **Impact:** Prevents any staging/production deployment

### 3. No Frontend Tests
- **Severity:** High (quality risk)
- **Issue:** Zero frontend test infrastructure. No unit, component, or E2E tests.
- **Fix:** Add Vitest + @testing-library/react for unit tests; Playwright for E2E
- **Impact:** Regressions will go undetected

## Significant Concerns

### 4. WebSocket Connection Manager is In-Memory Only
- **Severity:** Medium
- **File:** `Backend/app/websocket/manager.py`
- **Issue:** `WebSocketManager` stores connections in a Python dict `{user_id: [WebSocket]}`. This means WebSocket state is not shared across multiple backend instances — multi-instance deployment will break real-time notifications.
- **Fix:** Use Redis pub/sub for cross-instance WebSocket message routing

### 5. Celery Tasks Not Implemented
- **Severity:** Medium
- **File:** `Backend/app/tasks/celery_app.py`
- **Issue:** Celery app is configured but no actual tasks are defined/used. Long-running operations (AI hint generation, email sending) are done synchronously in request handlers.
- **Fix:** Move Bedrock calls and email sending to Celery tasks

### 6. No Email Service
- **Severity:** Medium
- **Issue:** No email service configured. Password reset flow, email verification, and notification emails are not functional (noted in DEPLOYMENT.md checklist as TODO).
- **Fix:** Integrate SendGrid or AWS SES; implement email verification flow

### 7. Missing Alembic Migrations
- **Severity:** Medium
- **Issue:** `Backend/alembic/versions/` directory exists but is likely empty or incomplete. Production PostgreSQL requires proper migrations; the SQLite dev workaround uses `create_all` which doesn't track schema history.
- **Fix:** Generate initial migration from current models with `alembic revision --autogenerate -m "initial"`

### 8. Frontend Has No State Management Library
- **Severity:** Medium
- **Issue:** All state is local `useState` or `localStorage`. As app complexity grows (shared cart, real-time data), this becomes unmanageable. `LessonPlayer.jsx` is already 45KB.
- **Fix:** Consider adding Zustand or TanStack Query for server state caching

### 9. LessonPlayer is Monolithic (45KB)
- **Severity:** Medium
- **File:** `Frontend/src/pages/LessonPlayer.jsx`
- **Issue:** At 45KB, this is by far the largest file. Contains video player, struggle detection, progress tracking, hints UI, and more in one component.
- **Fix:** Extract into sub-components: `VideoPlayer`, `StruggleDetector`, `HintPanel`, etc.

## Minor Concerns

### 10. SECRET_KEY Default Value
- **Severity:** Low-Medium (security)
- **File:** `Backend/app/core/config.py` line 22
- **Issue:** Default `SECRET_KEY = "change-me-in-production-use-a-long-random-secret-key"` — if `.env` is missing in production, this weak default is used.
- **Fix:** Validate `SECRET_KEY` is not the default value at startup when `DEBUG=False`

### 11. No Pagination on List Endpoints
- **Severity:** Low (scalability)
- **Issue:** `/courses/`, `/notifications/`, etc. return all records without pagination. Will degrade at scale.
- **Fix:** Add `limit` and `offset` (or cursor-based) pagination to list endpoints

### 12. Lessons Router Registered Twice
- **Severity:** Low (API clarity)
- **File:** `Backend/app/main.py` lines 84-85
- **Issue:** `lessons_router` is registered at both `/api/v1/content` and `/api/v1` (duplicate). Frontend uses `/content/lessons/{id}` correctly, but this creates ambiguous routing.
- **Fix:** Remove the duplicate registration

### 13. No Loading States or Error Boundaries in Frontend
- **Severity:** Low (UX)
- **Issue:** Pages make API calls but may not have consistent loading/error states. No React ErrorBoundary.
- **Fix:** Add loading spinners, error states, and a top-level ErrorBoundary

### 14. Problems Bank Not Integrated
- **Severity:** Low (feature gap)
- **Issue:** `problems/` directory contains 27 DSA topic folders but there's no code linking this content to the Course/Lesson system.
- **Fix:** Define a content import pipeline or seed mechanism to populate lessons from problem bank

## Security Notes

- JWT tokens stored in `localStorage` (XSS risk; consider HttpOnly cookies for production)
- CORS in dev mode allows `localhost:5173` and `localhost:3000` only — production CORS needs explicit production domains
- No rate limiting on authentication endpoints
- No input sanitization on text fields (relies on Pydantic validation only)
