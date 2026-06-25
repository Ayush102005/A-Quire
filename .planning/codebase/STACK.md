# STACK.md — A-Quire Technology Stack

## Languages & Runtime

| Layer | Language | Runtime |
|-------|----------|---------|
| Frontend | JavaScript (ESM, JSX) | Browser (Vite dev server) |
| Backend | Python 3.11+ | Uvicorn (ASGI) |
| Database migrations | Python | Alembic |

## Frontend

**Framework:** React 19.2.6 (via Vite 8.0.12)

**Key Dependencies:**
- `react-router-dom` ^7.15.1 — client-side routing
- `lucide-react` ^1.16.0 — icon library
- `tailwindcss` ^4.3.0 — utility-first CSS (v4, PostCSS)
- `@vitejs/plugin-react` ^6.0.1 — Vite React plugin (Babel)

**Dev tooling:**
- `eslint` ^10.3.0 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- `postcss` + `autoprefixer`

**Build output:** `Frontend/dist/` (Vite production build)

## Backend

**Framework:** FastAPI >=0.109.0 with Uvicorn[standard] >=0.27.0

**Key Dependencies:**
- `sqlalchemy` >=2.0.25 (async ORM, `asyncpg` driver)
- `alembic` >=1.13.1 — database migrations
- `pydantic` >=2.9.0 + `pydantic-settings` >=2.1.0
- `python-jose[cryptography]` >=3.3.0 — JWT auth
- `passlib[bcrypt]` >=1.7.4 — password hashing
- `redis` >=5.0.1 + `celery` >=5.3.6 — async task queue
- `boto3` >=1.34.14 — AWS Bedrock (AI mentor, currently placeholder)
- `websockets` >=12.0 — WebSocket support

**Test dependencies:**
- `httpx` >=0.26.0, `pytest` >=7.4.4, `pytest-asyncio` >=0.23.3, `aiosqlite` >=0.19.0

## Database

**Production target:** PostgreSQL (via `asyncpg` driver)
- Connection: `postgresql+asyncpg://aquire:aquire@localhost:5432/aquire_db`

**Local dev:** SQLite (`aiosqlite`) — auto-created at startup via `Base.metadata.create_all`
- File: `Backend/local.db` (2.7 MB — seeded with mock data)

## Configuration

**Backend config:** `Backend/app/core/config.py` — `pydantic-settings` `BaseSettings`
- Reads from `.env` file (case-sensitive)
- Key env vars: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, `AWS_*`, `BEDROCK_MODEL_ID`

**Frontend config:** Hardcoded `BASE_URL = "http://localhost:8000/api/v1"` in `Frontend/src/services/api.js`
- No `.env` usage on frontend side (should use Vite env vars in future)

## Containerization

- `Backend/Dockerfile` — production Docker image
- `Backend/docker-compose.yml` — orchestrates: PostgreSQL, Redis, backend, celery_worker, celery_beat
- `Backend/start.bat` / `start.sh` — local dev startup scripts
