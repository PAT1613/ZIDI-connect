from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel
from apps.common.utils import generate_code


class Customer(BaseModel):
    STATUS_ACTIVE = "active"
    STATUS_INACTIVE = "inactive"
    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
    )

    customer_code = models.CharField(max_length=20, unique=True, editable=False)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    national_id = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    registration_date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["full_name"]),
        ]

    def __str__(self) -> str:
        return f"{self.customer_code} — {self.full_name}"

    def save(self, *args, **kwargs):
        if not self.customer_code:
            self.customer_code = generate_code("CUS")
        super().save(*args, **kwargs)
