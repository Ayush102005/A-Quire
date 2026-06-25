# CONVENTIONS.md — A-Quire Code Conventions

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
```python
# All DB operations are async
async def get_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course))
    return result.scalars().all()

# Service functions take db session as parameter
async def generate_mentor_hint(event_id: int, db: AsyncSession, hint_level: str = "basic") -> str:
    ...
```

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
```python
from app.core.config import settings
# Usage: settings.DATABASE_URL, settings.SECRET_KEY
```

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
```javascript
// Services are called directly in components
import { api } from '../services/api';

// Inside component:
const data = await api.courses.list();
const user = await api.login(email, password);
```

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
```python
# SQLite in-memory DB for tests
# async test client fixture
# user creation helper
```

### Test Coverage
- `test_auth.py` — register, login, token refresh
- `test_courses.py` — course CRUD
- `test_progress.py` — progress tracking
- `test_struggles.py` — struggle events + hints
- `test_quiz.py` — quiz creation + submission
- `test_notifications.py` — notification management
- `test_analytics.py` — analytics endpoints

### Running Tests
```bash
cd Backend
pytest tests/ -v                      # Local
docker-compose exec backend pytest    # Docker
```
