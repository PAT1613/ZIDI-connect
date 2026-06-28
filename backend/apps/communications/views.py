from __future__ import annotations

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import (
    CS_OFFICER,
    HasRolePermission,
    MANAGER,
    OPERATIONS,
    SUPER_ADMIN,
)
from apps.customers.models import Customer
from apps.invoicing.models import Invoice

from .config import all_resolved
from .models import CommunicationLog, IntegrationSetting
from .providers import send_email as send_email_provider
from .providers import send_sms as send_sms_provider
from .serializers import (
    CommunicationLogSerializer,
    IntegrationSettingsBulkSerializer,
    SendMessageSerializer,
    TestEmailSerializer,
    TestSMSSerializer,
)


def _resolve_recipients(payload) -> list[Customer]:
    if payload["filter"] == "all_active":
        return list(Customer.objects.filter(status=Customer.STATUS_ACTIVE))
    if payload["filter"] == "overdue":
        ids = (
            Invoice.objects.filter(status=Invoice.STATUS_OVERDUE)
            .values_list("customer_id", flat=True)
            .distinct()
        )
        return list(Customer.objects.filter(id__in=ids))
    ids = payload.get("customer_ids") or []
    return list(Customer.objects.filter(id__in=ids))


class _SendBase(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    # _method_to_action maps POST → "create" since APIView has no .action attr.
    required_roles = {
        "create": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
        "*": (SUPER_ADMIN, CS_OFFICER, OPERATIONS),
    }


class SendSMSView(_SendBase):
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recipients = _resolve_recipients(serializer.validated_data)
        if not recipients:
            return Response({"detail": "No recipients matched."}, status=status.HTTP_400_BAD_REQUEST)

        sent = 0
        failed = 0
        for customer in recipients:
            if not customer.phone:
                failed += 1
                continue
            result = send_sms_provider(customer.phone, serializer.validated_data["message"])
            CommunicationLog.objects.create(
                sender=request.user if request.user.is_authenticated else None,
                customer=customer,
                channel=CommunicationLog.CHANNEL_SMS,
                message=serializer.validated_data["message"],
                status=result.get("status", "failed"),
                sent_at=timezone.now() if result.get("status") in {"sent", "logged"} else None,
                error=result.get("error", ""),
            )
            if result.get("status") in {"sent", "logged"}:
                sent += 1
            else:
                failed += 1
        return Response({"sent": sent, "failed": failed, "total": len(recipients)})


class SendEmailView(_SendBase):
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recipients = _resolve_recipients(serializer.validated_data)
        if not recipients:
            return Response({"detail": "No recipients matched."}, status=status.HTTP_400_BAD_REQUEST)

        sent = 0
        failed = 0
        subject = serializer.validated_data.get("subject") or "Notice from ZIDI Connect"
        message = serializer.validated_data["message"]
        for customer in recipients:
            if not customer.email:
                failed += 1
                continue
            try:
                result = send_email_provider(customer.email, subject, message)
                ok = result.get("status") == "sent"
            except Exception as exc:  # pragma: no cover
                ok = False
                result = {"status": "failed", "error": str(exc)}
            CommunicationLog.objects.create(
                sender=request.user if request.user.is_authenticated else None,
                customer=customer,
                channel=CommunicationLog.CHANNEL_EMAIL,
                subject=subject,
                message=message,
                status="sent" if ok else "failed",
                sent_at=timezone.now() if ok else None,
                error=result.get("error", ""),
            )
            sent += 1 if ok else 0
            failed += 0 if ok else 1
        return Response({"sent": sent, "failed": failed, "total": len(recipients)})


class CommunicationLogViewSet(viewsets.ModelViewSet):
    queryset = CommunicationLog.objects.select_related("customer", "sender").all()
    serializer_class = CommunicationLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    http_method_names = ("get", "delete", "head", "options")
    search_fields = ("customer__full_name", "customer__phone", "customer__email", "message", "subject")
    ordering_fields = ("created_at", "sent_at", "channel", "status")
    filterset_fields = ("channel", "status", "customer")
    required_roles = {
        "list": (SUPER_ADMIN, CS_OFFICER, OPERATIONS, MANAGER),
        "retrieve": (SUPER_ADMIN, CS_OFFICER, OPERATIONS, MANAGER),
        "destroy": (SUPER_ADMIN,),
    }


class IntegrationSettingsView(APIView):
    """GET resolved settings (DB+env merged), PUT bulk-update DB values.

    Super Admin only — credentials are sensitive.
    """

    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_roles = {"*": (SUPER_ADMIN,)}

    def get(self, request):
        resolved = all_resolved()
        return Response({"settings": list(resolved.values())})

    def put(self, request):
        serializer = IntegrationSettingsBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        incoming = serializer.validated_data["settings"]
        allowed_keys = {key for key, _ in IntegrationSetting.KEYS}

        for key, value in incoming.items():
            if key not in allowed_keys:
                continue
            value = (value or "").strip()
            if value == "":
                IntegrationSetting.objects.filter(pk=key).delete()
            else:
                IntegrationSetting.objects.update_or_create(
                    pk=key, defaults={"value": value},
                )
        return Response({"settings": list(all_resolved().values())})


class TestSMSView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_roles = {"*": (SUPER_ADMIN,)}

    def post(self, request):
        payload = TestSMSSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        result = send_sms_provider(
            payload.validated_data["phone"],
            payload.validated_data["message"],
        )
        ok = result.get("status") in {"sent", "logged"}
        return Response(
            {"ok": ok, **result},
            status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
        )


class TestEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_roles = {"*": (SUPER_ADMIN,)}

    def post(self, request):
        payload = TestEmailSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        try:
            result = send_email_provider(
                payload.validated_data["email"],
                payload.validated_data["subject"],
                payload.validated_data["message"],
            )
        except Exception as exc:
            result = {"status": "failed", "error": str(exc)}
        ok = result.get("status") in {"sent", "logged"}
        return Response(
            {"ok": ok, **result},
            status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
        )
