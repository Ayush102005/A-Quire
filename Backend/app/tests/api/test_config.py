import pytest
from app.core.config import ProductionConfig, Settings


def test_production_config_rejects_default_secret_key():
    with pytest.raises(ValueError, match="SECRET_KEY cannot be the default value"):
        ProductionConfig(
            SECRET_KEY=Settings.model_fields["SECRET_KEY"].default,
            FIREBASE_PROJECT_ID="proj",
            DATABASE_URL="postgresql+asyncpg://user:pass@prod-host/db",
            REDIS_URL="redis://prod-host",
            ALLOWED_ORIGINS="https://production.a-quire.com",
        )


def test_production_config_rejects_localhost_origins():
    with pytest.raises(ValueError, match="ALLOWED_ORIGINS cannot contain 'localhost'"):
        ProductionConfig(
            SECRET_KEY="a-real-production-secret",
            FIREBASE_PROJECT_ID="proj",
            DATABASE_URL="postgresql+asyncpg://user:pass@prod-host/db",
            REDIS_URL="redis://prod-host",
            ALLOWED_ORIGINS="http://localhost:5173",
        )


def test_production_config_rejects_missing_firebase():
    # Explicitly pass DEBUG=False and FIREBASE_CREDENTIALS_PATH="" — both
    # are unset as kwargs here, and pydantic-settings would otherwise pull
    # DEBUG=True and FIREBASE_CREDENTIALS_PATH="firebase-credentials.json"
    # from the local dev .env (see test_production_config_accepts_valid_config's
    # comment on this same gotcha), which would mask the check this test
    # actually wants to isolate.
    with pytest.raises(ValueError, match="Firebase is not configured"):
        ProductionConfig(
            SECRET_KEY="a-real-production-secret",
            FIREBASE_PROJECT_ID="",
            FIREBASE_CREDENTIALS_PATH="",
            DATABASE_URL="postgresql+asyncpg://user:pass@prod-host/db",
            REDIS_URL="redis://prod-host",
            ALLOWED_ORIGINS="https://production.a-quire.com",
            DEBUG=False,
        )


def test_production_config_accepts_credentials_path_firebase_setup():
    # This project's actual dev .env configures Firebase via
    # FIREBASE_CREDENTIALS_PATH alone (a service-account JSON file), not the
    # inline PROJECT_ID/PRIVATE_KEY/CLIENT_EMAIL trio — the old validator
    # only ever checked FIREBASE_PROJECT_ID, so deploying with this exact
    # working dev setup would have failed to boot in production.
    config = ProductionConfig(
        SECRET_KEY="a-real-production-secret",
        FIREBASE_PROJECT_ID="",
        FIREBASE_CREDENTIALS_PATH="firebase-credentials.json",
        DATABASE_URL="postgresql+asyncpg://user:pass@prod-host/db",
        REDIS_URL="redis://prod-host",
        ALLOWED_ORIGINS="https://production.a-quire.com",
        DEBUG=False,
    )
    assert config.FIREBASE_CREDENTIALS_PATH == "firebase-credentials.json"


def test_production_config_rejects_debug_true():
    with pytest.raises(ValueError, match="DEBUG must be False"):
        ProductionConfig(
            SECRET_KEY="a-real-production-secret",
            FIREBASE_PROJECT_ID="proj",
            DATABASE_URL="postgresql+asyncpg://user:pass@prod-host/db",
            REDIS_URL="redis://prod-host",
            ALLOWED_ORIGINS="https://production.a-quire.com",
            DEBUG=True,
        )


def test_production_config_accepts_valid_config():
    config = ProductionConfig(
        SECRET_KEY="a-real-production-secret",
        FIREBASE_PROJECT_ID="proj",
        FIREBASE_PRIVATE_KEY="key",
        FIREBASE_CLIENT_EMAIL="email@example.com",
        DATABASE_URL="postgresql+asyncpg://user:pass@prod-host/db",
        REDIS_URL="redis://prod-host",
        ALLOWED_ORIGINS="https://production.a-quire.com",
        # Pinned explicitly: the local dev .env sets DEBUG=True, and
        # pydantic-settings applies .env values over class-level field
        # defaults for any field not passed as an explicit kwarg here.
        DEBUG=False,
    )
    assert config.ENVIRONMENT == "production"
    assert config.DEBUG is False
