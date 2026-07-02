from django.urls import path

from .views import (
    AccountingExportView,
    CustomersReportView,
    DashboardView,
    InvoicesReportView,
    NotificationsReportView,
    PaymentsReportView,
    RevenueReportView,
    ServicesReportView,
)

urlpatterns = [
    path("reports/dashboard/", DashboardView.as_view(), name="report-dashboard"),
    path("reports/customers/", CustomersReportView.as_view(), name="report-customers"),
    path("reports/services/", ServicesReportView.as_view(), name="report-services"),
    path("reports/revenue/", RevenueReportView.as_view(), name="report-revenue"),
    path("reports/invoices/", InvoicesReportView.as_view(), name="report-invoices"),
    path("reports/payments/", PaymentsReportView.as_view(), name="report-payments"),
    path("reports/notifications/", NotificationsReportView.as_view(), name="report-notifications"),
    path("reports/accounting-export/", AccountingExportView.as_view(), name="report-accounting-export"),
]
