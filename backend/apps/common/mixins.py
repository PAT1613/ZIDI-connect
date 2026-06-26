"""Cross-cutting ViewSet mixins."""
from __future__ import annotations

from django.db import transaction


def _is_super_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    role = getattr(getattr(user, "role", None), "name", None)
    return role == "Super Admin"


def _force_cascade_delete(instance) -> None:
    """Recursively delete reverse-FK children, bypassing PROTECT.

    Walks reverse one-to-many / one-to-one relations and deletes each
    related object the same way (depth-first) before deleting `instance`.
    Safe to call inside a transaction; if a child raises, the whole
    operation rolls back.
    """
    for field in instance._meta.get_fields():
        if not (field.one_to_many or field.one_to_one):
            continue
        if field.auto_created and not field.concrete:
            accessor = field.get_accessor_name()
        else:
            continue
        related = getattr(instance, accessor, None)
        if related is None:
            continue
        if field.one_to_one:
            try:
                _force_cascade_delete(related)
            except Exception:
                pass
        else:
            for child in list(related.all()):
                _force_cascade_delete(child)
    instance.delete()


class SuperAdminCascadeDestroyMixin:
    """Override perform_destroy so Super Admin can wipe anything in one call.

    Non-admin roles fall through to normal delete (so PROTECT still guards
    them). Super Admin walks reverse FKs and force-deletes children first.
    """

    @transaction.atomic
    def perform_destroy(self, instance):
        request = getattr(self, "request", None)
        user = getattr(request, "user", None) if request else None
        if _is_super_admin(user):
            _force_cascade_delete(instance)
        else:
            instance.delete()
