# INTEGRATIONS.md — A-Quire External Integrations

## APIs & External Services

### AWS Bedrock (AI Mentor)
- **Status:** Placeholder / not yet connected
- **Purpose:** Generate AI mentor hints for struggling students
- **Config:** `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_MODEL_ID` in `.env`
- **Model:** `anthropic.claude-3-sonnet-20240229-v1:0`
- **Integration point:** `Backend/app/services/mentor_service.py` — `call_bedrock_for_hint()` function exists but is NOT called from `generate_mentor_hint()`. Currently uses static template strings.
- **To activate:** Replace template lookup with `call_bedrock_for_hint()` in `generate_mentor_hint()`

### WebSocket (Real-time Notifications)
- **Status:** Fully implemented
- **Endpoint:** `ws://localhost:8000/ws/notifications?token=<access_token>`
- **Manager:** `Backend/app/websocket/manager.py` — per-user connection registry
- **Frontend client:** `Frontend/src/services/api.js` — `connectNotifications()`
- **Events:** `connected`, `notification`, `mentor_hint`

## Database

### PostgreSQL (Production)
- **Driver:** `asyncpg` (async)
- **ORM:** SQLAlchemy 2.0 async
- **Migrations:** Alembic (`Backend/alembic/`)
- **Connection string:** `postgresql+asyncpg://aquire:aquire@localhost:5432/aquire_db`

### SQLite (Local Dev)
- **Driver:** `aiosqlite`
- **Auto-created:** On startup when `DATABASE_URL` starts with `sqlite`
- **Seeded:** Mock data via `Backend/app/utils/seeder.py`

## Async Task Queue

### Celery + Redis
- **Status:** Scaffolded (task structure present, not heavily used yet)
- **Broker:** Redis at `redis://localhost:6379/0`
- **Task module:** `Backend/app/tasks/celery_app.py`
- **Workers:** Managed via docker-compose (`celery_worker`, `celery_beat`)

## Frontend → Backend Communication

### REST API
- **Base URL:** `http://localhost:8000/api/v1` (hardcoded in `Frontend/src/services/api.js`)
- **Auth:** Bearer token in `Authorization` header
- **Token storage:** `localStorage` (`access_token`, `refresh_token`, `user`)
- **Auto-refresh:** 401 responses trigger refresh token flow automatically

### CORS
- **Allowed origins:** `http://localhost:5173` (Vite dev), `http://localhost:3000`
- **Configured in:** `Backend/app/main.py` via `CORSMiddleware`

## Covered API Domains
- `/auth/` — login, register, refresh, `/auth/me`
- `/users/` — profile management
- `/courses/` — course CRUD + listing
- `/enrollments/` — student course enrollment
- `/content/lessons/` — lesson retrieval
- `/progress/` — lesson & course progress tracking, continue-learning
- `/struggles/events` — struggle event ingestion + AI hint requests
- `/quizzes/` — quiz retrieval + submission
- `/notifications/` — list + mark-read
- `/onboarding/` — multi-step onboarding flow
- `/analytics/` — student analytics
- `/ws/notifications` — WebSocket
