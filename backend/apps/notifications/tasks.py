from __future__ import annotations

import logging
from datetime import date

from celery import shared_task
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.models import User
from apps.communications.config import get_json
from apps.communications.providers import send_email as send_email_provider
from apps.communications.providers import send_sms as send_sms_provider
from apps.escalations.models import Escalation
from apps.subscriptions.models import CustomerService

from .models import DeviceToken, Notification
from .push import push_to_tokens
from .templates import render_reminder

logger = logging.getLogger(__name__)

# Default reminder intervals when no IntegrationSetting override exists.
DEFAULT_REMINDER_DAYS = (14, 7, 3)


def get_reminder_days() -> tuple[int, ...]:
    """Read reminder intervals from IntegrationSetting.REMINDER_DAYS at runtime.

    Falls back to DEFAULT_REMINDER_DAYS if unset, malformed, or invalid.
    """
    raw = get_json("REMINDER_DAYS", None)
    if not isinstance(raw, list) or not raw:
        return DEFAULT_REMINDER_DAYS
    cleaned = tuple(n for n in raw if isinstance(n, int) and n > 0)
    return cleaned or DEFAULT_REMINDER_DAYS


def _interval_key_for(days_left: int) -> str:
    if days_left > 0:
        return f"due_in_{days_left}"
    return "overdue"


def _round_robin_cs_officer() -> User | None:
    qs = (
        User.objects.filter(is_active=True, role__name="Customer Service Officer")
        .annotate(open_count=Count("escalations", filter=Q(escalations__status__in=["open", "in_progress"])))
        .order_by("open_count", "id")
    )
    return qs.first()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_sms_notification(self, notification_id):
    try:
        with transaction.atomic():
            notif = Notification.objects.select_for_update().get(id=notification_id)
            customer = notif.customer
            if not customer or not customer.phone:
                notif.status = Notification.STATUS_FAILED
                notif.delivery_status = "no phone"
                notif.save(update_fields=["status", "delivery_status", "updated_at"])
                return
        result = send_sms_provider(customer.phone, notif.message)
        notif.status = (
            Notification.STATUS_SENT
            if result.get("status") in {"sent", "logged"}
            else Notification.STATUS_FAILED
        )
        notif.provider_message_id = result.get("provider_message_id") or ""
        notif.delivery_status = result.get("status") or ""
        notif.sent_at = timezone.now() if notif.status == Notification.STATUS_SENT else None
        notif.save(update_fields=[
            "status", "provider_message_id", "delivery_status", "sent_at", "updated_at",
        ])
    except Exception as exc:
        logger.exception("send_sms_notification failed: %s", exc)
        countdown = (60, 300, 1800)[min(self.request.retries, 2)]
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_expo_push(self, user_id: str, title: str, body: str, data: dict | None = None):
    """Fan-out Expo push to every DeviceToken registered by ``user_id``.

    Best-effort — if the user has no tokens registered we no-op. Tokens Expo
    reports as ``DeviceNotRegistered`` are removed so we don't keep hitting
    dead installs.
    """
    try:
        tokens = list(
            DeviceToken.objects.filter(user_id=user_id).values_list("expo_push_token", flat=True)
        )
        if not tokens:
            return {"sent": 0, "reason": "no tokens"}
        result = push_to_tokens(tokens, title=title, body=body, data=data)

        # Prune dead tokens.
        tickets = result.get("response") or []
        dead = []
        for token, ticket in zip(tokens, tickets):
            if not isinstance(ticket, dict):
                continue
            details = ticket.get("details") or {}
            if details.get("error") == "DeviceNotRegistered":
                dead.append(token)
        if dead:
            DeviceToken.objects.filter(expo_push_token__in=dead).delete()
            result["pruned"] = len(dead)
        return result
    except Exception as exc:
        logger.exception("send_expo_push failed: %s", exc)
        countdown = (60, 300, 1800)[min(self.request.retries, 2)]
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_notification(self, notification_id):
    try:
        notif = Notification.objects.get(id=notification_id)
        customer = notif.customer
        if not customer or not customer.email:
            notif.status = Notification.STATUS_FAILED
            notif.delivery_status = "no email"
            notif.save(update_fields=["status", "delivery_status", "updated_at"])
            return
        result = send_email_provider(customer.email, notif.subject or "Notice", notif.message)
        ok = result.get("status") == "sent"
        notif.status = Notification.STATUS_SENT if ok else Notification.STATUS_FAILED
        notif.delivery_status = result.get("status") or ""
        notif.sent_at = timezone.now() if ok else None
        notif.save(update_fields=["status", "delivery_status", "sent_at", "updated_at"])
    except Exception as exc:
        logger.exception("send_email_notification failed: %s", exc)
        countdown = (60, 300, 1800)[min(self.request.retries, 2)]
        raise self.retry(exc=exc, countdown=countdown)


