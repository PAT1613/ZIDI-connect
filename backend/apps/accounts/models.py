from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager # type: ignore
from django.db import models


class Role(models.Model):
    SUPER_ADMIN = "Super Admin"
    CS_OFFICER = "Customer Service Officer"
    FINANCE = "Finance Officer"
    OPERATIONS = "Operations Officer"
    MANAGER = "Manager"

    DEFAULT_ROLES = (
        (SUPER_ADMIN, "Full system access"),
        (CS_OFFICER, "Manages customers, subscriptions and communications"),
        (FINANCE, "Manages invoices and payments"),
        (OPERATIONS, "Manages services and operational subscriptions"),
        (MANAGER, "Read-only access to reports and audit logs"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=32, blank=True)
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name="users",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    class Meta:
        ordering = ("email",)

    def __str__(self) -> str:
        return self.email

    @property
    def role_name(self) -> str | None:
        return self.role.name if self.role_id else None
