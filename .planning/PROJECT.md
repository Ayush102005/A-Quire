# A-Quire

## What This Is

A-Quire is an AI-powered adaptive learning platform for general education. Students watch lesson videos while the platform detects struggle signals (fixation, inactivity, low engagement) and delivers real-time AI mentor hints exactly when they're stuck — making learning genuinely personalized. Instructors create and manage courses, and admins oversee the platform.

## Core Value

**AI that adapts to struggle:** when a student gets stuck during a lesson, A-Quire detects it and provides a personalized AI mentor hint in real time — not after a test, not after the lesson, but in the moment.

## Requirements

### Validated

- ✓ JWT authentication (register, login, refresh, role-based access) — existing
- ✓ Student onboarding flow (role selection, goals, preferences) — existing
- ✓ Course / Module / Lesson data model — existing
- ✓ Student enrollment in courses — existing
- ✓ Lesson progress tracking (watched_seconds, completion_percent) — existing
- ✓ Struggle event ingestion (privacy-first: score + metadata only, no raw video) — existing
- ✓ WebSocket real-time notification channel — existing
- ✓ Notifications system (list, mark-read) — existing
- ✓ Quiz / self-check system (create, submit, score) — existing
- ✓ Student analytics endpoint — existing
- ✓ Instructor dashboard UI — existing
- ✓ Admin dashboard + user management UI — existing
- ✓ Multi-role access control (student / instructor / admin) — existing
- ✓ SQLite local dev database with seeded mock data — existing
- ✓ Docker + docker-compose infrastructure — existing

### Active

- [ ] AWS Bedrock AI mentor connected (replace template strings with real LLM calls)
- [ ] Instructor course creation UI (frontend forms for creating courses, modules, lessons)
- [ ] Problems bank (27 DSA topics) integrated into the lesson/course content system
- [ ] Hardcoded API URL replaced with Vite environment variable (deployment blocker)
- [ ] Email service (verification, password reset, reminders) — SendGrid or AWS SES
- [ ] PostgreSQL production setup + Alembic migrations (replace SQLite dev workaround)
- [ ] Frontend test suite — Vitest (unit) + Playwright (E2E)
- [ ] Analytics pages backed by real data (charts wired to actual progress/struggle metrics)
- [ ] Deployment pipeline (CI/CD, Docker production config, environment management)

### Out of Scope

- Raw video/webcam storage — privacy rule, derived metrics only (fixation_ms, inactivity_ms, struggle_score)
- Social/community features (forums, peer review) — future milestone
- Mobile app (iOS/Android) — future milestone
- Multi-tenant SaaS billing — admin billing UI exists but full Stripe integration deferred
- AI-generated course content — AI is for hints only, not content generation, in V1

## Context

**Codebase state:** Fully scaffolded backend (FastAPI, 13 API routers, 11 ORM models, 9 services) and complete frontend UI (22 pages, React/Vite/Tailwind). Core features exist but are partially disconnected from each other. The most critical gap is the AI mentor — `call_bedrock_for_hint()` in `mentor_service.py` is implemented but never called.

**Critical deployment blocker:** `Frontend/src/services/api.js` has `BASE_URL = "http://localhost:8000/api/v1"` hardcoded. Any deployment requires this to use a Vite env var.

**Content:** 27 DSA topic problem folders exist in `problems/` but are not linked to the Course/Lesson database system. A content import pipeline or seeder is needed.

**Testing:** Backend has 7 test files (pytest + httpx) covering major endpoints. Frontend has zero test infrastructure.

**Tech stack:**
- Frontend: React 19, Vite 8, TailwindCSS v4, react-router-dom v7
- Backend: Python 3.11, FastAPI, SQLAlchemy 2.0 async, Pydantic v2, JWT, Celery+Redis
- AI: AWS Bedrock (Claude 3 Sonnet) — configured, not activated
- DB: SQLite (dev) → PostgreSQL (prod target)
- Infra: Docker + docker-compose

## Constraints

- **Privacy:** Never store raw webcam or video data — only derived struggle metrics (struggle_score, fixation_duration_ms, inactivity_duration_ms, lesson_timestamp_ms, transcript_window_id)
- **AI provider:** AWS Bedrock (boto3 already configured, credentials in .env)
- **Database:** PostgreSQL for production (asyncpg driver, SQLAlchemy async)
- **Frontend bundler:** Vite (env vars must use `import.meta.env.VITE_*` prefix)
- **Language:** Python 3.11 backend, JavaScript (ESM/JSX) frontend — no TypeScript migration in V1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AWS Bedrock for AI mentor | Already configured in code + boto3 dep; no new vendor onboarding | — Pending |
| SQLite for local dev, PostgreSQL for prod | Fast iteration locally; Alembic migrations needed before prod | — Pending |
| Celery+Redis for async tasks | Already scaffolded; Bedrock calls should run in background tasks | — Pending |
| Privacy-first struggle detection | No raw video stored; only derived metrics | ✓ Good |
| JWT in localStorage | Simpler for SPA; XSS risk accepted for V1, HttpOnly cookies deferred | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-25 after initialization*
