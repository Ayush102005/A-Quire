# ── A-Quire Backend — Production Image ────────────────────────────────────────
FROM python:3.13-slim

# Keeps Python from buffering stdout so logs stream in real time
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install deps first (layer-cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Render (and most PaaS) injects $PORT at runtime; default 8000 for local docker run
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
