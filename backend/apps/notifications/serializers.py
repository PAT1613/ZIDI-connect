from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id", "customer", "customer_name", "customer_service", "user",
            "channel", "subject", "message", "status", "sent_at",
            "delivery_status", "provider_message_id", "interval_key",
            "read_at", "created_at", "updated_at",
        )
        read_only_fields = fields
