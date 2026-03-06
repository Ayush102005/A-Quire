"""
services/ses.py — Transactional + progress emails via Amazon SES.
"""
import boto3
import logging
import os
from datetime import datetime

logger = logging.getLogger("aquire.ses")

_SES_CLIENT = None


def _get_client():
    global _SES_CLIENT
    if _SES_CLIENT is None:
        _SES_CLIENT = boto3.client(
            "ses",
            region_name=os.environ.get("SES_REGION", os.environ.get("AWS_REGION", "ap-south-1")),
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
    return _SES_CLIENT


def _send(to_email: str, subject: str, html: str, text: str) -> bool:
    from_email = os.environ.get("SES_FROM_EMAIL", "kiro@a-quire.in")
    try:
        ses = _get_client()
        ses.send_email(
            Source=from_email,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject},
                "Body": {
                    "Html": {"Data": html, "Charset": "UTF-8"},
                    "Text": {"Data": text, "Charset": "UTF-8"},
                },
            },
        )
        logger.info("Email sent to %s | %s", to_email, subject)
        return True
    except Exception as e:
        logger.error("SES send error: %s", e)
        return False


# ── Welcome Email ─────────────────────────────────────────────────────────────

def send_welcome_email(student_email: str, student_name: str) -> bool:
    html = f"""
    <html><body style="font-family:'Segoe UI',sans-serif;background:#0A0A0A;color:#F0F0F0;padding:32px;">
      <div style="max-width:560px;margin:auto;background:#111;border-radius:16px;padding:32px;border:1px solid #2A2A2A;">
        <h1 style="color:#FFD700;margin:0 0 8px 0;">Welcome to A-Quire! 🚀</h1>
        <p style="font-size:18px;">Hey <strong>{student_name}</strong>! 👋</p>
        <p style="color:#C0C0C0;">Tumhara personalised AI mentor <strong>Kiro</strong> tayaar hai tumhare saath padhne ke liye.</p>
        <ul style="color:#D4D4D4;line-height:2;">
          <li>🗺️ Personalised roadmap — sirf tumhare liye</li>
          <li>🤖 Kiro tumhe real-time help karega</li>
          <li>📈 Progress track karo everyday</li>
        </ul>
        <a href="{os.environ.get('APP_URL', 'https://a-quire.in')}/dashboard"
           style="display:inline-block;margin-top:24px;padding:12px 28px;
                  background:linear-gradient(135deg,#FFD700,#FF6A00);
                  color:#0D0D0D;font-weight:700;border-radius:8px;text-decoration:none;">
          Dashboard kholo →
        </a>
        <p style="margin-top:32px;color:#444;font-size:12px;">A-Quire · AI for Bharat 2026</p>
      </div>
    </body></html>
    """
    app_url = os.environ.get('APP_URL', 'https://a-quire.in')
    text = f"Welcome to A-Quire, {student_name}!\nKiro AI is ready. Visit: {app_url}/dashboard"
    return _send(student_email, "🎉 A-Quire mein Swagat Hai! — Kiro", html, text)


# ── Milestone Email ───────────────────────────────────────────────────────────

def send_milestone_email(student_email: str, student_name: str, track_title: str) -> bool:
    html = f"""
    <html><body style="font-family:'Segoe UI',sans-serif;background:#0A0A0A;color:#F0F0F0;padding:32px;">
      <div style="max-width:560px;margin:auto;background:#111;border-radius:16px;padding:32px;border:1px solid #2A2A2A;">
        <h1 style="color:#FFD700;margin:0 0 8px 0;">Track Complete! 🎯</h1>
        <p style="font-size:18px;">Wah <strong>{student_name}</strong>! Kamaal kar diya! 🔥</p>
        <p style="color:#C0C0C0;">
          Tumne <strong style="color:#FFD700;">{track_title}</strong> ka poora roadmap complete kar liya!
          Yeh ek bada milestone hai — Kiro ko tumpar garv hai.
        </p>
        <div style="margin-top:24px;padding:16px;background:#1A1A1A;border-radius:8px;border-left:3px solid #FFD700;">
          <p style="margin:0;color:#FFD700;font-style:italic;">
            "Ek track complete hua — ab agli challenge ke liye tayaar ho jao!" — Kiro 🤖
          </p>
        </div>
        <a href="{os.environ.get('APP_URL', 'https://a-quire.in')}/dashboard"
           style="display:inline-block;margin-top:24px;padding:12px 28px;
                  background:linear-gradient(135deg,#FFD700,#FF6A00);
                  color:#0D0D0D;font-weight:700;border-radius:8px;text-decoration:none;">
          Next track dekho →
        </a>
        <p style="margin-top:32px;color:#444;font-size:12px;">A-Quire · AI for Bharat 2026</p>
      </div>
    </body></html>
    """
    text = f"Congratulations {student_name}! You completed {track_title} on A-Quire!"
    return _send(student_email, f"🎯 {track_title} Complete! — Kiro | A-Quire", html, text)


# ── Weekly Progress Email ─────────────────────────────────────────────────────

def send_progress_email(
    student_email: str,
    student_name: str,
    completed_topics: list,
    confusion_events: int,
    course_name: str = "DSA",
) -> bool:
    week = datetime.utcnow().strftime("%B %d, %Y")
    topics_html = "".join(
        f"<li style='margin:4px 0;'>✅ {t}</li>" for t in completed_topics
    ) or "<li>Koi topic complete nahi hua is hafte 😅</li>"

    html = f"""
    <html><body style="font-family:'Segoe UI',sans-serif;background:#0A0A0A;color:#F0F0F0;padding:32px;">
      <div style="max-width:560px;margin:auto;background:#111;border-radius:16px;padding:32px;border:1px solid #2A2A2A;">
        <h1 style="color:#FFD700;margin:0 0 8px 0;">Kiro ka Weekly Report 📊</h1>
        <p style="color:#777;margin:0 0 24px 0;">Week ending {week}</p>
        <p style="font-size:18px;">Hey <strong>{student_name}</strong>! 👋</p>
        <p>Is hafte tumne <strong>{course_name}</strong> mein bahut accha kaam kiya!</p>
        <h3 style="color:#FFD700;">Topics Completed ({len(completed_topics)})</h3>
        <ul style="color:#D4D4D4;line-height:1.8;">{topics_html}</ul>
        <h3 style="color:#F59E0B;">Kiro ki Madad ({confusion_events} baar)</h3>
        <p style="color:#D4D4D4;">
          {'Bahut zyada confuse ho rahe the — thoda break lo!' if confusion_events > 5 else 'Great focus! Keep it up 🎯'}
        </p>
        <div style="margin-top:32px;padding:16px;background:#1A1A1A;border-radius:8px;border-left:3px solid #FFD700;">
          <p style="margin:0;color:#FFD700;font-style:italic;">"Consistency hi success ki key hai!" — Kiro 🤖</p>
        </div>
        <p style="margin-top:24px;color:#555;font-size:12px;">A-Quire · AI for Bharat 2026</p>
      </div>
    </body></html>
    """
    text = (
        f"Kiro ka Weekly Report — {week}\n"
        f"Hey {student_name}!\n"
        f"Topics completed: {len(completed_topics)}\n"
        f"Kiro interventions: {confusion_events}\n\n"
        f"Keep learning! — Kiro"
    )
    return _send(student_email, f"📚 Tumhara Weekly Progress — {course_name} | A-Quire", html, text)
