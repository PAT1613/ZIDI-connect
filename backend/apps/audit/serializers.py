from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)
    user_name = serializers.CharField(source="user.full_name", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = (
            "id", "user", "user_email", "user_name",
            "action", "module", "object_repr", "object_id",
            "old_value", "new_value", "ip_address",
            "created_at",
        )
        read_only_fields = fields
