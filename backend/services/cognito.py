"""
services/cognito.py — Cognito JWT verification for A-Quire backend.
Replaces firebase_config.py.
"""
import logging
import os
import json
import time
import httpx
from jose import jwt, JWTError

logger = logging.getLogger("aquire.cognito")

_JWKS_CACHE = {"keys": None, "fetched_at": 0}
_JWKS_TTL = 3600  # Refresh public keys every hour


def _get_jwks() -> dict:
    """Fetch and cache Cognito public keys (JWKS)."""
    now = time.time()
    if _JWKS_CACHE["keys"] and (now - _JWKS_CACHE["fetched_at"]) < _JWKS_TTL:
        return _JWKS_CACHE["keys"]

    region = os.environ.get("COGNITO_REGION")
    if not region:
        logger.error("COGNITO_REGION env var not set — token verification will likely fail")
        region = "us-east-1"
    pool_id = os.environ.get("COGNITO_USER_POOL_ID", "")

    if not pool_id:
        logger.error("COGNITO_USER_POOL_ID not set — auth will fail")
        return {}

    url = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}/.well-known/jwks.json"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE["keys"] = resp.json()
        _JWKS_CACHE["fetched_at"] = now
        return _JWKS_CACHE["keys"]
    except Exception as e:
        logger.exception("Failed to fetch JWKS: %s", e)
        return {}


def verify_cognito_token(token: str) -> dict | None:
    """
    Verifies a Cognito JWT access token or ID token.
    Returns the decoded payload dict on success, None on failure.
    """
    try:
        jwks = _get_jwks()
        if not jwks:
            logger.error("JWKS not available — auth will fail")
            return None

        region   = os.environ.get("COGNITO_REGION", "us-east-1")
        pool_id  = os.environ.get("COGNITO_USER_POOL_ID", "")
        client_id = os.environ.get("COGNITO_CLIENT_ID", "")
        issuer   = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}"

        # Decode header to get 'kid', then find matching key
        header = jwt.get_unverified_header(token)
        key    = next((k for k in jwks.get("keys", []) if k["kid"] == header["kid"]), None)
        if not key:
            logger.warning("No matching JWKS key for kid: %s", header.get('kid'))
            return None

        # Verify with audience (Client ID for ID tokens)
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=issuer,
            audience=client_id,  # ID tokens have Client ID as audience
            options={"verify_at_hash": False},
        )

        # Normalize: expose uid (sub) like Firebase did
        payload["uid"] = payload.get("sub", "")
        return payload

    except JWTError as e:
        logger.warning("JWT verification failed: %s", e)
        return None
    except Exception as e:
        logger.exception("Unexpected error during token verification: %s", e)
        return None
