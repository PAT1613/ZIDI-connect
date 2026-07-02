from __future__ import annotations

from django.conf import settings


def render_reminder(customer, service, due_date, amount, days_left) -> tuple[str, str]:
    """Returns (subject, body) for a reminder."""
    renewal_url = settings.RENEWAL_URL_BASE
    body = (
        f"Dear {customer.full_name}, your subscription to {service.name} is due "
        f"on {due_date.strftime('%Y-%m-%d')}. Amount: KES {amount}. "
        f"Renew via {renewal_url} or reply HELP. — ZIDI Connect"
    )
    if days_left and days_left > 0:
        subject = f"Reminder: {service.name} due in {days_left} day(s)"
    else:
        subject = f"OVERDUE: {service.name}"
    return subject, body


def render_invoice_issued(customer, service, invoice_number, amount, due_date) -> tuple[str, str]:
    """Returns (subject, body) for an 'invoice issued' notification."""
    subject = f"Invoice {invoice_number} — {service.name}"
    body = (
        f"Dear {customer.full_name}, invoice {invoice_number} has been issued for "
        f"{service.name}. Amount: KES {amount}. Due on {due_date.strftime('%Y-%m-%d')}. "
        f"— ZIDI Connect"
    )
    return subject, body
