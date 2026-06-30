from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel, TimeStampedModel


class IntegrationSetting(TimeStampedModel):
    """Singleton-style key/value store for integration credentials.

    DB values take precedence over .env. Allows admins to configure SMS / email
    credentials from the UI without rebuilding the container.
    """

    KEYS = (
        ("AT_USERNAME", "Africa's Talking Username"),
        ("AT_API_KEY", "Africa's Talking API Key"),
        ("AT_SENDER_ID", "Africa's Talking Sender ID"),
        ("EMAIL_HOST", "SMTP Host"),
        ("EMAIL_PORT", "SMTP Port"),
        ("EMAIL_HOST_USER", "SMTP Username"),
        ("EMAIL_HOST_PASSWORD", "SMTP Password"),
        ("EMAIL_USE_TLS", "SMTP Use TLS"),
        ("DEFAULT_FROM_EMAIL", "Default From Email"),
        ("COMPANY_NAME", "Company Name"),
        ("COMPANY_PHONE", "Company Phone"),
        ("COMPANY_EMAIL", "Company Email"),
        ("COMPANY_ADDRESS", "Company Address"),
    )

    SECRET_KEYS = {"AT_API_KEY", "EMAIL_HOST_PASSWORD"}

    key = models.CharField(max_length=64, primary_key=True, choices=KEYS)
    value = models.TextField(blank=True)

    class Meta:
        db_table = "communications_integrationsetting"
        verbose_name = "Integration Setting"
        verbose_name_plural = "Integration Settings"

    def __str__(self) -> str:
        return self.key


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
