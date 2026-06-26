from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "channel", "status", "customer", "user", "interval_key")
    list_filter = ("channel", "status")
    search_fields = ("subject", "message", "customer__full_name", "user__email")
