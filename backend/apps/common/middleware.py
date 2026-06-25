from __future__ import annotations

import threading
from typing import Optional

_request_local = threading.local()


def _client_ip(request) -> Optional[str]:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class RequestContextMiddleware:
    """Stashes the active user and client IP on a thread-local for signal handlers."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _request_local.user = getattr(request, "user", None)
        _request_local.ip = _client_ip(request)
        try:
            return self.get_response(request)
        finally:
            _request_local.user = None
            _request_local.ip = None


def get_current_user():
    user = getattr(_request_local, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    return user


def get_current_ip() -> Optional[str]:
    return getattr(_request_local, "ip", None)