def _queue_reminder(subscription: CustomerService, interval_marker: int) -> None:
    """Queue reminder notifications for a subscription.

    ``interval_marker``: positive int = the reminder threshold that triggered this
    (e.g. 14 for the "14-day-out" reminder); <=0 = an "overdue" reminder.

    The interval marker sets the dedup key so each threshold fires at most once.
    The message text uses the *actual* days-left so a delayed run still tells the
    truth ("due in 5 days") rather than the threshold label ("due in 14 days").
    """
    today = date.today()
    actual_days_left = (subscription.due_date - today).days
    key = _interval_key_for(interval_marker)
    subject, body = render_reminder(
        subscription.customer,
        subscription.service,
        subscription.due_date,
        subscription.service.price,
        actual_days_left,
    )

    for channel in subscription.customer.notification_channels():
        if Notification.objects.filter(
            customer_service=subscription, interval_key=key, channel=channel,
        ).exists():
            continue
        notif = Notification.objects.create(
            customer=subscription.customer,
            customer_service=subscription,
            channel=channel,
            subject=subject,
            message=body,
            interval_key=key,
            status=Notification.STATUS_QUEUED if channel != Notification.CHANNEL_IN_APP else Notification.STATUS_SENT,
            sent_at=timezone.now() if channel == Notification.CHANNEL_IN_APP else None,
        )
        if channel == Notification.CHANNEL_SMS:
            send_sms_notification.delay(str(notif.id))
        elif channel == Notification.CHANNEL_EMAIL:
            send_email_notification.delay(str(notif.id))


@shared_task
def scan_due_subscriptions():
    """Hourly Celery Beat task: queues reminders + handles expiries/escalations.

    Self-healing: for each configured interval ``n`` (sorted largest → smallest),
    a reminder is due when ``due_date <= today + n days`` **and** we haven't yet
    queued a reminder for that ``(subscription, interval_key, channel)``. The
    existing UniqueConstraint on Notification makes ``_queue_reminder`` idempotent,
    so if the hourly job misses the exact day (deploy window, downtime), the next
    scan still fires the reminder instead of dropping it forever.
    """
    today = date.today()
    reminder_days = tuple(sorted(get_reminder_days(), reverse=True))
    queued = 0
    expired = 0
    escalated = 0

    active = CustomerService.objects.select_related("customer", "service").filter(
        status=CustomerService.STATUS_ACTIVE, due_date__isnull=False,
    )

    for sub in active:
        delta = (sub.due_date - today).days

        if delta < 0:
            # Overdue: expire + queue overdue reminder + open an escalation.
            sub.status = CustomerService.STATUS_EXPIRED
            sub.save(update_fields=["status", "updated_at"])
            expired += 1
            _queue_reminder(sub, delta)

            if not Escalation.objects.filter(
                customer_service=sub,
                status__in=[Escalation.STATUS_OPEN, Escalation.STATUS_IN_PROGRESS],
            ).exists():
                assignee = _round_robin_cs_officer()
                Escalation.objects.create(
                    customer_service=sub,
                    assigned_to=assignee,
                    reason="Overdue subscription",
                    notes=f"Auto-created — due date was {sub.due_date.isoformat()}",
                )
                escalated += 1
            continue

        # For every threshold whose window we've entered, attempt to queue.
        # `_queue_reminder` no-ops if a Notification for (sub, key, channel)
        # already exists, so re-scans are safe and a skipped run self-heals
        # on the next scan.
        for n in reminder_days:
            if delta <= n:
                _queue_reminder(sub, n)
                queued += 1

    logger.info(
        "scan_due_subscriptions ok queued=%s expired=%s escalated=%s intervals=%s",
        queued, expired, escalated, reminder_days,
    )
    return {"queued": queued, "expired": expired, "escalated": escalated}
