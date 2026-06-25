"""
Email service for A-Quire.

Sends transactional emails (verification, password reset) via AWS SES.
Falls back to console logging when AWS credentials are absent — so local
development works without real email delivery.

Usage:
    from app.services.email_service import email_service
    await email_service.send_verification_email(to="user@example.com", token="abc123")
"""
from __future__ import annotations

import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from string import Template

from app.core.config import settings

logger = logging.getLogger(__name__)

_email_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ses")

# ── HTML email templates ───────────────────────────────────────────────────────

_VERIFICATION_HTML = Template("""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Verify your A-Quire email</title></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:40px 20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
    <div style="width:32px;height:32px;border-radius:8px;background:#0d7561;color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center">A</div>
    <span style="font-weight:600;font-size:18px;color:#1c1917">A-Quire</span>
  </div>
  <h1 style="font-size:22px;font-weight:600;color:#1c1917;margin:0 0 8px">Verify your email address</h1>
  <p style="font-size:14px;color:#78716c;line-height:1.6;margin:0 0 28px">
    Hi $full_name,<br><br>
    Click the button below to verify your email and activate your A-Quire account.
    This link expires in <strong>24 hours</strong>.
  </p>
  <a href="$verify_url"
     style="display:inline-block;background:#0d7561;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px">
    Verify Email Address
  </a>
  <p style="font-size:12px;color:#a8a29e;line-height:1.6;margin:0 0 4px">
    Or paste this link into your browser:<br>
    <span style="color:#0d7561;word-break:break-all">$verify_url</span>
  </p>
  <hr style="border:none;border-top:1px solid #f5f5f4;margin:28px 0">
  <p style="font-size:11px;color:#a8a29e;margin:0">
    If you did not create an A-Quire account, ignore this email — no action needed.
  </p>
</div>
</body></html>
""")

_RESET_HTML = Template("""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Reset your A-Quire password</title></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f5;margin:0;padding:40px 20px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
    <div style="width:32px;height:32px;border-radius:8px;background:#0d7561;color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center">A</div>
    <span style="font-weight:600;font-size:18px;color:#1c1917">A-Quire</span>
  </div>
  <h1 style="font-size:22px;font-weight:600;color:#1c1917;margin:0 0 8px">Reset your password</h1>
  <p style="font-size:14px;color:#78716c;line-height:1.6;margin:0 0 28px">
    Hi $full_name,<br><br>
    We received a request to reset your A-Quire password.
    Click below to choose a new password — this link expires in <strong>1 hour</strong> and can only be used once.
  </p>
  <a href="$reset_url"
     style="display:inline-block;background:#0d7561;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:28px">
    Reset Password
  </a>
  <p style="font-size:12px;color:#a8a29e;line-height:1.6;margin:0 0 4px">
    Or paste this link into your browser:<br>
    <span style="color:#0d7561;word-break:break-all">$reset_url</span>
  </p>
  <hr style="border:none;border-top:1px solid #f5f5f4;margin:28px 0">
  <p style="font-size:11px;color:#a8a29e;margin:0">
    If you did not request a password reset, you can safely ignore this email.
    Your password will not be changed.
  </p>
</div>
</body></html>
""")


# ── SES sender (synchronous — runs in thread pool) ─────────────────────────────

def _send_via_ses(to: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Send an email via AWS SES.
    Returns True on success, False on any error.
    Logs the email to console when AWS credentials are absent (dev mode).
    """
    import boto3
    import botocore

    sender = settings.SES_SENDER_EMAIL

    if not sender:
        # Dev fallback: log to console instead of sending
        logger.info(
            f"[EMAIL DEV] To={to} | Subject={subject}\n"
            f"Body (text): {text_body[:300]}"
        )
        return True

    try:
        client = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
        client.send_email(
            Source=sender,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                },
            },
        )
        logger.info(f"SES email sent: to={to} subject={subject}")
        return True
    except botocore.exceptions.NoCredentialsError:
        logger.warning(f"[EMAIL DEV] No AWS creds — logging email to={to}: {subject}")
        logger.info(text_body[:500])
        return True  # Return True so callers don't treat missing creds as failure
    except Exception as exc:
        logger.error(f"SES send failed to={to}: {exc}")
        return False


# ── High-level async API ───────────────────────────────────────────────────────

class EmailService:
    """Async email service wrapping AWS SES via a thread pool executor."""

    async def send_verification_email(
        self, to: str, full_name: str, token: str
    ) -> bool:
        """Send an email verification link."""
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        verify_url = f"{frontend_url}/verify-email?token={token}"

        html = _VERIFICATION_HTML.substitute(full_name=full_name, verify_url=verify_url)
        text = (
            f"Hi {full_name},\n\n"
            f"Verify your A-Quire email by visiting:\n{verify_url}\n\n"
            "This link expires in 24 hours.\n\n"
            "If you did not create an account, ignore this email."
        )

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _email_executor,
            _send_via_ses,
            to,
            "Verify your A-Quire email address",
            html,
            text,
        )

    async def send_password_reset_email(
        self, to: str, full_name: str, token: str
    ) -> bool:
        """Send a one-time password reset link."""
        frontend_url = settings.FRONTEND_URL.rstrip("/")
        reset_url = f"{frontend_url}/reset-password?token={token}"

        html = _RESET_HTML.substitute(full_name=full_name, reset_url=reset_url)
        text = (
            f"Hi {full_name},\n\n"
            f"Reset your A-Quire password by visiting:\n{reset_url}\n\n"
            "This link expires in 1 hour and can only be used once.\n\n"
            "If you did not request a password reset, ignore this email."
        )

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _email_executor,
            _send_via_ses,
            to,
            "Reset your A-Quire password",
            html,
            text,
        )


# Singleton — import and use directly
email_service = EmailService()
