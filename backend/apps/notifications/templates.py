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
