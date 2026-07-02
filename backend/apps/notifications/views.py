from __future__ import annotations

import hmac
import logging

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken, Notification
from .serializers import DeviceTokenSerializer, DeviceTokenUpsertSerializer, NotificationSerializer

logger = logging.getLogger(__name__)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ("subject", "message")
    ordering_fields = ("created_at", "status", "channel")
    filterset_fields = ("channel", "status")

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.filter(
            Q(user=user) | Q(channel=Notification.CHANNEL_IN_APP, user__isnull=True)
        ).select_related("customer", "user")

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.read_at:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at", "updated_at"])
        return Response(self.get_serializer(notification).data)


class DeviceRegisterView(APIView):
    """POST /devices/register/  — upsert the caller's Expo push token.

    Body: ``{expo_push_token, platform}``. If the token already exists for a
    different user (e.g. previous login on the same device), it's re-bound to
    the current caller. DELETE removes the token for the caller.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DeviceTokenUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["expo_push_token"]
        platform = serializer.validated_data.get("platform") or ""
        obj, created = DeviceToken.objects.update_or_create(
            expo_push_token=token,
            defaults={"user": request.user, "platform": platform},
        )
        return Response(
            DeviceTokenSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        token = (
            request.query_params.get("expo_push_token")
            or (request.data or {}).get("expo_push_token")
            or ""
        ).strip()
        if not token:
            return Response(
                {"detail": "expo_push_token required"}, status=status.HTTP_400_BAD_REQUEST,
            )
        DeviceToken.objects.filter(user=request.user, expo_push_token=token).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Africa's Talking / SMTP-DSN → server-to-server webhook. No user auth applies;
# we authenticate the caller with a shared secret in a header instead.
_TERMINAL_STATUSES = {
    "delivered": Notification.STATUS_DELIVERED,
    "success": Notification.STATUS_DELIVERED,
    "sent": Notification.STATUS_SENT,
    "buffered": Notification.STATUS_SENT,
    "failed": Notification.STATUS_FAILED,
    "rejected": Notification.STATUS_FAILED,
    "expired": Notification.STATUS_FAILED,
}


@method_decorator(csrf_exempt, name="dispatch")
class DeliveryCallbackView(APIView):
    """POST /notifications/delivery-callback/

    Accepts a delivery report from the SMS/email gateway. Guarded by a shared
    secret in the ``X-Webhook-Secret`` header (env: ``WEBHOOK_SHARED_SECRET``).

    Payload (Africa's Talking style):
        {"id": "<provider_message_id>", "status": "Success"|"Failed"|...}

    Also accepts snake_case aliases: ``provider_message_id`` / ``message_id``.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        expected = getattr(settings, "WEBHOOK_SHARED_SECRET", "") or ""
        provided = request.headers.get("X-Webhook-Secret", "") or ""
        if not expected or not hmac.compare_digest(expected, provided):
            logger.warning("delivery-callback rejected: bad or missing secret")
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        data = request.data or {}
        message_id = (
            data.get("provider_message_id")
            or data.get("message_id")
            or data.get("id")
            or ""
        ).strip()
        raw_status = (data.get("status") or data.get("delivery_status") or "").strip().lower()

        if not message_id:
            return Response({"detail": "message_id required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            notif = Notification.objects.get(provider_message_id=message_id)
        except Notification.DoesNotExist:
            logger.info("delivery-callback: no match for provider_message_id=%s", message_id)
            return Response({"detail": "not found"}, status=status.HTTP_404_NOT_FOUND)

        mapped = _TERMINAL_STATUSES.get(raw_status)
        if mapped is None:
            # Unknown status — record what the gateway said but don't change status.
            notif.delivery_status = raw_status[:32]
            notif.save(update_fields=["delivery_status", "updated_at"])
            return Response({"detail": "recorded", "status": notif.status})

        notif.status = mapped
        notif.delivery_status = raw_status[:32]
        if mapped == Notification.STATUS_DELIVERED and not notif.delivered_at:
            notif.delivered_at = timezone.now()
        notif.save(update_fields=["status", "delivery_status", "delivered_at", "updated_at"])
        return Response({"detail": "ok", "status": notif.status})
