# A-Quire — V1 Roadmap (Milestone v1.0)

> **26 requirements across 7 phases** | Production-readiness milestone

---

## Phase 1: Foundation & Deployment Readiness

**Goal:** Fix the critical blockers that prevent any deployment — hardcoded URLs, missing migrations, and CORS — so the app can run outside localhost.

**Requirements:** INFRA-01, INFRA-02, INFRA-05

**Dependencies:** None — must be done first; everything depends on a deployable app.

**Plans:**
- [ ] Plan 1: Replace hardcoded `BASE_URL` with `import.meta.env.VITE_API_URL` in `Frontend/src/services/api.js`; add `.env.local` template for frontend
- [ ] Plan 2: Generate Alembic initial migration from all current ORM models; verify `alembic upgrade head` creates clean schema against a fresh PostgreSQL database
- [ ] Plan 3: Add production CORS configuration — env-driven `ALLOWED_ORIGINS` that accepts a real domain; update `Backend/app/core/config.py` and `.env.example`

**UI hint:** No

**Success criteria:**
1. Running `VITE_API_URL=https://api.example.com npm run build` produces a frontend that calls the correct API
2. `alembic upgrade head` on a fresh PostgreSQL creates all tables without errors
3. CORS correctly allows production domain and rejects unknown origins
4. `docker-compose up` with `.env` file starts all services cleanly

---

## Phase 2: AI Mentor Integration

**Goal:** Connect the AWS Bedrock AI mentor so students get real, intelligent, personalized hints — not template strings. This is the core product value.

**Requirements:** AI-01, AI-02, AI-03

**Dependencies:** Phase 1 (deployable backend required for testing)

**Plans:**
- [ ] Plan 1: Wire `call_bedrock_for_hint()` into `generate_mentor_hint()` in `mentor_service.py`; run in thread pool executor (sync→async bridge); handle errors with graceful fallback to templates
- [ ] Plan 2: Design level-appropriate Bedrock prompts for all 5 hint levels (basic, intermediate, advanced, analogy, hinglish) — include lesson context, struggle metadata, and language-specific instructions
- [ ] Plan 3: Add automatic hint threshold trigger — when struggle_score exceeds a configurable threshold (`STRUGGLE_HINT_THRESHOLD` env var), push an auto-hint suggestion via WebSocket without student requesting it
- [ ] Plan 4: Add Celery task wrapper for Bedrock calls — move AI inference off the request thread; push result via WebSocket when ready

**UI hint:** No

**Success criteria:**
1. `POST /struggles/events/{id}/hint` returns a real Bedrock-generated response (not a template string)
2. All 5 hint levels produce level-appropriate responses verified in test
3. A struggle event with score ≥ threshold automatically pushes a WebSocket hint suggestion within 10 seconds
4. Bedrock failure is caught; student sees a graceful fallback message instead of an error

---

## Phase 3: Auth Hardening & Email Service

**Goal:** Harden authentication with email verification and password reset — required for any real user base — and add rate limiting to protect against brute-force.

**Requirements:** AUTH-01, AUTH-02, AUTH-03

**Dependencies:** Phase 1 (env-driven config needed for email service credentials)

**Plans:**
- [ ] Plan 1: Integrate email service (SendGrid or AWS SES via boto3 — prefer SES since boto3 is already installed); add `send_email()` utility and email templates for verification and reset
- [ ] Plan 2: Implement email verification flow — add `is_verified` field to User model, send verification email on register, block login for unverified users, add `GET /auth/verify-email?token=...` endpoint
- [ ] Plan 3: Implement password reset flow — `POST /auth/forgot-password` sends reset link, `POST /auth/reset-password` validates one-time token and updates password hash; wire up existing `ForgotPassword.jsx` page
- [ ] Plan 4: Add rate limiting to `POST /auth/login` endpoint using `slowapi` (FastAPI-compatible); configure max 10 attempts per minute per IP with `429 Too Many Requests` response

**UI hint:** No

**Success criteria:**
1. New user registration triggers a verification email with a working confirm link
2. Unverified user cannot log in (receives 403 with clear message)
3. Password reset email delivers a working one-time link that expires after 1 hour
4. 11th login attempt within 60 seconds from same IP returns 429

---

## Phase 4: Content System & Problems Bank

**Goal:** Connect the 27 DSA topic problem folders to the course system and give instructors a frontend UI to create and manage course content.

**Requirements:** CONTENT-01, CONTENT-02, CONTENT-03, CONTENT-04

**Dependencies:** Phase 1 (deployable backend)

**Plans:**
- [ ] Plan 1: Build problems bank importer — scan all `problems/*/` directories, parse problem files, create Course/Module/Lesson records in the database; run as a management command or Celery task
- [ ] Plan 2: Build instructor course creation form — modal/page in `InstructorDashboard.jsx` with course title, description, publish toggle; calls `POST /api/v1/courses/`
- [ ] Plan 3: Build module & lesson management UI — add/edit/reorder modules and lessons within a course; video URL input per lesson; calls existing lesson/module API endpoints
- [ ] Plan 4: Add rich text description support for lessons — integrate a lightweight editor (e.g. `react-quill` or plain textarea with markdown preview) in lesson creation form; display rendered content in `LessonPlayer.jsx` alongside video

**UI hint:** Yes

**Success criteria:**
1. Running the problems bank importer creates 27 courses (one per DSA topic) with their lessons seeded in the database
2. Instructor can create a course, add 3 modules, add 2 lessons per module entirely via the UI — no API calls needed manually
3. Lesson video URL and rich text notes display correctly in the lesson player
4. Newly created courses appear in the student's course browsing list after publishing

