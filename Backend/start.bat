@echo off
REM ─────────────────────────────────────────────────────────────
REM  A-Quire Backend — Windows Dev Startup Script
REM  Usage: start.bat
REM ─────────────────────────────────────────────────────────────
setlocal

echo [A-Quire] Starting local development server...

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.11+ first.
    exit /b 1
)

REM Check .env exists
if not exist ".env" (
    echo [ERROR] .env file not found. Copy .env.example to .env and configure it.
    exit /b 1
)

REM Install dependencies if needed
if not exist "venv\" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo [INFO] Installing dependencies...
pip install -r requirements.txt --quiet

REM Run migrations
echo [INFO] Running database migrations...
alembic upgrade head
if errorlevel 1 (
    echo [ERROR] Migration failed. Is PostgreSQL running?
    exit /b 1
)

REM Start server
echo [OK] Starting FastAPI on http://localhost:8000
echo [OK] API docs at http://localhost:8000/docs
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

endlocal
