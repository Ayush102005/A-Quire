"""
Async-compatible Alembic env.py.

Imports all models so `alembic revision --autogenerate` picks up every table.
Uses async_engine_from_config so the asyncpg DATABASE_URL works end-to-end.
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.core.config import settings
from app.core.database import Base

# ── import every model so Base.metadata is fully populated ───────────────────
# NOTE: course.py now contains Course, Module, and Lesson — single source of truth
from app.models import user         # noqa: F401
from app.models import course       # noqa: F401  (exports Course, Module, Lesson)
from app.models import progress     # noqa: F401
from app.models import struggle     # noqa: F401
from app.models import quiz         # noqa: F401
from app.models import notification # noqa: F401
from app.models import onboarding   # noqa: F401
from app.models import profile      # noqa: F401

# ─────────────────────────────────────────────────────────────────────────────
config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Offline mode — generate SQL without a live DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Online mode — connect via asyncpg and run migrations."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
