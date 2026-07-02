from __future__ import annotations

import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import CommunicationLog
from .providers import send_email as send_email_provider
from .providers import send_sms as send_sms_provider

logger = logging.getLogger(__name__)


TEMPLATE_FIELDS = ("name", "email", "phone")


def render_template(text: str, customer) -> str:
    """Simple token substitution: {name} / {email} / {phone}.

    Unknown tokens are left as-is so a typo doesn't get silently swallowed.
    """
    if not text or "{" not in text:
        return text
    return text.format_map(_SafeFormat({
        "name": customer.full_name or "",
        "email": customer.email or "",
        "phone": customer.phone or "",
    }))


class _SafeFormat(dict):
    def __missing__(self, key):
        return "{" + key + "}"


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_comms_log(self, log_id):
    """Deliver a single queued CommunicationLog row and update its status.

    Mirrors the retry/backoff shape of the notifications.send_*_notification tasks.
    """
    try:
        with transaction.atomic():
            log = CommunicationLog.objects.select_for_update().select_related("customer").get(id=log_id)
            customer = log.customer
            if log.channel == CommunicationLog.CHANNEL_SMS:
                target = (customer.phone or "").strip()
                target_kind = "phone"
            elif log.channel == CommunicationLog.CHANNEL_EMAIL:
                target = (customer.email or "").strip()
                target_kind = "email"
            else:
                log.status = CommunicationLog.STATUS_FAILED
                log.error = f"unsupported channel {log.channel}"
                log.save(update_fields=["status", "error", "updated_at"])
                return
            if not target:
                log.status = CommunicationLog.STATUS_FAILED
                log.error = f"no {target_kind}"
                log.save(update_fields=["status", "error", "updated_at"])
                return

        if log.channel == CommunicationLog.CHANNEL_SMS:
            result = send_sms_provider(target, log.message)
        else:
            result = send_email_provider(target, log.subject or "Notice", log.message)

        ok = result.get("status") in {"sent", "logged"}
        log.status = CommunicationLog.STATUS_SENT if ok else CommunicationLog.STATUS_FAILED
        log.sent_at = timezone.now() if ok else None
        log.error = result.get("error", "")
        log.save(update_fields=["status", "sent_at", "error", "updated_at"])
    except Exception as exc:
        logger.exception("send_comms_log failed: %s", exc)
        countdown = (60, 300, 1800)[min(self.request.retries, 2)]
        raise self.retry(exc=exc, countdown=countdown)
