from __future__ import annotations

from typing import List, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    # App Config
    APP_NAME: str = "A-Quire"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    # "development" or "production" — set ENVIRONMENT=production in prod .env
    # to trigger the stricter startup checks in ProductionConfig below.
    ENVIRONMENT: str = "development"

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

    # ── Email / SES ────────────────────────────────────────────────────────────
    # Verified SES sender address (leave blank in dev — emails log to console)
    SES_SENDER_EMAIL: str = ""
    # Frontend base URL used in email links
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    # Max login attempts per minute per IP before 429 is returned
    LOGIN_RATE_LIMIT: str = "10/minute"
    # False by default — rate_limit.py falls back to request.client.host,
    # the actual TCP peer. Only set True when a trusted reverse proxy sits
    # in front of this app and sets X-Forwarded-For itself (e.g. this
    # project's docker-compose.yml + Caddyfile) — otherwise ANY client can
    # set that header themselves and pick whatever IP they want the rate
    # limiter to bucket them under, trivially defeating it. Verified
    # directly that Caddy's reverse_proxy overwrites a client-supplied
    # X-Forwarded-For with the real connecting IP rather than trusting it,
    # which is what makes it safe to enable this when Caddy is actually in
    # front — it would NOT be safe to enable this against a raw, unproxied
    # backend.
    TRUST_X_FORWARDED_FOR: bool = False

    # ── JaaS (Jitsi as a Service) video meetings ────────────────────────────────
    # JaaS requires a per-join RS256-signed JWT (see app/api/v1/meetings.py) —
    # without these, /meeting/:roomId (Frontend/src/pages/MeetingRoom.jsx)
    # calls Jitsi with no auth token at all and every join is rejected
    # ("Sorry, you're not allowed to join this call"). Get all three from
    # the JaaS Console (jaas.8x8.vc) → API Keys.
    JAAS_APP_ID: Optional[str] = None
    JAAS_API_KEY_ID: Optional[str] = None
    # The downloaded private key file's contents (PEM, starts with
    # "-----BEGIN PRIVATE KEY-----"), pasted as one .env value — see
    # .env.example for how to keep the embedded newlines.
    JAAS_PRIVATE_KEY: Optional[str] = None

    # ── YouTube transcript fetching (optional — degrades gracefully) ───────────
    # Without these, transcript fetching uses direct requests, which YouTube
    # frequently blocks from cloud/datacenter IPs (confirmed directly against
    # this project's own EC2 deployment) — lessons still work fine, they just
    # won't have an auto-fetched transcript to ground AI question generation
    # in. See app/utils/youtube.py's _build_api(). Get credentials from
    # Webshare's "Proxy" tab (not your account login).
    WEBSHARE_PROXY_USERNAME: Optional[str] = None
    WEBSHARE_PROXY_PASSWORD: Optional[str] = None
    # One specific dedicated proxy from the account's Proxy List (not the
    # rotating gateway — see app/utils/youtube.py's _build_api() docstring
    # for why). Copy from webshareproxy.com dashboard's Proxy List table.
    WEBSHARE_PROXY_HOST: Optional[str] = None
    WEBSHARE_PROXY_PORT: int = 80

    # ── Firebase (optional — skip if not using Firebase auth) ──────────────────
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None

    # ── Anthropic API (AI Mentor hints + AMATTA question generation) ──────────
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_WORKSPACE_ID: Optional[str] = None
    ANTHROPIC_MODEL_ID: str = "claude-sonnet-5"

    # ── AWS Polly (Text-to-Speech) ──────────────────────────────────────────
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION_NAME: str = "us-east-1"
    POLLY_VOICE_ID: str = "Matthew"

    # ── AI Generation (Adaptive Engine) ───────────────────────────────────────
    AI_GENERATION_ENABLED: bool = True
    AI_GENERATION_INFO_THRESHOLD: float = 0.1
    # Effectively unlimited by request — no cap on how many questions AMATTA
    # can generate per session/topic. generation_budget.py's in-progress lock
    # (one generation at a time per topic) still applies regardless of these
    # values — that's a correctness guard against racing duplicate calls, not
    # a rate limit, so it isn't part of "no limit on question generation".
    AI_GENERATION_MAX_PER_SESSION: int = 1_000_000
    AI_GENERATION_MAX_PER_TOPIC: int = 1_000_000
    # Both budgets above are sliding windows (see app/services/generation_budget.py),
    # not lifetime caps — a topic's item bank must keep growing as more
    # students attempt it over time, not freeze forever after the first burst.
    AI_GENERATION_SESSION_WINDOW_SECONDS: int = 60 * 60       # 1 hour
    AI_GENERATION_TOPIC_WINDOW_SECONDS: int = 15 * 60         # 15 minutes

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
    }


class ProductionConfig(Settings):
    """
    Stricter settings for production. Instantiated at startup (see
    app/main.py) whenever ENVIRONMENT=production, purely to run its
    validators against the already-loaded settings — refuses to boot if a
    placeholder secret, a dev CORS origin, or missing Firebase config would
    otherwise silently reach production.
    """

    ENVIRONMENT: str = "production"

    @field_validator("DEBUG")
    @classmethod
    def reject_debug_in_production(cls, v: bool) -> bool:
        # main.py's CORS setup keys entirely off DEBUG, not ENVIRONMENT — if
        # DEBUG is left True with ENVIRONMENT=production, every other check
        # here can pass (real SECRET_KEY, no localhost origins, Firebase
        # configured) while CORS still allows any origin with credentials
        # (allow_origins=["*"], allow_credentials=True). This was a real gap:
        # nothing previously stopped ENVIRONMENT and DEBUG from disagreeing.
        if v:
            raise ValueError("DEBUG must be False when ENVIRONMENT=production")
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def reject_default_secret_key(cls, v: str) -> str:
        if v == Settings.model_fields["SECRET_KEY"].default:
            raise ValueError("SECRET_KEY cannot be the default value")
        return v

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def reject_localhost_origins(cls, v: str) -> str:
        if "localhost" in v:
            raise ValueError("ALLOWED_ORIGINS cannot contain 'localhost'")
        return v

    @model_validator(mode="after")
    def require_firebase_configured(self) -> "ProductionConfig":
        # init_firebase() (app/core/firebase.py) accepts Firebase config two
        # ways: inline PROJECT_ID+PRIVATE_KEY+CLIENT_EMAIL, or a
        # FIREBASE_CREDENTIALS_PATH pointing at a service-account JSON file
        # (what this project's own dev .env actually uses today). The old
        # validator here only ever checked FIREBASE_PROJECT_ID being set —
        # so a production deploy using the exact same credentials-file setup
        # that already works in dev would fail this check and refuse to
        # boot, even though Firebase is genuinely configured correctly.
        has_inline = bool(self.FIREBASE_PROJECT_ID and self.FIREBASE_PRIVATE_KEY and self.FIREBASE_CLIENT_EMAIL)
        has_path = bool(self.FIREBASE_CREDENTIALS_PATH)
        if not (has_inline or has_path):
            raise ValueError(
                "Firebase is not configured — set either FIREBASE_PROJECT_ID + "
                "FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL, or FIREBASE_CREDENTIALS_PATH."
            )
        return self


settings = Settings()

if settings.ENVIRONMENT == "production":
    # Re-validate the already-loaded settings against the stricter production
    # rules. Raises and prevents the app from starting if anything's wrong.
    ProductionConfig(**settings.model_dump())
