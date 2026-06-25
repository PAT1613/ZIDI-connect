from __future__ import annotations

import uuid

from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseModel(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class CodeCounter(models.Model):
    """Row-locked counter table powering monotonic auto-codes (CUS, SVC, INV)."""

    key = models.CharField(max_length=32, primary_key=True)
    value = models.PositiveBigIntegerField(default=0)

    class Meta:
        db_table = "common_code_counter"
