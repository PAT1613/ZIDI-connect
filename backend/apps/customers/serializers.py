from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            "id", "customer_code", "full_name", "phone", "email", "address",
            "national_id", "status", "registration_date", "notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "customer_code", "registration_date", "created_at", "updated_at")
