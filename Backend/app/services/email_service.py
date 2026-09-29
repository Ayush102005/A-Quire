"""
app/services/email_service.py
──────────────────────────────
Transactional email delivery via AWS SES.

Falls back to logging the email content when SES isn't configured
(SES_SENDER_EMAIL unset) — matches the dev-mode behavior already documented
for SES_SENDER_EMAIL in app/core/config.py ("leave blank in dev — emails
log to console").
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body_text: str) -> bool:
    """
    Send a transactional email via AWS SES.

    Returns True if actually sent, False if it fell back to logging
    (SES not configured, or the send itself failed).
    """
    if not settings.SES_SENDER_EMAIL:
        logger.info("[email:dev-mode] To: %s | Subject: %s\n%s", to, subject, body_text)
        return False

    try:
        import boto3

        client = boto3.client(
            "ses",
            region_name=settings.AWS_REGION_NAME,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
        client.send_email(
            Source=settings.SES_SENDER_EMAIL,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body_text}},
            },
        )
        return True
    except Exception as exc:
        logger.error("SES send_email failed (to=%s, subject=%r): %s", to, subject, exc)
        logger.info("[email:fallback] To: %s | Subject: %s\n%s", to, subject, body_text)
        return False
