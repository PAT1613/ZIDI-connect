from __future__ import annotations

from datetime import date

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import (
    CS_OFFICER,
    FINANCE,
    HasRolePermission,
    MANAGER,
    OPERATIONS,
    SUPER_ADMIN,
)

from .models import CustomerService
from .serializers import CustomerServiceSerializer


class CustomerServiceViewSet(viewsets.ModelViewSet):
    queryset = CustomerService.objects.select_related("customer", "service").all()
    serializer_class = CustomerServiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = (
        "customer__full_name", "customer__customer_code",
        "service__name", "service__service_code",
    )
    ordering_fields = ("created_at", "due_date", "start_date", "status")
    filterset_fields = ("status", "auto_renew", "customer", "service")
    required_roles = {
        "list": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "retrieve": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "create": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
        "update": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
        "partial_update": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
        "destroy": (SUPER_ADMIN,),
        "renew": (SUPER_ADMIN, CS_OFFICER, OPERATIONS, FINANCE),
        "suspend": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
        "terminate": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
    }

    @action(detail=True, methods=["post"])
    def renew(self, request, pk=None):
        sub = self.get_object()
        sub.advance_due_date()
        sub.save(update_fields=["due_date", "renewal_date", "status", "updated_at"])
        return Response(self.get_serializer(sub).data)

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        sub = self.get_object()
        sub.status = CustomerService.STATUS_SUSPENDED
        sub.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(sub).data)

    @action(detail=True, methods=["post"])
    def terminate(self, request, pk=None):
        sub = self.get_object()
        sub.status = CustomerService.STATUS_TERMINATED
        sub.end_date = date.today()
        sub.save(update_fields=["status", "end_date", "updated_at"])
        return Response(self.get_serializer(sub).data)
