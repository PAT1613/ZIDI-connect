from django.utils import timezone
from rest_framework import permissions, viewsets

from apps.common.permissions import (
    CS_OFFICER,
    FINANCE,
    HasRolePermission,
    MANAGER,
    OPERATIONS,
    SUPER_ADMIN,
)

from .models import Escalation
from .serializers import EscalationSerializer


class EscalationViewSet(viewsets.ModelViewSet):
    queryset = Escalation.objects.select_related(
        "customer_service__customer",
        "customer_service__service",
        "assigned_to",
    ).all()
    serializer_class = EscalationSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = (
        "customer_service__customer__full_name",
        "customer_service__service__name", "notes", "reason",
    )
    ordering_fields = ("opened_at", "resolved_at", "status")
    filterset_fields = ("status", "assigned_to")
    required_roles = {
        "list": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "retrieve": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "create": (SUPER_ADMIN, CS_OFFICER, OPERATIONS, MANAGER),
        "update": (SUPER_ADMIN, CS_OFFICER, OPERATIONS, MANAGER),
        "partial_update": (SUPER_ADMIN, CS_OFFICER, OPERATIONS, MANAGER),
        "destroy": (SUPER_ADMIN,),
    }

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status in {Escalation.STATUS_RESOLVED, Escalation.STATUS_CLOSED} and not instance.resolved_at:
            instance.resolved_at = timezone.now()
            instance.save(update_fields=["resolved_at", "updated_at"])
