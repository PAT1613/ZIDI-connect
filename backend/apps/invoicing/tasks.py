from __future__ import annotations

import logging
from datetime import date

from celery import shared_task
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.communications.models import CommunicationLog
from apps.notifications.models import Notification
from apps.notifications.templates import render_invoice_issued
from apps.subscriptions.models import CustomerService

from .models import Invoice

logger = logging.getLogger(__name__)


def _queue_invoice_issued(invoice: Invoice) -> None:
    """Drop a notification per preferred channel + a CommunicationLog per outbound channel.

    Uses interval_key = f"invoice_{invoice.billing_period_key}" so it dedupes against
    the existing Notification UniqueConstraint without colliding with reminder keys.
    """
    # Local import — avoids a circular import at module load time.
    from apps.notifications.tasks import send_email_notification, send_sms_notification

    customer = invoice.customer
    service = invoice.customer_service.service if invoice.customer_service else None
    if service is None:
        return

    subject, body = render_invoice_issued(
        customer, service, invoice.invoice_number, invoice.total, invoice.due_date,
    )
    interval_key = f"invoice_{invoice.billing_period_key}" if invoice.billing_period_key else ""

    for channel in customer.notification_channels():
        if interval_key and Notification.objects.filter(
            customer_service=invoice.customer_service,
            interval_key=interval_key,
            channel=channel,
        ).exists():
            continue
        notif = Notification.objects.create(
            customer=customer,
            customer_service=invoice.customer_service,
            channel=channel,
            subject=subject,
            message=body,
            interval_key=interval_key,
            status=(
                Notification.STATUS_SENT
                if channel == Notification.CHANNEL_IN_APP
                else Notification.STATUS_QUEUED
            ),
            sent_at=timezone.now() if channel == Notification.CHANNEL_IN_APP else None,
        )
        # Mirror to the customer-facing CommunicationLog so it shows under the customer.
        if channel in (Notification.CHANNEL_SMS, Notification.CHANNEL_EMAIL):
            CommunicationLog.objects.create(
                customer=customer,
                channel=channel,
                subject=subject,
                message=body,
                status=CommunicationLog.STATUS_QUEUED,
            )
            if channel == Notification.CHANNEL_SMS:
                send_sms_notification.delay(str(notif.id))
            else:
                send_email_notification.delay(str(notif.id))


@shared_task
def generate_due_invoices():
    """Daily Celery Beat task.

    For each active, auto-renewing subscription whose billing period has come due
    (due_date <= today), idempotently create an Invoice for the service price,
    advance the subscription's due_date for the next cycle, and queue an
    invoice-issued notification to the customer.

    Idempotency: `Invoice.billing_period_key` is the period this invoice covers
    (the subscription's due_date at billing time). A UniqueConstraint on
    (customer_service, billing_period_key) prevents duplicates even if the task
    runs twice in the same day.
    """
    today = date.today()
    created = 0
    skipped = 0

    candidate_ids = list(
        CustomerService.objects.filter(
            status=CustomerService.STATUS_ACTIVE,
            auto_renew=True,
            due_date__isnull=False,
            due_date__lte=today,
        ).values_list("id", flat=True)
    )

    for sub_id in candidate_ids:
        try:
            with transaction.atomic():
                sub = (
                    CustomerService.objects
                    .select_for_update()
                    .select_related("customer", "service")
                    .get(id=sub_id)
                )
                # Re-check state under the lock — another worker may have advanced it.
                if (
                    sub.status != CustomerService.STATUS_ACTIVE
                    or not sub.auto_renew
                    or sub.due_date is None
                    or sub.due_date > today
                ):
                    skipped += 1
                    continue

                period_key = sub.due_date.isoformat()
                price = sub.service.price

                # The UniqueConstraint is the source of truth — get_or_create races
                # cleanly here. Wrap the create in a try in case the constraint fires.
                invoice, was_created = Invoice.objects.get_or_create(
                    customer_service=sub,
                    billing_period_key=period_key,
                    defaults={
                        "customer": sub.customer,
                        "amount": price,
                        "total": price,
                        "issued_date": today,
                        "due_date": sub.due_date,
                        "status": Invoice.STATUS_PENDING,
                        "notes": f"Auto-generated for billing period {period_key}",
                    },
                )

                if was_created:
                    sub.advance_due_date()
                    sub.save(update_fields=["due_date", "renewal_date", "status", "updated_at"])
                    _queue_invoice_issued(invoice)
                    created += 1
                else:
                    skipped += 1
        except IntegrityError:
            # Lost the race against the UniqueConstraint — another worker billed it.
            skipped += 1
            continue
        except Exception as exc:
            logger.exception("generate_due_invoices failed for subscription %s: %s", sub_id, exc)
            skipped += 1
            continue

    logger.info(
        "generate_due_invoices ok created=%s skipped=%s candidates=%s",
        created, skipped, len(candidate_ids),
    )
    return {"created": created, "skipped": skipped, "candidates": len(candidate_ids)}
