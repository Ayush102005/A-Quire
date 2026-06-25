# ARCHITECTURE.md — A-Quire System Architecture

## Pattern

**Full-stack monorepo** with separated Frontend and Backend directories.

- **Frontend:** React SPA (Single Page Application), CSR only
- **Backend:** REST API + WebSocket server, layered architecture
- **Communication:** HTTP REST + WebSocket (JWT auth)
- **Async:** Full async Python backend (asyncio + asyncpg)

## System Components

```
A-Quire/
├── Frontend/          # React SPA (Vite)
│   └── src/
│       ├── pages/     # Route-level components (22 pages)
│       ├── components/# Reusable UI components (minimal: ProtectedRoute + lesson/)
│       ├── contexts/  # React context providers (ThemeContext)
│       └── services/  # API client (api.js — all backend calls)
│
├── Backend/           # FastAPI server
│   └── app/
│       ├── api/v1/    # HTTP route handlers (13 routers)
│       ├── models/    # SQLAlchemy ORM models
│       ├── schemas/   # Pydantic request/response schemas
│       ├── services/  # Business logic layer
│       ├── core/      # Config, database, security, logging
│       ├── websocket/ # WebSocket connection manager
│       ├── tasks/     # Celery async tasks
│       └── utils/     # Exceptions, seeder
│
└── problems/          # DSA problem bank (27 topic folders)
                       # (likely source content for lessons)
```

## Backend Layers

```
HTTP Request
    ↓
FastAPI Router (app/api/v1/*.py)
    ↓ deps.py (auth dependency injection)
Service Layer (app/services/*.py)
    ↓
SQLAlchemy ORM (app/models/*.py)
    ↓
PostgreSQL / SQLite
```

## Data Model

```
User ──< Enrollment >── Course ──< Module ──< Lesson
  |                                              |
  └──< StruggleEvent                             |
            |                                   |
            └── (mentor_hint generated)          |
  |                                              |
  └──< LessonProgress ─────────────────── Lesson
  |
  └──< Notification
  |
  └── OnboardingProfile
  |
  └── Profile (goals, interests, preferences)
  |
  └──< QuizAttempt >── Quiz
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
