from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


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
