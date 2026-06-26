from __future__ import annotations

from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel


class Escalation(BaseModel):
    STATUS_OPEN = "open"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_RESOLVED = "resolved"
    STATUS_CLOSED = "closed"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_CLOSED, "Closed"),
    )

    customer_service = models.ForeignKey(
        "subscriptions.CustomerService", on_delete=models.PROTECT,
        related_name="escalations",
    )
    assigned_to = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="escalations",
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)
    opened_at = models.DateTimeField(default=timezone.now)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    reason = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ("-opened_at",)
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"Escalation #{self.id} ({self.status})"
