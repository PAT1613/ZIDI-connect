from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.communications.models import CommunicationLog
from apps.customers.models import Customer
from apps.escalations.models import Escalation
from apps.invoicing.models import Invoice, Payment
from apps.notifications.models import Notification
from apps.services.models import Service
from apps.subscriptions.models import CustomerService


def _money(value) -> str:
    return str(value or Decimal("0"))


def dashboard_payload() -> dict:
    today = date.today()
    upcoming_window = today + timedelta(days=14)

    customers_total = Customer.objects.count()
    customers_active = Customer.objects.filter(status=Customer.STATUS_ACTIVE).count()
    services_active = Service.objects.filter(status=Service.STATUS_ACTIVE).count()
    subs_active = CustomerService.objects.filter(status=CustomerService.STATUS_ACTIVE).count()
    subs_expired = CustomerService.objects.filter(status=CustomerService.STATUS_EXPIRED).count()

    invoices_pending = Invoice.objects.filter(status=Invoice.STATUS_PENDING).count()
    invoices_overdue = Invoice.objects.filter(status=Invoice.STATUS_OVERDUE).count()
    revenue_total = Payment.objects.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    revenue_month = Payment.objects.filter(
        paid_at__year=today.year, paid_at__month=today.month
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    upcoming_renewals = CustomerService.objects.filter(
        status=CustomerService.STATUS_ACTIVE,
        due_date__gte=today,
        due_date__lte=upcoming_window,
    ).count()

    open_escalations = Escalation.objects.filter(
        status__in=[Escalation.STATUS_OPEN, Escalation.STATUS_IN_PROGRESS],
    ).count()

    notif_30d = Notification.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=30),
    ).values("channel", "status").annotate(count=Count("id"))

    revenue_by_month = []
    for i in range(5, -1, -1):
        ref = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        next_month = (ref + timedelta(days=32)).replace(day=1)
        total = Payment.objects.filter(
            paid_at__gte=ref, paid_at__lt=next_month,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
        revenue_by_month.append({"month": ref.strftime("%b %Y"), "total": _money(total)})

    return {
        "customers": {"total": customers_total, "active": customers_active},
        "services": {"active": services_active},
        "subscriptions": {
            "active": subs_active,
            "expired": subs_expired,
            "upcoming_renewals": upcoming_renewals,
        },
        "invoices": {
            "pending": invoices_pending,
            "overdue": invoices_overdue,
        },
        "revenue": {
            "total": _money(revenue_total),
            "month_to_date": _money(revenue_month),
            "by_month": revenue_by_month,
        },
        "escalations": {"open": open_escalations},
        "notifications_30d": list(notif_30d),
    }


def customers_rows():
    rows = [["Code", "Name", "Phone", "Email", "Status", "Registered"]]
    for c in Customer.objects.order_by("-created_at"):
        rows.append([
            c.customer_code, c.full_name, c.phone or "", c.email or "",
            c.status, c.registration_date.isoformat(),
        ])
    return rows


def services_rows():
    rows = [["Code", "Name", "Price", "Cycle", "SLA days", "Status"]]
    for s in Service.objects.order_by("name"):
        rows.append([
            s.service_code, s.name, _money(s.price),
            s.billing_cycle, str(s.sla_days), s.status,
        ])
    return rows


def revenue_rows():
    rows = [["Invoice", "Customer", "Method", "Reference", "Amount", "Paid at"]]
    for p in Payment.objects.select_related("invoice__customer").order_by("-paid_at"):
        rows.append([
            p.invoice.invoice_number, p.invoice.customer.full_name,
            p.method, p.reference or "",
            _money(p.amount), p.paid_at.strftime("%Y-%m-%d %H:%M"),
        ])
    return rows


def invoices_rows():
    rows = [["Invoice", "Customer", "Amount", "Tax", "Total", "Status", "Issued", "Due"]]
    for inv in Invoice.objects.select_related("customer").order_by("-issued_date"):
        rows.append([
            inv.invoice_number, inv.customer.full_name,
            _money(inv.amount), _money(inv.tax), _money(inv.total),
            inv.status, inv.issued_date.isoformat(), inv.due_date.isoformat(),
        ])
    return rows


def payments_rows():
    return revenue_rows()


def notifications_rows():
    rows = [["When", "Channel", "Customer", "Status", "Subject"]]
    for n in Notification.objects.select_related("customer").order_by("-created_at")[:5000]:
        rows.append([
            n.created_at.strftime("%Y-%m-%d %H:%M"),
            n.channel,
            n.customer.full_name if n.customer else "—",
            n.status, n.subject or "",
        ])
    return rows


REPORTS = {
    "customers": ("Customer Report", customers_rows),
    "services": ("Service Catalog", services_rows),
    "revenue": ("Revenue Report", revenue_rows),
    "invoices": ("Invoice Report", invoices_rows),
    "payments": ("Payments Report", payments_rows),
    "notifications": ("Notifications Report", notifications_rows),
}


def accounting_export_rows():
    """Flat, importer-friendly view of finance data.

    One row per invoice, plus one row per payment. Common columns so a
    downstream mapping into QuickBooks / Xero can key on ``type`` +
    ``reference``.
    """
    rows = [
        [
            "type", "reference", "date", "customer_code", "customer_name",
            "invoice_number", "amount", "tax", "total", "method", "status",
        ],
    ]
    for inv in Invoice.objects.select_related("customer").order_by("issued_date", "created_at"):
        rows.append([
            "invoice",
            inv.invoice_number,
            inv.issued_date.isoformat() if inv.issued_date else "",
            getattr(inv.customer, "customer_code", ""),
            inv.customer.full_name if inv.customer else "",
            inv.invoice_number,
            _money(inv.amount),
            _money(inv.tax),
            _money(inv.total),
            "",  # method N/A on invoice row
            inv.status,
        ])
    for pay in Payment.objects.select_related("invoice__customer").order_by("paid_at"):
        cust = getattr(pay.invoice, "customer", None)
        rows.append([
            "payment",
            pay.reference or f"PAY-{pay.id}",
            pay.paid_at.strftime("%Y-%m-%d") if pay.paid_at else "",
            getattr(cust, "customer_code", "") if cust else "",
            cust.full_name if cust else "",
            pay.invoice.invoice_number if pay.invoice else "",
            _money(pay.amount),
            "",  # tax N/A
            _money(pay.amount),
            pay.method,
            "received",
        ])
    return rows
