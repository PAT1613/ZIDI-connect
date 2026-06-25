from __future__ import annotations

from django.db import transaction

from .models import CodeCounter


def generate_code(prefix: str, *, width: int = 6) -> str:
    """Atomically increments and returns a zero-padded code like ``CUS-000001``."""

    with transaction.atomic():
        counter, _ = CodeCounter.objects.select_for_update().get_or_create(key=prefix)
        counter.value += 1
        counter.save(update_fields=["value"])
        return f"{prefix}-{counter.value:0{width}d}"
