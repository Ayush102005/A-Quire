# A-Quire — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-25 after initialization)

**Core value:** AI that adapts to struggle — when a student gets stuck during a lesson, A-Quire detects it and provides a personalized AI mentor hint in real time.
**Current focus:** Phase 1 — Foundation & Deployment Readiness

---

## Current Phase

**Phase 1: Foundation & Deployment Readiness**
- Status: Not started
- Started: —
- Plans: 0 completed / 3 total

---

## Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| AWS Bedrock for AI mentor | Already configured in codebase (boto3, env vars); avoids new vendor onboarding | Initialization |
| Sequential phase execution — Phase 1 first | INFRA-01/02/05 are deployment blockers; everything else depends on a working deployable app | Initialization |
| SendGrid OR AWS SES for email | boto3 already installed; SES preferred to stay within AWS ecosystem | Initialization |
| Celery tasks for Bedrock calls | Keeps AI inference off request thread; WebSocket push on completion | Initialization |
| Standard granularity (5-8 phases) | Balanced scope — enough structure without over-slicing | Initialization |

---

## Blockers

(None yet)

---

## Notes

- Codebase is brownfield: full-stack scaffold exists, 22 frontend pages, 13 API routers, 11 ORM models
- Most critical gap: `mentor_service.py::call_bedrock_for_hint()` is implemented but never called
- Second critical gap: `BASE_URL` hardcoded to `localhost:8000` in `Frontend/src/services/api.js`
- `local.db` (SQLite, 2.7MB) exists with seeded mock data for local dev
- 27 DSA problem folders in `problems/` not yet linked to Course/Lesson system

---

## Milestone

**v1.0 — Production Readiness**
Phases: 7 | Requirements: 26 | Started: 2026-06-25
