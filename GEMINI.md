<!-- GSD:project-start source:PROJECT.md -->
## Project

**A-Quire**

A-Quire is an AI-powered adaptive learning platform for general education. Students watch lesson videos while the platform detects struggle signals (fixation, inactivity, low engagement) and delivers real-time AI mentor hints exactly when they're stuck — making learning genuinely personalized. Instructors create and manage courses, and admins oversee the platform.

**Core Value:** **AI that adapts to struggle:** when a student gets stuck during a lesson, A-Quire detects it and provides a personalized AI mentor hint in real time — not after a test, not after the lesson, but in the moment.

### Constraints

- **Privacy:** Never store raw webcam or video data — only derived struggle metrics (struggle_score, fixation_duration_ms, inactivity_duration_ms, lesson_timestamp_ms, transcript_window_id)
- **AI provider:** AWS Bedrock (boto3 already configured, credentials in .env)
- **Database:** PostgreSQL for production (asyncpg driver, SQLAlchemy async)
- **Frontend bundler:** Vite (env vars must use `import.meta.env.VITE_*` prefix)
- **Language:** Python 3.11 backend, JavaScript (ESM/JSX) frontend — no TypeScript migration in V1
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages & Runtime
| Layer | Language | Runtime |
|-------|----------|---------|
| Frontend | JavaScript (ESM, JSX) | Browser (Vite dev server) |
| Backend | Python 3.11+ | Uvicorn (ASGI) |
| Database migrations | Python | Alembic |
## Frontend
- `react-router-dom` ^7.15.1 — client-side routing
- `lucide-react` ^1.16.0 — icon library
- `tailwindcss` ^4.3.0 — utility-first CSS (v4, PostCSS)
- `@vitejs/plugin-react` ^6.0.1 — Vite React plugin (Babel)
- `eslint` ^10.3.0 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- `postcss` + `autoprefixer`
## Backend
- `sqlalchemy` >=2.0.25 (async ORM, `asyncpg` driver)
- `alembic` >=1.13.1 — database migrations
- `pydantic` >=2.9.0 + `pydantic-settings` >=2.1.0
- `python-jose[cryptography]` >=3.3.0 — JWT auth
- `passlib[bcrypt]` >=1.7.4 — password hashing
- `redis` >=5.0.1 + `celery` >=5.3.6 — async task queue
- `boto3` >=1.34.14 — AWS Bedrock (AI mentor, currently placeholder)
- `websockets` >=12.0 — WebSocket support
- `httpx` >=0.26.0, `pytest` >=7.4.4, `pytest-asyncio` >=0.23.3, `aiosqlite` >=0.19.0
## Database
- Connection: `postgresql+asyncpg://aquire:aquire@localhost:5432/aquire_db`
- File: `Backend/local.db` (2.7 MB — seeded with mock data)
## Configuration
- Reads from `.env` file (case-sensitive)
- Key env vars: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `AWS_*`, `BEDROCK_MODEL_ID`
- No `.env` usage on frontend side (should use Vite env vars in future)
## Containerization
- `Backend/Dockerfile` — production Docker image
- `Backend/docker-compose.yml` — orchestrates: PostgreSQL, Redis, backend, celery_worker, celery_beat
- `Backend/start.bat` / `start.sh` — local dev startup scripts
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Backend (Python / FastAPI)
### File Naming
- Snake_case for all Python files: `mentor_service.py`, `course_service.py`
- Models mirror their domain: `course.py` → `Course`, `Module`, `Lesson` classes
- API routers use domain names: `auth.py`, `courses.py`, `struggles.py`
### Module Structure
- Each router file defines a single `router = APIRouter()` at top
- Routers are registered in `main.py` with prefix + tags
- Business logic lives in `services/` — routers call services, not raw DB
- Dependencies injected via FastAPI `Depends()` in `api/deps.py`
### Async Patterns
### Models
- SQLAlchemy declarative models inherit from `Base` in `app.core.database`
- All timestamps: `DateTime(timezone=True)` with UTC defaults
- All models have `__repr__` for debugging
- Relationships use explicit `foreign_keys=` when ambiguous
### Error Handling
- FastAPI `HTTPException` raised in routers for HTTP errors
- Custom helpers in `app/utils/exceptions.py`
- Services return `None` or raise exceptions; routers handle 404/403 responses
### Imports
- `from __future__ import annotations` at top of all files
- Absolute imports throughout (`from app.models.course import Course`)
### Settings Pattern
## Frontend (React / JavaScript)
### File Naming
- PascalCase for components and pages: `StudentDashboard.jsx`, `ProtectedRoute.jsx`
- camelCase for utility files: `api.js`, `ThemeContext.jsx`
- `.jsx` extension for all React component files
### Component Pattern
- Functional components only (no class components)
- No Redux — local `useState`/`useEffect` + localStorage
- Direct `api.*` calls inside components (no custom hooks abstraction layer)
### API Usage Pattern
### Routing
- All routes defined centrally in `App.jsx`
- `ProtectedRoute` wraps role-specific routes: `<ProtectedRoute allowedRoles={['student']}>`
- No lazy loading / code splitting currently
### Styling
- Tailwind CSS v4 utility classes (primary styling approach)
- `index.css` — global Tailwind base + custom CSS (12KB, extensive)
- `App.css` — app-level styles
### Context Usage
- `ThemeProvider` wraps entire app in `App.jsx`
- `useContext(ThemeContext)` for dark/light mode in components
## Git Conventions
- Two separate git repos: `Frontend/.git` and `Backend/.git` (or root `.git`)
- No enforced commit message convention observed
- `.gitignore` present in Frontend (excludes `node_modules`, `dist`)
## Testing (Backend)
### Framework
- `pytest` + `pytest-asyncio` for async tests
- `httpx.AsyncClient` for API integration tests
### Fixtures (`conftest.py`)
### Test Coverage
- `test_auth.py` — register, login, token refresh
- `test_courses.py` — course CRUD
- `test_progress.py` — progress tracking
- `test_struggles.py` — struggle events + hints
- `test_quiz.py` — quiz creation + submission
- `test_notifications.py` — notification management
- `test_analytics.py` — analytics endpoints
### Running Tests
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern
- **Frontend:** React SPA (Single Page Application), CSR only
- **Backend:** REST API + WebSocket server, layered architecture
- **Communication:** HTTP REST + WebSocket (JWT auth)
- **Async:** Full async Python backend (asyncio + asyncpg)
## System Components
```
```
## Backend Layers
```
```
## Data Model
```
```
## Key Subsystems
### Authentication Flow
- `POST /auth/register` → creates User with hashed password (bcrypt)
- `POST /auth/login` → returns JWT access token (30 min) + refresh token (7 days)
- `POST /auth/refresh` → rotates tokens
- All protected routes use `deps.py::get_current_user` FastAPI dependency
- Frontend auto-refreshes on 401 via `api.js` request wrapper
### Struggle Detection & AI Mentor
- Frontend (`LessonPlayer.jsx`) detects struggle signals (fixation, inactivity, struggle_score)
- Posts to `POST /struggles/events` — stored as `StruggleEvent` (privacy-first: no raw video)
- Student requests hint via `POST /struggles/events/{id}/hint`
- `mentor_service.py` generates hint (template currently, Bedrock-ready)
- Hint pushed to student via WebSocket `manager.broadcast_to_user()`
### Real-time Notifications
- WebSocket endpoint: `/ws/notifications?token=<jwt>`
- `WebSocketManager` maintains per-user connection list (in-memory dict)
- Backend pushes notifications proactively; client keeps connection alive
### Progress Tracking
- `POST /progress/{lesson_id}` — upserts `LessonProgress` record
- Fields: `watched_seconds`, `completion_percent`, `is_completed`
- `GET /progress/continue-learning` — returns in-progress lessons for dashboard
## Frontend Architecture
### Routing
- `BrowserRouter` + `Routes` in `App.jsx`
- `ProtectedRoute` component wraps role-restricted pages
- Three role namespaces: `student`, `instructor`, `admin`
### State Management
- **No Redux / Zustand** — local component state + localStorage for auth
- `ThemeContext` — dark/light mode toggle
- Auth state persisted in localStorage (`access_token`, `refresh_token`, `user`)
### API Layer
- Single `Frontend/src/services/api.js` — centralized HTTP client
- Token auto-refresh on 401
- WebSocket utility exported separately (`connectNotifications`)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
