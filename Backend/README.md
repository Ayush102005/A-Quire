# A-Quire Backend

Production-ready FastAPI backend for A-Quire, an AI-powered adaptive learning platform.

## Features

- ✅ User authentication (JWT with access/refresh tokens)
- ✅ Role-based access (student, instructor, admin)
- ✅ Onboarding flow
- ✅ Course/Module/Lesson management
- ✅ Lesson progress tracking
- ✅ Struggle event ingestion (privacy-first: derived metrics only)
- ✅ AI mentor response pipeline hook
- ✅ WebSocket support for real-time updates
- ✅ Notifications system
- ✅ Quiz/self-check support
- ✅ Analytics endpoints
- ✅ Async task queue (Celery + Redis)
- ✅ Database migrations (Alembic)
- ✅ Comprehensive test scaffolding

## Tech Stack

- **Python 3.11**
- **FastAPI** - Modern async web framework
- **SQLAlchemy 2.0** - ORM with async support
- **PostgreSQL** - Primary database
- **Redis** - Caching & message broker
- **Celery** - Async task queue
- **JWT** - Authentication tokens
- **Pydantic v2** - Data validation
- **Alembic** - Database migrations
- **Docker** - Containerization

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── core/                   # Core configs & utilities
│   │   ├── config.py          # Settings management
│   │   ├── database.py        # SQLAlchemy setup
│   │   ├── security.py        # JWT + password hashing
│   │   └── logging.py         # Logging config
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── progress.py
│   │   ├── struggle.py
│   │   ├── notification.py
│   │   └── quiz.py
│   ├── schemas/               # Pydantic request/response schemas
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── progress.py
│   │   ├── struggle.py
│   │   ├── notification.py
│   │   └── quiz.py
│   ├── api/
│   │   ├── deps.py           # Dependency injection (auth)
│   │   └── v1/               # API v1 routers
│   │       ├── auth.py       # Register, login, refresh
│   │       ├── users.py      # Profile management
│   │       ├── courses.py    # Course CRUD
│   │       ├── lessons.py    # Lesson CRUD
│   │       ├── progress.py   # Progress tracking
│   │       ├── struggles.py  # Struggle event ingestion
│   │       ├── notifications.py  # Notification management
│   │       ├── quiz.py       # Quiz endpoints
│   │       └── analytics.py  # Analytics queries
│   ├── services/              # Business logic layer
│   │   ├── user_service.py
│   │   ├── mentor_service.py  # AI mentor generation
│   │   ├── notification_service.py
│   │   └── analytics_service.py
│   ├── websocket/
│   │   └── manager.py         # WebSocket connection manager
│   ├── tasks/
│   │   └── celery_app.py      # Async tasks
│   └── utils/
│       └── exceptions.py      # Custom exceptions
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_courses.py
│   └── test_progress.py
├── alembic/
│   ├── env.py
│   ├── alembic.ini
│   ├── script.py.mako
│   └── versions/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── pytest.ini
```

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)

### 2. Setup Environment

```bash
cd backend

# Copy environment file
cp .env.example .env

# (Optional) For local development, create virtual environment:
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start Services with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Backend, Celery Worker, Celery Beat)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Wait for PostgreSQL to be ready
docker-compose exec backend alembic upgrade head
```

### 4. Access API

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### 5. Run Tests

```bash
# Docker
docker-compose exec backend pytest tests/ -v

