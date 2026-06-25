from __future__ import annotations

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "A-Quire Backend"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://aquire:aquire@localhost:5432/aquire_db"

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ───────────────────────────────────────────────────────────────────
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Set ALLOWED_ORIGINS in .env as a comma-separated string:
    #   ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
    # Dev default includes both Vite ports.
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: object) -> str:
        """Accept list or comma-separated string from environment."""
        if isinstance(v, list):
            return ",".join(v)
        return str(v)

    @property
    def allowed_origins_list(self) -> List[str]:
        """Return parsed CORS origins as a list for use in FastAPI middleware."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # ── AI Mentor ─────────────────────────────────────────────────────────────
    # Struggle score (0.0–1.0) above which a hint is auto-suggested to the student
    STRUGGLE_HINT_THRESHOLD: float = 0.7

    # ── AWS Bedrock (placeholder) ─────────────────────────────────────────────
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-sonnet-20240229-v1:0"

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }


settings = Settings()
