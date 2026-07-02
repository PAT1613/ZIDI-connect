"""Expo Push API helper.

Sends notifications through Expo's server-hosted push endpoint. Kept small
and dependency-light (just ``requests``); the retry / fan-out logic lives in
the Celery task that wraps this.
"""
from __future__ import annotations

import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def push_to_tokens(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    sound: str | None = "default",
    timeout: int = 15,
) -> dict[str, Any]:
    """POST a notification to each token via Expo's Push API.

    Returns a summary ``{sent, failed, response}``. Failures include HTTP
    errors and per-ticket errors from Expo (e.g. ``DeviceNotRegistered``).
    Callers should mark tokens invalid when Expo reports them so.
    """
    tokens = [t for t in tokens if t]
    if not tokens:
        return {"sent": 0, "failed": 0, "response": None}

    payloads = [
        {
            "to": t,
            "sound": sound,
            "title": title,
            "body": body,
            "data": data or {},
        }
        for t in tokens
    ]

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=payloads,
            timeout=timeout,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )
    except requests.RequestException as exc:
        logger.exception("expo push transport failed: %s", exc)
        return {"sent": 0, "failed": len(tokens), "error": str(exc), "response": None}

    if not response.ok:
        logger.warning("expo push returned %s: %s", response.status_code, response.text[:200])
        return {
            "sent": 0,
            "failed": len(tokens),
            "error": f"HTTP {response.status_code}",
            "response": response.text[:500],
        }

    payload = response.json()
    tickets = payload.get("data", [])
    ok = sum(1 for t in tickets if t.get("status") == "ok")
    fail = len(tickets) - ok
    return {"sent": ok, "failed": fail, "response": tickets}
