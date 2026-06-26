from __future__ import annotations

from datetime import date, timedelta

from rest_framework import serializers

from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer
from apps.services.models import Service
from apps.services.serializers import ServiceSerializer

from .models import CustomerService, _cycle_length


class CustomerServiceSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), source="customer", write_only=True,
    )
    service_id = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), source="service", write_only=True,
    )

    class Meta:
        model = CustomerService
        fields = (
            "id", "customer", "service", "customer_id", "service_id",
            "start_date", "end_date", "renewal_date", "due_date",
            "status", "auto_renew", "notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        if not validated_data.get("due_date"):
            svc = validated_data["service"]
            cycle = _cycle_length(svc.billing_cycle, svc.sla_days) or svc.sla_days or 30
            start = validated_data.get("start_date") or date.today()
            validated_data["due_date"] = start + timedelta(days=cycle)
            validated_data["renewal_date"] = validated_data["due_date"]
        return super().create(validated_data)
