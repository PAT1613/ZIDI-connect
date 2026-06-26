from __future__ import annotations

from django.apps import apps
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.common.middleware import get_current_ip, get_current_user

TRACKED_LABELS = {
    "customers", "services", "subscriptions",
    "invoicing", "escalations", "accounts",
}

# Audit-app should not log itself; communications/notifications are high-volume
# transactional logs already tracked in their own tables.
EXCLUDED_MODELS = {
    "audit.AuditLog",
    "common.CodeCounter",
    "notifications.Notification",
    "communications.CommunicationLog",
    "auth.Permission",
    "auth.Group",
    "contenttypes.ContentType",
    "sessions.Session",
    "admin.LogEntry",
}


def _label(sender) -> str:
    return f"{sender._meta.app_label}.{sender.__name__}"


def _should_track(sender) -> bool:
    if sender._meta.app_label not in TRACKED_LABELS:
        return False
    if _label(sender) in EXCLUDED_MODELS:
        return False
    return True


def _create_entry(*, sender, instance, action: str) -> None:
    AuditLog = apps.get_model("audit", "AuditLog")
    user = get_current_user()
    AuditLog.objects.create(
        user=user,
        action=action,
        module=sender._meta.app_label,
        object_repr=str(instance)[:200],
        object_id=str(getattr(instance, "pk", ""))[:64],
        ip_address=get_current_ip(),
    )


@receiver(post_save)
def _audit_post_save(sender, instance, created, **kwargs):
    if not _should_track(sender):
        return
    _create_entry(
        sender=sender,
        instance=instance,
        action="create" if created else "update",
    )


@receiver(post_delete)
def _audit_post_delete(sender, instance, **kwargs):
    if not _should_track(sender):
        return
    _create_entry(sender=sender, instance=instance, action="delete")
