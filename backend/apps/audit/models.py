from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel


class AuditLog(BaseModel):
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_CHOICES = (
        (ACTION_CREATE, "Create"),
        (ACTION_UPDATE, "Update"),
        (ACTION_DELETE, "Delete"),
    )

    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=12, choices=ACTION_CHOICES)
    module = models.CharField(max_length=64)
    object_repr = models.CharField(max_length=200, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["module", "action"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.module} {self.object_repr}"
