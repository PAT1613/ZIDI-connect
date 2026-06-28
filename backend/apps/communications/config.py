"""Runtime resolver for integration settings.

Looks up values in this order: IntegrationSetting (DB) → django.conf.settings (.env) → default.
DB-backed values let admins update API keys from the UI without redeploying.
"""
from __future__ import annotations

from typing import Any

from django.conf import settings as django_settings
from django.db.utils import OperationalError, ProgrammingError

_TRUE = {"1", "true", "yes", "on"}


def _db_lookup(key: str) -> str | None:
    try:
        from .models import IntegrationSetting

        row = IntegrationSetting.objects.filter(pk=key).only("value").first()
        return row.value if row and row.value else None
    except (OperationalError, ProgrammingError):
        return None
    except Exception:
        return None


def get_setting(key: str, default: Any = "") -> str:
    db_value = _db_lookup(key)
    if db_value not in (None, ""):
        return db_value
    env_value = getattr(django_settings, key, None)
    if env_value not in (None, ""):
        return str(env_value)
    return default


def get_bool(key: str, default: bool = False) -> bool:
    raw = get_setting(key, "")
    if raw == "":
        return default
    return str(raw).strip().lower() in _TRUE


def get_int(key: str, default: int = 0) -> int:
    raw = get_setting(key, "")
    if not raw:
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def all_resolved() -> dict[str, dict]:
    """Return the resolved state of every integration key for the Settings UI.

    For each key returns: {value, source: 'db'|'env'|'default'|'unset', is_secret, masked}.
    """
    from .models import IntegrationSetting

    out: dict[str, dict] = {}
    for key, label in IntegrationSetting.KEYS:
        is_secret = key in IntegrationSetting.SECRET_KEYS
        db_value = _db_lookup(key)
        env_value = getattr(django_settings, key, None)

        if db_value not in (None, ""):
            value, source = db_value, "db"
        elif env_value not in (None, ""):
            value, source = str(env_value), "env"
        else:
            value, source = "", "unset"

        out[key] = {
            "key": key,
            "label": label,
            "value": "" if is_secret else value,
            "is_set": bool(value),
            "is_secret": is_secret,
            "source": source,
            "masked": _mask(value) if is_secret and value else "",
        }
    return out


def _mask(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 4:
        return "•" * len(value)
    return f"{value[:2]}{'•' * (len(value) - 4)}{value[-2:]}"
