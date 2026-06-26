from rest_framework import serializers

from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = (
            "id", "service_code", "name", "description", "price",
            "sla_days", "billing_cycle", "status",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "service_code", "created_at", "updated_at")
