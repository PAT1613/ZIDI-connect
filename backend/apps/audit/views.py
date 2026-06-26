from rest_framework import permissions, viewsets

from apps.common.permissions import HasRolePermission, MANAGER, SUPER_ADMIN

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = ("object_repr", "object_id", "module", "user__email")
    ordering_fields = ("created_at", "module", "action")
    filterset_fields = ("action", "module", "user")
    required_roles = {
        "list": (SUPER_ADMIN, MANAGER),
        "retrieve": (SUPER_ADMIN, MANAGER),
    }
