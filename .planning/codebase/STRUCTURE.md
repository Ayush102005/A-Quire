# STRUCTURE.md — A-Quire Directory Structure

## Root

```
d:\A-Quire\
├── Frontend/          # React + Vite SPA
├── Backend/           # FastAPI Python backend
└── problems/          # DSA problem bank (27 topic dirs)
```

## Frontend

```
Frontend/
├── index.html                    # Vite HTML entry point
├── vite.config.js                # Vite config (React plugin)
├── tailwind.config.js            # Tailwind v4 config
├── postcss.config.js             # PostCSS config
├── eslint.config.js              # ESLint flat config
├── package.json                  # Dependencies
├── dist/                         # Build output
├── public/                       # Static assets
└── src/
    ├── main.jsx                  # React entry — renders <App/>
    ├── App.jsx                   # Root router (BrowserRouter + Routes)
    ├── App.css                   # Global app styles
    ├── index.css                 # Tailwind base styles + custom CSS (12KB)
    ├── assets/                   # Static assets (images, etc.)
    ├── contexts/
    │   └── ThemeContext.jsx      # Dark/light mode context
    ├── services/
    │   └── api.js                # Centralized HTTP + WebSocket client
    ├── components/
    │   ├── ProtectedRoute.jsx    # Auth guard component
    │   └── lesson/               # Lesson player sub-components
    └── pages/
        ├── Home.jsx              # Landing page (26KB)
        ├── Features.jsx          # Feature showcase (19KB)
        ├── Login.jsx             # Auth login (11KB)
        ├── SignUp.jsx            # Auth registration (21KB)
        ├── ForgotPassword.jsx    # Password reset (16KB)
        ├── RoleSelection.jsx     # Role picker post-signup (12KB)
        ├── StudentOnboarding.jsx # Multi-step onboarding (26KB)
        ├── StudentDashboard.jsx  # Student home (27KB)
        ├── MyCourses.jsx         # Enrolled courses list (16KB)
        ├── CourseDetail.jsx      # Course + modules view (19KB)
        ├── LessonPlayer.jsx      # Video player + struggle detection (45KB)
        ├── SelfCheck.jsx         # Quiz interface (20KB)
        ├── ProgressAnalytics.jsx # Student progress charts (24KB)
        ├── StruggleAnalytics.jsx # Struggle metrics view (23KB)
        ├── Notifications.jsx     # Notifications list (20KB)
        ├── Settings.jsx          # User settings (22KB)
        ├── InstructorDashboard.jsx # Instructor home (21KB)
        ├── InstructorReports.jsx  # Instructor analytics (19KB)
        ├── AdminDashboard.jsx    # Admin overview (22KB)
        ├── UserManagement.jsx    # User CRUD (20KB)
        ├── Billing.jsx           # Billing management (22KB)
        └── NotFound.jsx          # 404 page (1.5KB)
```

## Backend

```
Backend/
├── app/
│   ├── main.py                   # FastAPI entry point, router registration, lifespan
│   ├── core/
│   │   ├── config.py             # pydantic-settings Settings class
│   │   ├── database.py           # SQLAlchemy engine, session, Base
│   │   ├── security.py           # JWT encode/decode, password hashing
│   │   └── logging.py            # Logging configuration
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── user.py               # User (student/instructor/admin)
│   │   ├── course.py             # Course, Module, Lesson + student_courses assoc table
│   │   ├── progress.py           # LessonProgress
│   │   ├── struggle.py           # StruggleEvent (struggle_score, hints)
│   │   ├── quiz.py               # Quiz, QuizQuestion, QuizAttempt
│   │   ├── notification.py       # Notification
│   │   ├── onboarding.py         # OnboardingStatus
│   │   └── profile.py            # UserProfile (goals, interests, preferences)
│   ├── schemas/                  # Pydantic schemas (request/response)
│   │   └── [mirrors models/]
│   ├── api/
│   │   ├── deps.py               # FastAPI dependency: get_current_user (JWT)
│   │   └── v1/                   # Route handlers
│   │       ├── health.py         # GET /health
│   │       ├── auth.py           # POST /auth/register, /login, /refresh, GET /auth/me
│   │       ├── users.py          # GET/PUT /users/me, GET /users/{id}
│   │       ├── courses.py        # Course CRUD + listing (9KB)
│   │       ├── lessons.py        # Lesson CRUD
│   │       ├── enrollments.py    # POST/DELETE /enrollments/{id}, GET /enrollments/
│   │       ├── progress.py       # POST/GET /progress/
│   │       ├── struggles.py      # POST /struggles/events, GET hint
│   │       ├── quiz.py           # Quiz CRUD + submit
│   │       ├── notifications.py  # GET/PUT /notifications/
│   │       ├── onboarding.py     # Multi-step onboarding endpoints
│   │       └── analytics.py      # GET /analytics/student
│   ├── services/                 # Business logic
│   │   ├── auth_service.py       # User creation, token management
│   │   ├── course_service.py     # Course/module/lesson CRUD (15KB)
│   │   ├── progress_service.py   # Progress tracking + continue-learning (10KB)
│   │   ├── mentor_service.py     # Hint generation + Bedrock placeholder
│   │   ├── onboarding_service.py # Onboarding state machine
│   │   ├── notification_service.py # Notification CRUD
│   │   ├── analytics_service.py  # Analytics queries
│   │   └── user_service.py       # User profile management
│   ├── websocket/
│   │   └── manager.py            # WebSocketManager — per-user connection map
│   ├── tasks/
│   │   └── celery_app.py         # Celery app + task definitions
│   └── utils/
│       ├── exceptions.py         # Custom HTTP exception helpers
│       └── seeder.py             # SQLite dev data seeder
├── alembic/                      # Database migration scripts
│   ├── env.py
│   ├── alembic.ini
│   └── versions/
├── tests/                        # pytest test suite
│   ├── conftest.py               # Test fixtures (async client, SQLite DB)
│   ├── test_auth.py
│   ├── test_courses.py
│   ├── test_progress.py
│   ├── test_struggles.py
│   ├── test_quiz.py
│   ├── test_notifications.py
│   └── test_analytics.py
├── local.db                      # SQLite dev database (2.7MB, seeded)
├── .env                          # Local environment variables
├── .env.example                  # Environment template
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Production Docker image
├── docker-compose.yml            # Multi-service orchestration
├── pytest.ini                    # pytest configuration
└── start.bat / start.sh          # Dev startup scripts
```

## Problems Bank

```
problems/                         # 27 DSA topic directories
├── Arrays/
├── Arrays Part-II/
├── Binary Search/
├── Binary Tree/
├── Dynamic Programming/
├── Graph/
├── Linked List/
├── Recursion/
├── Stack and Queue/
├── String/
├── Trie/
└── ... (27 total topics)
```

## Key File Locations

| Purpose | Path |
|---------|------|
| Frontend entry | `Frontend/src/main.jsx` |
| Route definitions | `Frontend/src/App.jsx` |
| API client | `Frontend/src/services/api.js` |
| Backend entry | `Backend/app/main.py` |
| Settings | `Backend/app/core/config.py` |
| Auth dependency | `Backend/app/api/deps.py` |
| AI mentor | `Backend/app/services/mentor_service.py` |
| WebSocket manager | `Backend/app/websocket/manager.py` |
| DB models | `Backend/app/models/*.py` |
