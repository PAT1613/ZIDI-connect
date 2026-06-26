from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer
from apps.subscriptions.models import CustomerService

from .models import Invoice, Payment


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source="received_by.full_name", read_only=True)
    invoice_number = serializers.CharField(source="invoice.invoice_number", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id", "invoice", "invoice_number", "amount", "method", "reference",
            "paid_at", "received_by", "received_by_name",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "received_by", "received_by_name", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["received_by"] = request.user
        payment = super().create(validated_data)
        invoice = payment.invoice
        paid_total = sum((p.amount for p in invoice.payments.all()), Decimal("0"))
        if paid_total >= invoice.total and invoice.status != Invoice.STATUS_PAID:
            invoice.status = Invoice.STATUS_PAID
            invoice.save(update_fields=["status", "updated_at"])
        return payment


class InvoiceSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), source="customer", write_only=True,
    )
    customer_service_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomerService.objects.all(),
        source="customer_service", write_only=True, required=False, allow_null=True,
    )
    payments = PaymentSerializer(many=True, read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            "id", "invoice_number", "customer", "customer_id", "customer_service",
            "customer_service_id", "amount", "tax", "total", "status",
            "issued_date", "due_date", "notes", "payments", "balance",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "invoice_number", "customer_service", "payments", "created_at", "updated_at")

    def get_balance(self, obj):
        paid = sum((p.amount for p in obj.payments.all()), Decimal("0"))
        return str((obj.total or Decimal("0")) - paid)
