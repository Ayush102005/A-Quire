# A-Quire — V1 Requirements

## v1 Requirements

### AI Mentor

- [ ] **AI-01**: Student receives a real AI-generated hint (via AWS Bedrock) when requesting help during a lesson struggle event
- [ ] **AI-02**: Hint levels (basic, intermediate, advanced, analogy, hinglish) are all backed by Bedrock with level-appropriate prompting
- [ ] **AI-03**: When a struggle event's score exceeds a configurable threshold, the system automatically suggests a hint to the student via WebSocket (not just on manual request)

### Infrastructure & Deployment

- [ ] **INFRA-01**: Frontend API base URL is configured via Vite environment variable (`import.meta.env.VITE_API_URL`) — no hardcoded localhost
- [ ] **INFRA-02**: Alembic initial migration generated from all current ORM models; `alembic upgrade head` runs cleanly against a fresh PostgreSQL database
- [ ] **INFRA-03**: Docker Compose production override (`docker-compose.prod.yml`) configures PostgreSQL, Redis, backend, Celery worker, and Celery beat for production use
- [ ] **INFRA-04**: CI/CD pipeline (GitHub Actions) runs backend tests, frontend lint/build, and triggers deploy on merge to main
- [ ] **INFRA-05**: Production CORS is configured for the live domain (not localhost)

### Content System

- [ ] **CONTENT-01**: Problems bank seeder imports all 27 DSA topic folders from `problems/` as courses with modules and lessons into the database
- [ ] **CONTENT-02**: Instructor can create a new course with title, description, and publish status via the frontend UI
- [ ] **CONTENT-03**: Instructor can add modules and lessons (with video URL) to a course via the frontend UI
- [ ] **CONTENT-04**: Lessons support rich text description/notes displayed alongside the video player

### Authentication & Security

- [ ] **AUTH-01**: User receives a verification email on signup and cannot log in until email is verified
- [ ] **AUTH-02**: User can request a password reset email and reset their password via a secure one-time link
- [ ] **AUTH-03**: Login endpoint has rate limiting to prevent brute-force attacks (e.g., max 10 attempts per minute per IP)

### Analytics

- [ ] **ANALYTICS-01**: Student progress page displays real data (course completion rates, time spent per lesson, streak) from the backend API
- [ ] **ANALYTICS-02**: Student struggle analytics page displays real struggle event data (score distribution, timestamps, hint usage)
- [ ] **ANALYTICS-03**: Instructor reports page shows a per-lesson struggle heatmap — which video timestamps trip up students most
- [ ] **ANALYTICS-04**: Admin dashboard displays platform-wide analytics (total users, active learners, engagement metrics)

### Testing

- [ ] **TEST-01**: Vitest unit tests cover key frontend components (auth forms, lesson player controls, progress display)
- [ ] **TEST-02**: Playwright E2E tests cover critical user flows: signup → onboarding → enroll → lesson → request hint
- [ ] **TEST-03**: Backend pytest runs with `pytest-cov` and reports coverage percentage; coverage ≥70% on service layer
- [ ] **TEST-04**: Frontend Vitest coverage report generated and tracked

### UI & UX

- [ ] **UI-01**: All 22 pages share a unified design system — consistent colors, typography, spacing, component styles, and interaction patterns
- [ ] **UI-02**: All pages are fully responsive and usable on mobile, tablet, and desktop viewports
- [ ] **UI-03**: Page transitions and interactive elements use smooth animations (no jarring jumps); loading states are shown during API calls

---

## v2 Requirements (Deferred)

- Notification emails (lesson reminders, course updates) — deferred, V1 covers auth emails only
- Stripe / billing integration — admin billing UI exists but payment processing is V2
- Social features (peer comments, forums) — V2
- Mobile app (iOS / Android) — V2
- AI-generated course content — AI is for hints only in V1
- Multi-language UI (i18n) — V2
- WebSocket horizontal scaling (Redis pub/sub for multi-instance) — V2

---

## Out of Scope

- Raw video/webcam storage — privacy rule; only derived struggle metrics stored
- Peer-to-peer video/live sessions — not in product vision
- Marketplace for third-party instructors — single-tenant for now
- LMS integrations (Google Classroom, Canvas) — V2+

---

## Traceability

> Filled by roadmapper — maps each REQ-ID to a roadmap phase.

| REQ-ID | Phase | Notes |
|--------|-------|-------|
| AI-01 | TBD | |
| AI-02 | TBD | |
| AI-03 | TBD | |
| INFRA-01 | TBD | |
| INFRA-02 | TBD | |
| INFRA-03 | TBD | |
| INFRA-04 | TBD | |
| INFRA-05 | TBD | |
| CONTENT-01 | TBD | |
| CONTENT-02 | TBD | |
| CONTENT-03 | TBD | |
| CONTENT-04 | TBD | |
| AUTH-01 | TBD | |
| AUTH-02 | TBD | |
| AUTH-03 | TBD | |
| ANALYTICS-01 | TBD | |
| ANALYTICS-02 | TBD | |
| ANALYTICS-03 | TBD | |
| ANALYTICS-04 | TBD | |
| TEST-01 | TBD | |
| TEST-02 | TBD | |
| TEST-03 | TBD | |
| TEST-04 | TBD | |
| UI-01 | TBD | |
| UI-02 | TBD | |
| UI-03 | TBD | |
