"""Pluggable transport adapters for SMS and email."""
from __future__ import annotations

import logging
from typing import Iterable

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_sms(phone: str, message: str, sender_id: str | None = None) -> dict:
    """Send a single SMS via Africa's Talking. Returns provider response dict."""
    if not settings.AT_API_KEY:
        logger.warning("AT_API_KEY missing — logging SMS instead of sending: to=%s", phone)
        return {"status": "logged", "provider_message_id": None}

    try:
        import africastalking
    except ImportError as exc:  # pragma: no cover
        logger.error("africastalking SDK missing: %s", exc)
        return {"status": "failed", "error": str(exc), "provider_message_id": None}

    africastalking.initialize(settings.AT_USERNAME, settings.AT_API_KEY)
    sms = africastalking.SMS
    response = sms.send(message, [phone], sender_id=sender_id or settings.AT_SENDER_ID)
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
    recipients = [to] if isinstance(to, str) else list(to)
    msg = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    if html:
        msg.attach_alternative(html, "text/html")
    sent = msg.send(fail_silently=False)
    return {"status": "sent" if sent else "failed", "provider_message_id": None}
