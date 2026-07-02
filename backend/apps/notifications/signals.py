"""Push emitters — trigger Expo pushes when the notification engine writes new
in-app rows or when an Escalation is opened.

Registered from ``NotificationsConfig.ready()``.
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.escalations.models import Escalation

from .models import Notification
from .tasks import send_expo_push

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def push_on_in_app_notification(sender, instance: Notification, created: bool, **kwargs):
    """Fire an Expo push when a fresh in-app notification is targeted at a specific user.

    Broadcast notifications (``user=None``) are skipped — pushing every reminder
    to every device would be spammy. The existing SMS/email channels stay as-is.
    """
    if not created or instance.channel != Notification.CHANNEL_IN_APP:
        return
    if not instance.user_id:
        return
    try:
        send_expo_push.delay(
            user_id=str(instance.user_id),
            title=instance.subject or "ZIDI Connect",
            body=(instance.message or "")[:200],
            data={"type": "notification", "notification_id": str(instance.id)},
        )
    except Exception:  # pragma: no cover — never let a push blow up a write
        logger.exception("Failed to queue push for notification %s", instance.id)


@receiver(post_save, sender=Escalation)
def push_on_escalation(sender, instance: Escalation, created: bool, **kwargs):
    """Push to the assigned officer when an escalation is opened.

    Only on create — we don't want a re-notification on every status change.
    Reassignments will re-fire because ``assigned_to`` transitions typically
    happen via ``update()`` which doesn't emit ``post_save`` anyway; if that
    changes, tighten this receiver.
    """
    if not created or not instance.assigned_to_id:
        return
    try:
        send_expo_push.delay(
            user_id=str(instance.assigned_to_id),
            title="New escalation assigned",
            body=(instance.reason or "Overdue subscription follow-up")[:200],
            data={"type": "escalation", "escalation_id": str(instance.id)},
        )
    except Exception:  # pragma: no cover
        logger.exception("Failed to queue push for escalation %s", instance.id)
