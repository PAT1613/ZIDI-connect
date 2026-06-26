from __future__ import annotations

from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action

from apps.common.permissions import (
    CS_OFFICER,
    FINANCE,
    HasRolePermission,
    MANAGER,
    OPERATIONS,
    SUPER_ADMIN,
)

from .models import Invoice, Payment
from .pdf import render_invoice_pdf
from .serializers import InvoiceSerializer, PaymentSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("customer", "customer_service__service").prefetch_related("payments").all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = ("invoice_number", "customer__full_name", "customer__customer_code")
    ordering_fields = ("issued_date", "due_date", "total", "status", "created_at")
    filterset_fields = ("status", "customer")
    required_roles = {
        "list": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "retrieve": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
        "create": (SUPER_ADMIN, FINANCE),
        "update": (SUPER_ADMIN, FINANCE),
        "partial_update": (SUPER_ADMIN, FINANCE),
        "destroy": (SUPER_ADMIN,),
        "pdf": (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER),
    }

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        pdf_bytes = render_invoice_pdf(invoice)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f"attachment; filename={invoice.invoice_number}.pdf"
        return response


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("invoice", "received_by").all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    http_method_names = ("get", "post", "head", "options")
    search_fields = ("invoice__invoice_number", "reference")
    ordering_fields = ("paid_at", "amount")
    filterset_fields = ("method", "invoice")
    required_roles = {
        "list": (SUPER_ADMIN, FINANCE, MANAGER),
        "retrieve": (SUPER_ADMIN, FINANCE, MANAGER),
        "create": (SUPER_ADMIN, FINANCE),
    }
