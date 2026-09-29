import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.api.deps import get_db, get_current_user
from app.api.deps.roles import get_student_user, get_instructor_user
from app.db.session import Base
from app.models.student import User

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def async_client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
        
    app.dependency_overrides.clear()

@pytest.fixture
def mock_student():
    return User(id=1, email="student@test.com", role="student")

@pytest.fixture
def mock_instructor():
    return User(id=2, email="instructor@test.com", role="instructor")

@pytest_asyncio.fixture
async def auth_client_student(async_client, mock_student):
    app.dependency_overrides[get_current_user] = lambda: mock_student
    app.dependency_overrides[get_student_user] = lambda: mock_student
    yield async_client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_student_user, None)

@pytest_asyncio.fixture
async def auth_client_instructor(async_client, mock_instructor):
    app.dependency_overrides[get_current_user] = lambda: mock_instructor
    app.dependency_overrides[get_instructor_user] = lambda: mock_instructor
    yield async_client
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_instructor_user, None)
