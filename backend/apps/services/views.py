from rest_framework import permissions, viewsets

from apps.common.permissions import (
    CS_OFFICER,
    FINANCE,
    HasRolePermission,
    MANAGER,
    OPERATIONS,
    SUPER_ADMIN,
)

from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = ("service_code", "name", "description")
    ordering_fields = ("created_at", "name", "price")
    filterset_fields = ("status", "billing_cycle")
    required_roles = {
        "list": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "retrieve": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "create": (SUPER_ADMIN, OPERATIONS),
        "update": (SUPER_ADMIN, OPERATIONS),
        "partial_update": (SUPER_ADMIN, OPERATIONS),
        "destroy": (SUPER_ADMIN,),
    }
