"""
app/core/firebase.py
─────────────────────
Firebase Admin SDK initialisation and token verification.

Public surface:
    init_firebase()             — call once at startup (via lifespan in main.py)
    verify_firebase_token(str)  — async, returns decoded claims dict or raises
"""
from __future__ import annotations

import asyncio

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.core.config import settings


# ── Initialisation ─────────────────────────────────────────────────────────

def init_firebase() -> firebase_admin.App:
    """
    Initialise the Firebase Admin SDK using the service-account JSON file
    specified by FIREBASE_CREDENTIALS_PATH in .env.

    Idempotent — safe to call multiple times; returns the existing app
    if it has already been initialised.
    """
    if firebase_admin._apps:
        # Already initialised — just return the default app.
        return firebase_admin.get_app()

    if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
        private_key = settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n')
        cred_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": private_key,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        cred = credentials.Certificate(cred_dict)
    elif settings.FIREBASE_CREDENTIALS_PATH:
        import os
        if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        else:
            print(f"[WARN] Firebase credentials file not found at {settings.FIREBASE_CREDENTIALS_PATH}. Skipping Firebase init.")
            return None
    else:
        # No Firebase config provided — skip silently (app uses JWT auth instead)
        print("[INFO] No Firebase credentials configured. Firebase auth disabled.")
        return None

    if cred:
        return firebase_admin.initialize_app(cred)
    return None


# ── Token verification ─────────────────────────────────────────────────────

async def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token and return its decoded claims.

    The Firebase SDK's ``verify_id_token`` is a blocking call; we run it
    in a threadpool so it never blocks the asyncio event loop.

    Args:
        id_token: Raw Firebase ID token string from the Authorization header.

    Returns:
        Decoded token claims dict.  Guaranteed keys:
            ``uid``         — Firebase UID (str)
            ``email``       — user's email (str | None)
            ``name``        — display name (str | None)
            ``email_verified`` — bool

    Raises:
        firebase_admin.auth.InvalidIdTokenError  — malformed token
        firebase_admin.auth.ExpiredIdTokenError  — token is past expiry
        firebase_admin.auth.RevokedIdTokenError  — token has been revoked
        firebase_admin.auth.CertificateFetchError — couldn't fetch Google certs
    """
    decoded: dict = await asyncio.to_thread(
        firebase_auth.verify_id_token,
        id_token,
        check_revoked=True,   # also catches revoked tokens, not just expired
        clock_skew_seconds=10,  # tolerate up to 10 seconds of clock drift
    )
    return decoded
