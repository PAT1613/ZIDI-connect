from __future__ import annotations

from datetime import date

from django.http import HttpResponse
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import (
    CS_OFFICER,
    FINANCE,
    HasRolePermission,
    MANAGER,
    OPERATIONS,
    SUPER_ADMIN,
)

from .exports import rows_to_pdf, rows_to_xlsx
from .queries import REPORTS, dashboard_payload

REPORT_ROLES = {
    "customers": (SUPER_ADMIN, CS_OFFICER, MANAGER),
    "services": (SUPER_ADMIN, OPERATIONS, MANAGER),
    "revenue": (SUPER_ADMIN, FINANCE, MANAGER),
    "invoices": (SUPER_ADMIN, FINANCE, MANAGER),
    "payments": (SUPER_ADMIN, FINANCE, MANAGER),
    "notifications": (SUPER_ADMIN, CS_OFFICER, MANAGER),
}


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(dashboard_payload())


class _ReportExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    report_key: str = ""

    @property
    def required_roles(self):
        roles = REPORT_ROLES.get(self.report_key, (SUPER_ADMIN,))
        return {"get": roles, "*": roles}

    def get(self, request):
        title, builder = REPORTS[self.report_key]
        rows = builder()
        fmt = (request.query_params.get("format") or "pdf").lower()
        today = date.today().isoformat()
        if fmt == "xlsx":
            content = rows_to_xlsx(title, rows)
            response = HttpResponse(
                content,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                f"attachment; filename={self.report_key}-{today}.xlsx"
            )
            return response

        content = rows_to_pdf(title, rows)
        response = HttpResponse(content, content_type="application/pdf")
        response["Content-Disposition"] = (
            f"attachment; filename={self.report_key}-{today}.pdf"
        )
        return response


def _make_report_view(key: str):
    return type(
        f"{key.title()}ReportView",
        (_ReportExportView,),
        {"report_key": key},
    )


CustomersReportView = _make_report_view("customers")
ServicesReportView = _make_report_view("services")
RevenueReportView = _make_report_view("revenue")
InvoicesReportView = _make_report_view("invoices")
PaymentsReportView = _make_report_view("payments")
NotificationsReportView = _make_report_view("notifications")
