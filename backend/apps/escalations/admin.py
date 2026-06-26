from django.contrib import admin

from .models import Escalation


@admin.register(Escalation)
class EscalationAdmin(admin.ModelAdmin):
    list_display = ("opened_at", "customer_service", "status", "assigned_to", "resolved_at")
    list_filter = ("status",)
    search_fields = (
        "customer_service__customer__full_name",
        "customer_service__service__name",
        "notes", "reason",
    )
    autocomplete_fields = ("customer_service", "assigned_to")
