"""Pluggable transport adapters for SMS and email.

Both providers resolve credentials at call-time from IntegrationSetting (DB)
with .env as fallback — admins can rotate keys from the Settings UI without
restarting the workers.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Iterable

from .config import get_bool, get_int, get_setting

logger = logging.getLogger(__name__)


def send_sms(phone: str, message: str, sender_id: str | None = None) -> dict:
    """Send a single SMS via Africa's Talking. Returns provider response dict."""
    username = get_setting("AT_USERNAME", "sandbox")
    api_key = get_setting("AT_API_KEY", "")
    default_sender = get_setting("AT_SENDER_ID", "ZIDI")

    if not api_key:
        logger.warning("AT_API_KEY missing — logging SMS instead of sending: to=%s", phone)
        return {"status": "logged", "provider_message_id": None}

    try:
        import africastalking
    except ImportError as exc:  # pragma: no cover
        logger.error("africastalking SDK missing: %s", exc)
        return {"status": "failed", "error": str(exc), "provider_message_id": None}

    try:
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        response = sms.send(message, [phone], sender_id=sender_id or default_sender)
    except Exception as exc:
        logger.exception("Africa's Talking send failed")
        return {"status": "failed", "error": str(exc), "provider_message_id": None}

    recipients = (response or {}).get("SMSMessageData", {}).get("Recipients", [])
    if not recipients:
        return {"status": "failed", "error": "no recipients", "provider_message_id": None}
    item = recipients[0]
    delivery = (item.get("status") or "").lower()
    success = delivery in {"success", "sent"}
    return {
        "status": "sent" if success else "failed",
        "provider_message_id": item.get("messageId"),
        "error": "" if success else item.get("status", ""),
    }


def send_email(
    to: str | Iterable[str],
    subject: str,
    body: str,
    html: str | None = None,
) -> dict:
    """Send via SMTP using DB-resolved credentials (with .env fallback)."""
    recipients = [to] if isinstance(to, str) else list(to)
    if not recipients:
        return {"status": "failed", "error": "no recipients", "provider_message_id": None}

    host = get_setting("EMAIL_HOST", "smtp.gmail.com")
    port = get_int("EMAIL_PORT", 587)
    user = get_setting("EMAIL_HOST_USER", "")
    password = get_setting("EMAIL_HOST_PASSWORD", "")
    use_tls = get_bool("EMAIL_USE_TLS", True)
    from_email = get_setting("DEFAULT_FROM_EMAIL", "ZIDI Connect <noreply@zidi.local>")

    if not (user and password):
        logger.warning("EMAIL_HOST_USER / EMAIL_HOST_PASSWORD missing — logging email instead")
        return {"status": "logged", "provider_message_id": None}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(body, "plain", "utf-8"))
    if html:
        msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=20)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
            if use_tls:
                server.starttls()
        with server:
            server.login(user, password)
            server.sendmail(_extract_addr(from_email), recipients, msg.as_string())
    except Exception as exc:
        logger.exception("SMTP send failed")
        return {"status": "failed", "error": str(exc), "provider_message_id": None}

    return {"status": "sent", "provider_message_id": None}


def _extract_addr(value: str) -> str:
    if "<" in value and ">" in value:
        return value.split("<", 1)[1].rstrip(">").strip()
    return value.strip()
