from __future__ import annotations

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db.models import ProtectedError, RestrictedError
from django.http import Http404
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def zidi_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, list):
            response.data = {"detail": response.data}
        elif isinstance(response.data, dict) and "detail" not in response.data:
            pass
        return response

    if isinstance(exc, Http404):
        return Response({"detail": "Not found."}, status=404)
    if isinstance(exc, DjangoPermissionDenied):
        return Response({"detail": "Permission denied."}, status=403)
    if isinstance(exc, (ProtectedError, RestrictedError)):
        related = getattr(exc, "protected_objects", None) or getattr(exc, "restricted_objects", None) or []
        modules = sorted({type(obj)._meta.verbose_name_plural.lower() for obj in related})
        what = ", ".join(modules) if modules else "related records"
        return Response(
            {"detail": f"Cannot delete — {what} reference this record. Deactivate it instead, or remove the related records first."},
            status=409,
        )
    if isinstance(exc, APIException):
        return Response({"detail": str(exc)}, status=exc.status_code)

    logger.exception("Unhandled exception", exc_info=exc)
    return Response({"detail": "Internal server error."}, status=500)
