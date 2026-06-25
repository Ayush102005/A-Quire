# TESTING.md — A-Quire Test Structure

## Backend Testing

### Framework Stack
- `pytest` >=7.4.4 — test runner
- `pytest-asyncio` >=0.23.3 — async test support
- `httpx` >=0.26.0 — async HTTP test client
- `aiosqlite` >=0.19.0 — in-memory SQLite for test isolation
- Config: `Backend/pytest.ini`

### Test Database Strategy
- Tests use SQLite in-memory DB (not PostgreSQL)
- `conftest.py` creates fresh DB tables per test session
- Seeder is NOT run in tests — fixtures create needed data

### conftest.py Fixtures
```python
# Key fixtures:
@pytest.fixture async def db() -> AsyncSession  # Clean SQLite session per test
@pytest.fixture async def client(db) -> AsyncClient  # httpx client with overridden DB dep
@pytest.fixture async def user(client) -> dict  # Pre-created registered user
@pytest.fixture async def auth_headers(client, user) -> dict  # {"Authorization": "Bearer ..."}
```

### Test Files
| File | Coverage |
|------|----------|
| `test_auth.py` | Register, login, token refresh, /auth/me |
| `test_courses.py` | Course creation, listing, modules, lessons (6KB — most comprehensive) |
| `test_progress.py` | Lesson progress update/get, continue-learning |
| `test_struggles.py` | Struggle event creation, hint generation (4KB) |
| `test_quiz.py` | Quiz creation, retrieval, submission |
| `test_notifications.py` | List, mark-read/unread |
| `test_analytics.py` | Student analytics endpoint |

### Running Tests
```bash
# Local (from Backend/)
cd Backend
python -m pytest tests/ -v

# Docker
docker-compose exec backend pytest tests/ -v

# Single file
pytest tests/test_auth.py -v
```

### Known Test Gaps
- No frontend tests (no Vitest, Jest, or Playwright setup)
- No WebSocket connection tests
- No Celery task tests
- No E2E tests
- No performance/load tests
- Test coverage percentage unknown (no pytest-cov configured)

## Frontend Testing

**Status: None implemented**

No test framework configured on the frontend:
- No Vitest / Jest config
- No `@testing-library/react`
- No Playwright / Cypress for E2E
- No MSW (Mock Service Worker) for API mocking

This is a significant gap for a production application.
