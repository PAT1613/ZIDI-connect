from rest_framework import serializers

from .models import CommunicationLog


class CommunicationLogSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)

    class Meta:
        model = CommunicationLog
        fields = (
            "id", "sender", "sender_name", "customer", "customer_name",
            "customer_phone", "customer_email",
            "channel", "subject", "message", "status", "sent_at", "error",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "sender", "sender_name", "created_at", "updated_at")


class SendMessageSerializer(serializers.Serializer):
    """Used by both /communications/sms/ and /communications/email/."""

    customer_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True,
    )
    filter = serializers.ChoiceField(
        choices=("all_active", "selected", "overdue"),
        required=False, default="selected",
    )
    subject = serializers.CharField(required=False, allow_blank=True, max_length=160)
    message = serializers.CharField()
