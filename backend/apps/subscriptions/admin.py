from django.contrib import admin

from .models import CustomerService


@admin.register(CustomerService)
class CustomerServiceAdmin(admin.ModelAdmin):
    list_display = ("customer", "service", "start_date", "due_date", "status", "auto_renew")
    list_filter = ("status", "auto_renew", "service")
    search_fields = ("customer__full_name", "customer__customer_code", "service__name")
    autocomplete_fields = ("customer", "service")
