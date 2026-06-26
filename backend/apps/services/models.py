from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel
from apps.common.utils import generate_code


class Service(BaseModel):
    BILLING_MONTHLY = "monthly"
    BILLING_QUARTERLY = "quarterly"
    BILLING_ANNUAL = "annual"
    BILLING_ONEOFF = "one-off"
    BILLING_CHOICES = (
        (BILLING_MONTHLY, "Monthly"),
        (BILLING_QUARTERLY, "Quarterly"),
        (BILLING_ANNUAL, "Annual"),
        (BILLING_ONEOFF, "One-off"),
    )

    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
    )

    service_code = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    sla_days = models.PositiveIntegerField(default=30)
    billing_cycle = models.CharField(max_length=12, choices=BILLING_CHOICES, default=BILLING_MONTHLY)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["billing_cycle"]),
        ]

    def __str__(self) -> str:
        return f"{self.service_code} — {self.name}"

    def save(self, *args, **kwargs):
        if not self.service_code:
            self.service_code = generate_code("SVC")
        super().save(*args, **kwargs)

    @property
    def cycle_days(self) -> int:
        return {
            self.BILLING_MONTHLY: 30,
            self.BILLING_QUARTERLY: 90,
            self.BILLING_ANNUAL: 365,
            self.BILLING_ONEOFF: 0,
        }.get(self.billing_cycle, self.sla_days)
