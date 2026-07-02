from rest_framework import serializers

from .models import DeviceToken, Notification


class NotificationSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id", "customer", "customer_name", "customer_service", "user",
            "channel", "subject", "message", "status", "sent_at",
            "delivered_at", "delivery_status", "provider_message_id", "interval_key",
            "read_at", "created_at", "updated_at",
        )
        read_only_fields = fields


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ("id", "expo_push_token", "platform", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class DeviceTokenUpsertSerializer(serializers.Serializer):
    """Input-only serializer for the register endpoint.

    Plain ``Serializer`` (not ``ModelSerializer``) so DRF's automatic
    UniqueValidator on ``expo_push_token`` doesn't reject the upsert path.
    """

    expo_push_token = serializers.CharField(max_length=200)
    platform = serializers.ChoiceField(
        choices=DeviceToken.PLATFORM_CHOICES, required=False, allow_blank=True, default="",
    )
