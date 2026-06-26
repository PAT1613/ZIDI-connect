from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel
from apps.common.utils import generate_code


class Invoice(BaseModel):
    STATUS_PAID = "paid"
    STATUS_PENDING = "pending"
    STATUS_OVERDUE = "overdue"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = (
        (STATUS_PAID, "Paid"),
        (STATUS_PENDING, "Pending"),
        (STATUS_OVERDUE, "Overdue"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    invoice_number = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey(
        "customers.Customer", on_delete=models.PROTECT, related_name="invoices",
    )
    customer_service = models.ForeignKey(
        "subscriptions.CustomerService",
        on_delete=models.PROTECT, related_name="invoices", null=True, blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    issued_date = models.DateField(default=date.today)
    due_date = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-issued_date", "-created_at")
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self) -> str:
        return self.invoice_number

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = generate_code("INV")
        if not self.total:
            self.total = (self.amount or Decimal("0")) + (self.tax or Decimal("0"))
        if not self.due_date:
            self.due_date = (self.issued_date or date.today()) + timedelta(days=14)
        super().save(*args, **kwargs)


class Payment(BaseModel):
    METHOD_MOBILE_MONEY = "mobile_money"
    METHOD_BANK_TRANSFER = "bank_transfer"
    METHOD_CASH = "cash"
    METHOD_CHOICES = (
        (METHOD_MOBILE_MONEY, "Mobile Money"),
        (METHOD_BANK_TRANSFER, "Bank Transfer"),
        (METHOD_CASH, "Cash"),
    )

    invoice = models.ForeignKey(
        Invoice, on_delete=models.PROTECT, related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    reference = models.CharField(max_length=80, blank=True)
    paid_at = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payments_received",
    )

    class Meta:
        ordering = ("-paid_at",)

    def __str__(self) -> str:
        return f"{self.invoice.invoice_number} → {self.amount}"
