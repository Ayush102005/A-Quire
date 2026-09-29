FROM python:3.11-slim

# ── System deps ───────────────────────────────────────────────────────────
# gcc/libpq-dev: building psycopg2/asyncpg's C extensions.
# g++, default-jdk-headless, nodejs: the DSA code judge (app/api/v1/problems.py)
# compiles/runs student submissions in Java/C++/JavaScript via subprocess —
# without these, those three languages fail every submission with "Language
# toolchain not available on the server" (Python doesn't need anything extra
# here — it runs via sys.executable, the same interpreter as the app).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    g++ \
    default-jdk-headless \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ─────────────────────────────────────────────────────
WORKDIR /app

# ── Python deps (cached layer) ────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ──────────────────────────────────────────────────────
COPY . .

# ── Non-root user for security ────────────────────────────────────────────
RUN addgroup --system aquire && adduser --system --ingroup aquire aquire
USER aquire

# ── Runtime ───────────────────────────────────────────────────────────────
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
