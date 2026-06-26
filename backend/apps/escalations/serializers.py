from rest_framework import serializers

from apps.subscriptions.models import CustomerService
from apps.subscriptions.serializers import CustomerServiceSerializer

from .models import Escalation


class EscalationSerializer(serializers.ModelSerializer):
    customer_service = CustomerServiceSerializer(read_only=True)
    customer_service_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomerService.objects.all(),
        source="customer_service", write_only=True,
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.full_name", read_only=True, default=None,
    )

    class Meta:
        model = Escalation
        fields = (
            "id", "customer_service", "customer_service_id",
            "assigned_to", "assigned_to_name",
            "status", "opened_at", "resolved_at", "notes", "reason",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "opened_at", "created_at", "updated_at")
