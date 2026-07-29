#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  A-Quire Backend — Linux/macOS Dev Startup Script
#  Usage: chmod +x start.sh && ./start.sh
# ─────────────────────────────────────────────────────────────
set -e

echo "[A-Quire] Starting local development server..."

# Check Python 3.11+
python3 --version >/dev/null 2>&1 || { echo "[ERROR] Python 3.11+ required."; exit 1; }

# Check .env
[ -f ".env" ] || { echo "[ERROR] .env not found. Copy .env.example to .env."; exit 1; }

# Create venv if needed
if [ ! -d "venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "[INFO] Installing dependencies..."
pip install -r requirements.txt -q

# Run migrations
echo "[INFO] Running database migrations..."
alembic upgrade head

# Start server
echo "[OK] Starting FastAPI on http://localhost:8000"
echo "[OK] API docs: http://localhost:8000/docs"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
