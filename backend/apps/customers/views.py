from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import SuperAdminCascadeDestroyMixin
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


class CustomerViewSet(SuperAdminCascadeDestroyMixin, viewsets.ModelViewSet):
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
        "purge": (SUPER_ADMIN,),
    }

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        customer = self.get_object()
        customer.status = Customer.STATUS_INACTIVE
        customer.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(customer).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["delete"])
    def purge(self, request, pk=None):
        """Destructive: removes the customer and every record that references them.

        Order matters because of PROTECT FKs: payments → invoices → notifications →
        escalations → comms logs → subscriptions → customer.
        """
        from apps.communications.models import CommunicationLog
        from apps.escalations.models import Escalation
        from apps.invoicing.models import Invoice, Payment
        from apps.notifications.models import Notification
        from apps.subscriptions.models import CustomerService

        customer = self.get_object()
        with transaction.atomic():
            invoice_ids = list(
                Invoice.objects.filter(customer=customer).values_list("id", flat=True)
            )
            sub_ids = list(
                CustomerService.objects.filter(customer=customer).values_list("id", flat=True)
            )
            payments_deleted = Payment.objects.filter(invoice_id__in=invoice_ids).delete()[0]
            invoices_deleted = Invoice.objects.filter(id__in=invoice_ids).delete()[0]
            notifications_deleted = Notification.objects.filter(
                customer=customer
            ).delete()[0]
            escalations_deleted = Escalation.objects.filter(
                customer_service_id__in=sub_ids
            ).delete()[0]
            comms_deleted = CommunicationLog.objects.filter(customer=customer).delete()[0]
            subs_deleted = CustomerService.objects.filter(id__in=sub_ids).delete()[0]
            code = customer.customer_code
            customer.delete()
        return Response(
            {
                "detail": f"{code} purged.",
                "deleted": {
                    "payments": payments_deleted,
                    "invoices": invoices_deleted,
                    "notifications": notifications_deleted,
                    "escalations": escalations_deleted,
                    "communication_logs": comms_deleted,
                    "subscriptions": subs_deleted,
                },
            },
            status=status.HTTP_200_OK,
        )
