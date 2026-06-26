from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("customer_code", "full_name", "phone", "email", "status", "registration_date")
    list_filter = ("status",)
    search_fields = ("customer_code", "full_name", "phone", "email", "national_id")
    readonly_fields = ("customer_code", "registration_date", "created_at", "updated_at")
