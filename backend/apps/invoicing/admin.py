from django.contrib import admin

from .models import Invoice, Payment


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "customer", "total", "status", "issued_date", "due_date")
    list_filter = ("status",)
    search_fields = ("invoice_number", "customer__full_name", "customer__customer_code")
    readonly_fields = ("invoice_number", "created_at", "updated_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("invoice", "amount", "method", "paid_at", "received_by")
    list_filter = ("method",)
    search_fields = ("invoice__invoice_number", "reference")
