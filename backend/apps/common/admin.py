from django.contrib import admin

from .models import CodeCounter


@admin.register(CodeCounter)
class CodeCounterAdmin(admin.ModelAdmin):
    list_display = ("key", "value")
