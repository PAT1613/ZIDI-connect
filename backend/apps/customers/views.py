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

from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = ("customer_code", "full_name", "phone", "email", "national_id")
    ordering_fields = ("created_at", "full_name", "customer_code", "registration_date")
    filterset_fields = ("status",)
    required_roles = {
        "list": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "retrieve": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "create": (SUPER_ADMIN, CS_OFFICER),
        "update": (SUPER_ADMIN, CS_OFFICER),
        "partial_update": (SUPER_ADMIN, CS_OFFICER),
        "destroy": (SUPER_ADMIN,),
        "deactivate": (SUPER_ADMIN, CS_OFFICER),
    }

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        customer = self.get_object()
        customer.status = Customer.STATUS_INACTIVE
        customer.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(customer).data, status=status.HTTP_200_OK)
