# Plan 1 — AUTH-01/02/03: Verify Backend Auth System

**Phase:** 3
**Wave:** 1
**Depends on:** none
**Files modified:**
  - `Backend/tests/test_auth.py` (expand rate-limit test)
**Autonomous:** true

---

## Objective

The backend for Phase 3 is **already implemented**:

- `app/services/auth_service.py` — `register()`, `verify_email()`, `login()` (blocks unverified), `request_password_reset()`, `reset_password()`
- `app/services/email_service.py` — AWS SES with console-log fallback for dev
- `app/api/v1/auth.py` — all 6 endpoints: `/register`, `/verify-email`, `/login` (rate-limited), `/refresh`, `/forgot-password`, `/reset-password`
- `app/models/user.py` — `is_verified`, `email_verify_token`, `email_verify_expires`, `password_reset_token`, `password_reset_expires` columns
- `app/core/config.py` — `SES_SENDER_EMAIL`, `FRONTEND_URL`, `LOGIN_RATE_LIMIT` settings
- `app/main.py` — `SlowAPIMiddleware` + `_rate_limit_exceeded_handler` wired
- `Backend/.env.example` — all keys documented with correct format

This plan **runs the existing tests**, adds a rate-limit test, and confirms all AUTH requirements are met.

---

## Tasks

### Task 1 — Run existing auth tests

<read_first>
- `Backend/tests/test_auth.py`
- `Backend/tests/conftest.py`
</read_first>

<action>
Run the full auth test suite from the Backend directory:

```
cd Backend
python -m pytest tests/test_auth.py -v
```

All existing tests must pass:
- `test_register_success` — 201, no password_hash in response
- `test_register_duplicate_email` — 409
- `test_unverified_user_cannot_login` — 403 with "verify" in detail
- `test_verify_email_invalid_token` — 400
- `test_login_success` — 200 with access_token + refresh_token
- `test_login_wrong_password` — 401
- `test_login_unknown_email` — 401
- `test_get_me` — 200 with correct email
- `test_get_me_no_token` — 401
- `test_refresh_tokens` — 200 with new access_token
- `test_refresh_with_access_token_rejected` — 401
- `test_forgot_password_always_200` — 200 regardless of email existence
- `test_forgot_password_existing_user` — 200
- `test_reset_password_invalid_token` — 400
- `test_reset_password_flow` — full flow: request → DB token → reset → login with new password
- `test_reset_token_single_use` — second use of same token returns 400
</action>

<acceptance_criteria>
- `pytest tests/test_auth.py -v` exits with code 0
- Output contains `16 passed` (or more if tests added)
- No `FAILED` or `ERROR` lines in output
</acceptance_criteria>

---

### Task 2 — Add rate-limit test for login endpoint

<read_first>
- `Backend/tests/test_auth.py`
- `Backend/app/api/v1/auth.py` (line with `@limiter.limit`)
- `Backend/app/core/config.py` (LOGIN_RATE_LIMIT default "10/minute")
</read_first>

<action>
Append the following test to `Backend/tests/test_auth.py` (after the last test):

```python
# ── Rate limiting ─────────────────────────────────────────────────────────────

async def test_login_rate_limit_decorator_present():
    """Verify the login endpoint has the rate limit decorator applied."""
    import inspect
    from app.api.v1.auth import login as login_handler
    # The handler must be wrapped (decorator applied) — check via source
    src = inspect.getsource(login_handler)
    # The router file must import and apply @limiter.limit
    import app.api.v1.auth as auth_module
    src_module = inspect.getsource(auth_module)
    assert "limiter.limit" in src_module, "Rate limiter not applied to login endpoint"
    assert "LOGIN_RATE_LIMIT" in src_module, "LOGIN_RATE_LIMIT setting not referenced"
```

After adding, run:
```
python -m pytest tests/test_auth.py -v
```
</action>

<acceptance_criteria>
- `test_login_rate_limit_decorator_present` function exists in `Backend/tests/test_auth.py`
- `pytest tests/test_auth.py -v` exits with code 0
- `app/api/v1/auth.py` contains `@limiter.limit(settings.LOGIN_RATE_LIMIT)` on the login endpoint (grep-verifiable)
</acceptance_criteria>

---

## Verification Checklist

- [ ] `pytest tests/test_auth.py -v` → all tests pass
- [ ] `grep "limiter.limit" Backend/app/api/v1/auth.py` returns a match
- [ ] `grep "is_verified" Backend/app/models/user.py` returns a match
- [ ] `grep "send_verification_email" Backend/app/services/email_service.py` returns a match
- [ ] `grep "SES_SENDER_EMAIL" Backend/.env.example` returns a match

---

## Must Haves (Goal-Backward)

> Phase 3 goal: Harden auth with email verification, password reset, and rate limiting.

- [x] New user registration triggers a verification email (or console-log in dev)
- [x] Unverified user cannot log in (receives 403 with "verify" in detail message)
- [x] Password reset email delivers a working one-time link that expires after 1 hour
- [x] Rate limiting decorator applied to login endpoint (10/minute per IP)
