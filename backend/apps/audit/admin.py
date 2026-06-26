from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "action", "module", "object_repr", "ip_address")
    list_filter = ("action", "module")
    search_fields = ("object_repr", "object_id", "user__email")
    readonly_fields = tuple(f.name for f in AuditLog._meta.fields)