# Local
pytest tests/ -v
```

### 6. Stop Services

```bash
docker-compose down
```

## API Endpoints Summary

### Authentication
- `POST /api/v1/auth/register` - Create new user
- `POST /api/v1/auth/login` - Login & get tokens
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update profile
- `GET /api/v1/users/{user_id}` - Get user by ID (admin/instructor)

### Courses
- `POST /api/v1/courses/` - Create course
- `GET /api/v1/courses/` - List courses
- `GET /api/v1/courses/{course_id}` - Get course by ID

### Lessons
- `POST /api/v1/lessons/` - Create lesson
- `GET /api/v1/lessons/{lesson_id}` - Get lesson by ID

### Progress
- `POST /api/v1/progress/{lesson_id}` - Update progress
- `GET /api/v1/progress/lesson/{lesson_id}` - Get progress for lesson

### Struggle Events
- `POST /api/v1/struggles/events` - Ingest struggle event
- `GET /api/v1/struggles/events/{event_id}` - Get struggle event
- `POST /api/v1/struggles/events/{event_id}/hint` - Request mentor hint

### Notifications
- `GET /api/v1/notifications/` - List notifications
- `GET /api/v1/notifications/{notification_id}` - Get notification
- `PUT /api/v1/notifications/{notification_id}` - Mark as read/unread

### Quiz
- `POST /api/v1/quiz/` - Create quiz
- `GET /api/v1/quiz/{quiz_id}` - Get quiz
- `POST /api/v1/quiz/{quiz_id}/submit` - Submit quiz responses

### Analytics
- `GET /api/v1/analytics/student` - Get student analytics

## Authentication

All protected endpoints require JWT token in Authorization header:

```bash
curl -H "Authorization: Bearer <access_token>" http://localhost:8000/api/v1/users/me
```

## Database Migrations

Generate new migrations after model changes:

```bash
# Docker
docker-compose exec backend alembic revision --autogenerate -m "Add new column"
docker-compose exec backend alembic upgrade head

# Local
alembic revision --autogenerate -m "Add new column"
alembic upgrade head
```

## Celery Tasks

Monitor Celery tasks in real-time:

```bash
# View task logs
docker-compose logs -f celery_worker

# (Optional) Flower - task monitoring UI
pip install flower
celery -A app.tasks.celery_app flower
```

## Development Notes

### Privacy Rules
- **Never** store raw webcam images or videos
- Only store derived struggle metrics:
  - `struggle_score` (0.0-1.0)
  - `fixation_duration_ms`
  - `inactivity_duration_ms`
  - `lesson_timestamp_ms`
  - `transcript_window_id`

### AWS Bedrock Integration
The mentor service includes a placeholder for AWS Bedrock. To enable:

1. Set AWS credentials in `.env`
2. Update `mentor_service.py` - `call_bedrock_for_hint()`
3. Call the function from background task

### Async Patterns
- All database operations use `async/await` with `asyncpg`
- Background tasks via Celery for long-running operations
- WebSocket for real-time notifications (ready to use)

## Common Tasks

### Add New Endpoint

1. Create schema in `app/schemas/`
2. Create model in `app/models/` (if needed)
3. Create router in `app/api/v1/`
4. Include router in `app/main.py`

### Add New Celery Task

```python
# In app/tasks/celery_app.py
@celery_app.task
def my_task(param1: str):
    # Do work
    pass
```

### Create Database Backup

```bash
docker-compose exec postgres pg_dump -U aquire aquire_db > backup.sql
```

## Troubleshooting

### Port Already in Use
```bash
# Change ports in docker-compose.yml or:
docker-compose down -v  # Remove volumes
```

### Database Connection Error
```bash
# Check PostgreSQL status
docker-compose ps

# View database logs
docker-compose logs postgres
```

### Alembic Migration Conflicts
```bash
# Reset migrations (dev only!)
docker-compose exec postgres psql -U aquire -d aquire_db -c "DROP TABLE alembic_version;"
docker-compose exec backend alembic upgrade head
```

## Production Deployment Checklist

- [ ] Set `DEBUG=false` in `.env`
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure real database (PostgreSQL managed service)
- [ ] Set up Redis cluster
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS for production domain
- [ ] Set up email service (SendGrid, etc.)
- [ ] Add AWS Bedrock credentials
- [ ] Enable database backups
- [ ] Set up monitoring & alerting
- [ ] Run `pytest` for full test coverage
- [ ] Configure `.env` for production environment variables

## License

Proprietary - A-Quire Platform
