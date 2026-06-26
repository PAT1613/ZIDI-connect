from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel


class CommunicationLog(BaseModel):
    CHANNEL_SMS = "sms"
    CHANNEL_EMAIL = "email"
    CHANNEL_IN_APP = "in_app"
    CHANNEL_CHOICES = (
        (CHANNEL_SMS, "SMS"),
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_IN_APP, "In-App"),
    )

    STATUS_QUEUED = "queued"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_DELIVERED = "delivered"
    STATUS_CHOICES = (
        (STATUS_QUEUED, "Queued"),
        (STATUS_SENT, "Sent"),
        (STATUS_FAILED, "Failed"),
        (STATUS_DELIVERED, "Delivered"),
    )

    sender = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="comms_sent",
    )
    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="comms",
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    subject = models.CharField(max_length=160, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    sent_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["channel", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.channel}:{self.customer_id} ({self.status})"
