from django.contrib import admin

from .models import CommunicationLog, IntegrationSetting


@admin.register(CommunicationLog)
class CommunicationLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "channel", "customer", "status", "sender")
    list_filter = ("channel", "status")
    search_fields = ("customer__full_name", "customer__phone", "message", "subject")


@admin.register(IntegrationSetting)
class IntegrationSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "updated_at")
    search_fields = ("key",)
