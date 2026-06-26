from __future__ import annotations

from datetime import date, timedelta

from django.db import models

from apps.common.models import BaseModel


def _cycle_length(billing_cycle: str, fallback: int = 30) -> int:
    return {
        "monthly": 30,
        "quarterly": 90,
        "annual": 365,
        "one-off": 0,
    }.get(billing_cycle, fallback)


class CustomerService(BaseModel):
    STATUS_ACTIVE = "active"
    STATUS_SUSPENDED = "suspended"
    STATUS_TERMINATED = "terminated"
    STATUS_EXPIRED = "expired"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_SUSPENDED, "Suspended"),
        (STATUS_TERMINATED, "Terminated"),
        (STATUS_EXPIRED, "Expired"),
    )

    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="subscriptions"
    )
    service = models.ForeignKey(
        "services.Service", on_delete=models.PROTECT, related_name="subscriptions"
    )
    start_date = models.DateField(default=date.today)
    end_date = models.DateField(null=True, blank=True)
    renewal_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    auto_renew = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.customer.full_name} → {self.service.name}"

    def cycle_days(self) -> int:
        return _cycle_length(self.service.billing_cycle, self.service.sla_days)

    def advance_due_date(self) -> None:
        days = self.cycle_days() or self.service.sla_days or 30
        base = self.due_date or date.today()
        self.due_date = base + timedelta(days=days)
        self.renewal_date = self.due_date
        self.status = self.STATUS_ACTIVE
