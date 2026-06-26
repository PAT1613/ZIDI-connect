from __future__ import annotations

from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Role, User


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "description", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source="role", write_only=True, required=False, allow_null=True
    )
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = (
            "id", "email", "full_name", "phone", "role", "role_id",
            "is_active", "is_staff", "is_superuser", "date_joined",
            "last_login", "password", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "is_superuser", "date_joined", "last_login",
            "created_at", "updated_at",
        )

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid credentials."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "Account disabled."})
        refresh = RefreshToken.for_user(user)
        attrs["user"] = user
        attrs["access"] = str(refresh.access_token)
        attrs["refresh"] = str(refresh)
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
