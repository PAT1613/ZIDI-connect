from django.contrib import admin

from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("service_code", "name", "price", "billing_cycle", "sla_days", "status")
    list_filter = ("status", "billing_cycle")
    search_fields = ("service_code", "name")
    readonly_fields = ("service_code", "created_at", "updated_at")
