from django.contrib import admin

from .models import CommunicationLog


@admin.register(CommunicationLog)
class CommunicationLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "channel", "customer", "status", "sender")
    list_filter = ("channel", "status")
    search_fields = ("customer__full_name", "customer__phone", "message", "subject")
