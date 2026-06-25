@echo off
REM Quick start script for A-Quire Backend (Windows)

setlocal enabledelayedexpansion

echo 🚀 A-Quire Backend Quick Start
echo ==============================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo ✅ Docker found

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env from .env.example
    copy .env.example .env
    echo ⚠️  Update .env with your settings before deploying to production
)

REM Start services
echo 🐳 Starting Docker Compose services...
docker-compose up -d

REM Wait for PostgreSQL
echo ⏳ Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak

REM Run migrations
echo 🔄 Running database migrations...
docker-compose exec -T backend alembic upgrade head

REM Health check
echo 🏥 Running health check...
timeout /t 2 /nobreak

echo.
echo ✅ Backend is ready!
echo.
echo 📊 Access Points:
echo   - API Docs:      http://localhost:8000/docs
echo   - ReDoc:         http://localhost:8000/redoc
echo   - Health:        http://localhost:8000/health
echo.
echo 📝 Next Steps:
echo   1. Register a user: POST /api/v1/auth/register
echo   2. Login: POST /api/v1/auth/login
echo   3. Create courses: POST /api/v1/courses/
echo.
echo 📋 Common Commands:
echo   - View logs:      docker-compose logs -f backend
echo   - Stop services:  docker-compose down
echo   - Run tests:      docker-compose exec backend pytest tests/ -v
echo.