---

## Phase 5: Analytics — Real Data Wiring

**Goal:** Replace placeholder/mock data in all analytics pages with real data from the backend APIs, and add the instructor heatmap view.

**Requirements:** ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04

**Dependencies:** Phase 1 (API URL fix), Phase 4 (content needed for meaningful analytics)

**Plans:**
- [ ] Plan 1: Wire `ProgressAnalytics.jsx` to real backend data — call `/progress/continue-learning`, `/progress/course/{id}`, and analytics endpoints; display actual completion rates, time spent, streaks with proper charts
- [ ] Plan 2: Wire `StruggleAnalytics.jsx` to real struggle event data — call `/struggles/events`; display score distribution histogram, timeline, and hint usage stats
- [ ] Plan 3: Add instructor struggle heatmap API endpoint — `GET /analytics/instructor/heatmap?lesson_id=` aggregates struggle events by `lesson_timestamp_ms` bucket; wire into `InstructorReports.jsx`
- [ ] Plan 4: Wire `AdminDashboard.jsx` to platform-wide metrics — add `GET /analytics/admin` endpoint returning total users, active learners (last 7 days), total lessons watched, total hints delivered

**UI hint:** Yes

**Success criteria:**
1. Student progress page shows real enrollment and completion data (not hardcoded numbers)
2. Struggle analytics chart reflects actual struggle events from the database
3. Instructor reports shows a heatmap with video timestamp buckets and struggle counts per lesson
4. Admin dashboard shows live user counts and engagement metrics from the database

---

## Phase 6: UI Consistency & Polish

**Goal:** Unify the design system across all 22 pages, make every page responsive, and add smooth transitions and loading states.

**Requirements:** UI-01, UI-02, UI-03

**Dependencies:** Phases 4–5 (all pages should be functionally complete before UI polish)

**Plans:**
- [ ] Plan 1: Audit all 22 pages and extract a shared design token set — colors, typography scale, spacing, border radii, shadows; document in `index.css` CSS variables; apply consistently everywhere
- [ ] Plan 2: Add responsive layouts to all pages — mobile-first breakpoints (Tailwind `sm:`, `md:`, `lg:`); fix navigation collapse on mobile; test at 375px, 768px, 1280px viewports
- [ ] Plan 3: Add loading skeletons and API loading states across all data-fetching components; add a global error boundary; standardize empty states
- [ ] Plan 4: Add smooth page transitions and micro-animations — React Router view transitions, hover effects, button press states, modal open/close animations; use CSS transitions not JS where possible

**UI hint:** Yes

**Success criteria:**
1. Visual audit confirms consistent color palette, font sizes, and spacing across all 22 pages
2. All pages are usable without horizontal scrolling at 375px mobile width
3. Every API call shows a loading indicator; errors show a user-friendly message
4. Page transitions animate smoothly; no layout shift or flash of unstyled content

---

## Phase 7: Testing & CI/CD

**Goal:** Add comprehensive test coverage (frontend unit + E2E, backend coverage reporting) and automate the CI/CD pipeline for safe continuous deployment.

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, INFRA-03, INFRA-04

**Dependencies:** All phases (CI/CD validates the complete system)

**Plans:**
- [ ] Plan 1: Set up Vitest for frontend — install `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`; write unit tests for `Login.jsx`, `SignUp.jsx`, lesson player controls, progress display; configure coverage reporting (TEST-01, TEST-04)
- [ ] Plan 2: Set up Playwright for E2E — install Playwright, configure test base URL via env; write tests for critical flows: signup → email verify → onboarding → course enroll → lesson watch → request AI hint (TEST-02)
- [ ] Plan 3: Add `pytest-cov` to backend test suite — configure minimum coverage threshold 70% on service layer; add `pytest.ini` coverage settings; ensure all 7 existing test files pass with coverage (TEST-03)
- [ ] Plan 4: Create `docker-compose.prod.yml` — production-ready override with resource limits, health checks, restart policies, environment variable references (no hardcoded values) (INFRA-03)
- [ ] Plan 5: Create GitHub Actions workflow — `ci.yml`: on push/PR to main: lint frontend, run backend pytest, run Vitest, build Docker image; on merge to main: deploy (INFRA-04)

**UI hint:** No

**Success criteria:**
1. `npm test` in Frontend runs Vitest and reports ≥60% coverage on tested components
2. Playwright E2E suite completes the full signup→hint flow against a running backend
3. Backend `pytest --cov` reports ≥70% coverage on `app/services/`
4. GitHub Actions CI passes on every PR (lint + test + build)
5. `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up` starts a production-ready stack

---

## Milestone Summary

| # | Phase | Requirements | Key Deliverable |
|---|-------|-------------|-----------------|
| 1 | Foundation & Deployment Readiness | INFRA-01, 02, 05 | App deployable outside localhost |
| 2 | AI Mentor Integration | AI-01, 02, 03 | Real Bedrock hints delivered to students |
| 3 | Auth Hardening & Email Service | AUTH-01, 02, 03 | Email verification, password reset, rate limiting |
| 4 | Content System & Problems Bank | CONTENT-01, 02, 03, 04 | 27 DSA courses seeded; instructors can create content |
| 5 | Analytics — Real Data Wiring | ANALYTICS-01, 02, 03, 04 | All analytics pages show live data |
| 6 | UI Consistency & Polish | UI-01, 02, 03 | Unified, responsive, animated UI across all 22 pages |
| 7 | Testing & CI/CD | TEST-01, 02, 03, 04, INFRA-03, 04 | Full test suite + automated pipeline |
