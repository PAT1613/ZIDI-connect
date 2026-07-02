from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel, TimeStampedModel


class DeviceToken(TimeStampedModel):
    """An Expo push token registered by a signed-in user for their device.

    A single ``expo_push_token`` is globally unique (Expo issues one per install),
    so the FK edge is user → token with no compound uniqueness needed. If the same
    device is later used by a different user, ``update_or_create`` bumps the FK.
    """

    PLATFORM_CHOICES = (
        ("ios", "iOS"),
        ("android", "Android"),
        ("web", "Web"),
        ("", "Unknown"),
    )

    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="device_tokens",
    )
    expo_push_token = models.CharField(max_length=200, unique=True)
    platform = models.CharField(max_length=16, choices=PLATFORM_CHOICES, blank=True, default="")

    class Meta:
        db_table = "notifications_devicetoken"
        indexes = [models.Index(fields=["user"])]
        ordering = ("-updated_at",)

    def __str__(self) -> str:
        return f"{self.user_id} · {self.platform or 'device'}"


class Notification(BaseModel):
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

    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="notifications",
        null=True, blank=True,
    )
    customer_service = models.ForeignKey(
        "subscriptions.CustomerService", on_delete=models.PROTECT,
        related_name="notifications", null=True, blank=True,
    )
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE,
        related_name="notifications", null=True, blank=True,
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    subject = models.CharField(max_length=160, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_status = models.CharField(max_length=32, blank=True)
    provider_message_id = models.CharField(max_length=120, blank=True, db_index=True)
    interval_key = models.CharField(max_length=40, blank=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["channel", "status"]),
            models.Index(fields=["user", "read_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["customer_service", "interval_key", "channel"],
                condition=models.Q(interval_key__gt=""),
                name="uniq_subscription_interval_channel",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.channel} → {self.customer_id or self.user_id}"
