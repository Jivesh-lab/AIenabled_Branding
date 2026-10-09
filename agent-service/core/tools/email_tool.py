"""
core/tools/email_tool.py
─────────────────────────
Async SMTP email tool using aiosmtplib.
"""

from __future__ import annotations

import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
import structlog
from langchain_core.tools import tool

logger = structlog.get_logger(__name__)


@tool
async def send_email(
    to_address: str,
    subject: str,
    body_html: str,
    body_text: str = "",
) -> str:
    """
    Send an email notification via SMTP.
    Used by agents to notify mentors, students, and admins.

    Returns JSON with success status.
    """
    from config import get_settings
    settings = get_settings()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_address

    if body_text:
        msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("email_sent", to=to_address, subject=subject)
        return json.dumps({"success": True, "to": to_address})
    except Exception as exc:
        logger.error("email_failed", to=to_address, error=str(exc))
        return json.dumps({"success": False, "error": str(exc)})


@tool
async def send_notification_email(
    to_address: str,
    recipient_name: str,
    notification_type: str,
    context: dict,
) -> str:
    """
    Send a templated notification email.
    notification_type: 'application_approved' | 'mentor_assigned' | 'meeting_scheduled'
                       | 'milestone_due' | 'readiness_score_updated'
    """
    templates = {
        "application_approved": (
            "🎉 Application Approved — {startup}",
            "<h2>Congratulations!</h2><p>Dear {name}, your application for <b>{startup}</b> has been approved for incubation.</p>",
        ),
        "mentor_assigned": (
            "👥 Mentor Assigned — {mentor}",
            "<h2>Mentor Assigned</h2><p>Dear {name}, <b>{mentor}</b> has been assigned as your mentor.</p>",
        ),
        "meeting_scheduled": (
            "📅 Meeting Scheduled — {date}",
            "<h2>Meeting Scheduled</h2><p>Dear {name}, a meeting has been scheduled for <b>{date}</b>.</p>",
        ),
        "milestone_due": (
            "⏰ Milestone Due — {milestone}",
            "<h2>Milestone Reminder</h2><p>Dear {name}, the milestone <b>{milestone}</b> is due on <b>{due_date}</b>.</p>",
        ),
        "readiness_score_updated": (
            "📊 Startup Readiness Score Updated — {score}/100",
            "<h2>Readiness Score Updated</h2><p>Dear {name}, your startup readiness score has been updated to <b>{score}/100</b>.</p>",
        ),
    }

    template = templates.get(notification_type)
    if not template:
        return json.dumps({"error": f"Unknown notification_type: {notification_type}"})

    ctx = {"name": recipient_name, **context}
    subject = template[0].format(**ctx)
    body_html = template[1].format(**ctx)

    return await send_email.ainvoke({
        "to_address": to_address,
        "subject": subject,
        "body_html": body_html,
    })
