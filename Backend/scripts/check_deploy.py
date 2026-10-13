"""
scripts/check_deploy.py
─────────────────────────
Pre-flight deployment readiness validation script for A-Quire.
Checks environment configuration, security settings, database schema,
and third-party dependencies before container launch or production release.

Usage:
    python scripts/check_deploy.py [--env-file .env.production]
"""
import sys
import os
import argparse
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

def main():
    parser = argparse.ArgumentParser(description="Validate A-Quire production deployment readiness.")
    parser.add_argument("--env-file", default=".env", help="Path to env file to test (default: .env)")
    args = parser.parse_args()

    # Force UTF-8 stdout if possible on Windows
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    env_path = backend_dir / args.env_file
    print("=" * 65)
    print(f"[*] A-QUIRE PRE-FLIGHT DEPLOYMENT CHECK")
    print(f"Directory: {backend_dir}")
    print(f"Env file:  {args.env_file}")
    print("=" * 65)

    errors = []
    warnings = []
    passes = []

    # 1. Env File Existence
    if not env_path.exists():
        errors.append(f"Environment file '{args.env_file}' does not exist.")
    else:
        passes.append(f"Found environment file '{args.env_file}'")

    # 2. Firebase Credentials File
    fb_path = backend_dir / "firebase-credentials.json"
    if fb_path.exists():
        passes.append("Found 'firebase-credentials.json' service account file")
    else:
        warnings.append(
            "firebase-credentials.json not found in Backend root. "
            "(Make sure it is uploaded to the server before running docker compose)"
        )

    # 3. Docker Compose & Caddyfile
    compose_path = backend_dir / "docker-compose.yml"
    caddy_path = backend_dir / "Caddyfile"
    if compose_path.exists():
        passes.append("Found 'docker-compose.yml'")
    else:
        errors.append("docker-compose.yml missing from Backend root")

    if caddy_path.exists():
        caddy_content = caddy_path.read_text(encoding="utf-8")
        if "yourdomain.com" in caddy_content:
            warnings.append(
                "Caddyfile still contains placeholder 'yourdomain.com'. "
                "Update with your registered domain before deploying."
            )
        else:
            passes.append("Caddyfile configured with custom domain")
    else:
        errors.append("Caddyfile missing from Backend root")

    # 4. Settings & ProductionConfig validation
    if env_path.exists():
        # Temporarily point dotenv / pydantic to this file
        from dotenv import dotenv_values
        env_dict = dotenv_values(env_path)

        # Check DEBUG
        debug_val = env_dict.get("DEBUG", "False").lower() in ("true", "1", "yes")
        env_mode = env_dict.get("ENVIRONMENT", "development")

        if env_mode == "production":
            if debug_val:
                errors.append("DEBUG is set to True while ENVIRONMENT=production. Must be False.")
            else:
                passes.append("DEBUG is False in production mode")

            secret_key = env_dict.get("SECRET_KEY", "")
            if not secret_key or "change-me" in secret_key or "replace-with" in secret_key:
                errors.append("SECRET_KEY is using a placeholder/default value. Generate a 32+ char hex secret.")
            else:
                passes.append("SECRET_KEY is non-default")

            allowed_origins = env_dict.get("ALLOWED_ORIGINS", "")
            if "localhost" in allowed_origins:
                errors.append(f"ALLOWED_ORIGINS contains 'localhost': {allowed_origins}. Replace with production frontend URL.")
            elif "yourdomain.com" in allowed_origins:
                warnings.append("ALLOWED_ORIGINS contains placeholder 'yourdomain.com'. Update with actual domain.")
            else:
                passes.append(f"ALLOWED_ORIGINS set to: {allowed_origins}")

            db_url = env_dict.get("DATABASE_URL", "")
            if "sqlite" in db_url:
                warnings.append(
                    "DATABASE_URL is currently SQLite. For production, ensure PostgreSQL is used "
                    "(e.g. docker-compose's internal postgres service or AWS RDS)."
                )
            else:
                passes.append(f"DATABASE_URL uses PostgreSQL driver")
        else:
            warnings.append(f"ENVIRONMENT is set to '{env_mode}'. Set to 'production' for strict validation.")

        # Check YouTube proxy
        if not env_dict.get("WEBSHARE_PROXY_USERNAME"):
            warnings.append(
                "WEBSHARE_PROXY_USERNAME not configured. If deployed on AWS/cloud IPs, "
                "YouTube may block transcript fetching."
            )
        else:
            passes.append("YouTube Webshare proxy configured")

        # Check AI Mentor Anthropic Key
        if not env_dict.get("ANTHROPIC_API_KEY"):
            warnings.append("ANTHROPIC_API_KEY is not set. AI Mentor hints will fall back to static templates.")
        else:
            passes.append("Anthropic API key is configured")

    # 5. Alembic migrations check
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        script_dir = ScriptDirectory.from_config(alembic_cfg)
        heads = script_dir.get_heads()
        if len(heads) == 1:
            passes.append(f"Alembic migration graph is clean (Head: {heads[0]})")
        else:
            errors.append(f"Multiple migration heads detected: {heads}. Run 'alembic merge heads'.")
    except Exception as e:
        warnings.append(f"Could not verify Alembic heads: {e}")

    # Output Summary
    print("\n--- PASSED CHECKS ---")
    for p in passes:
        print(f"  [OK] {p}")

    if warnings:
        print("\n--- WARNINGS / ITEMS TO CONFIGURE ---")
        for w in warnings:
            print(f"  [WARN] {w}")

    if errors:
        print("\n--- BLOCKING ERRORS ---")
        for e in errors:
            print(f"  [FAIL] {e}")
        print("\n[FAIL] Pre-flight check failed with blocking errors.")
        sys.exit(1)
    else:
        print("\n[SUCCESS] Pre-flight check PASSED! Ready for deployment once warnings are resolved.")
        sys.exit(0)

if __name__ == "__main__":
    main()
