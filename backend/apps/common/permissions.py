from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS

SUPER_ADMIN = "Super Admin"
CS_OFFICER = "Customer Service Officer"
FINANCE = "Finance Officer"
OPERATIONS = "Operations Officer"
MANAGER = "Manager"

ALL_ROLES = (SUPER_ADMIN, CS_OFFICER, FINANCE, OPERATIONS, MANAGER)


class HasRolePermission(BasePermission):
    """Allows access when the user's role is whitelisted for the action.

    Viewsets declare a ``required_roles`` mapping of DRF action name -> tuple of
    role names. ``"*"`` is treated as a wildcard for any action not listed.
    Super Admin always passes. Unauthenticated users are denied.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        role_name = getattr(getattr(user, "role", None), "name", None)
        if role_name == SUPER_ADMIN:
            return True

        required = getattr(view, "required_roles", None) or {}
        action = getattr(view, "action", None) or _method_to_action(request.method)
        allowed = required.get(action) or required.get("*")
        if allowed is None:
            return False
        return role_name in allowed


def _method_to_action(method: str) -> str:
    return {
        "GET": "list",
        "POST": "create",
        "PUT": "update",
        "PATCH": "partial_update",
        "DELETE": "destroy",
    }.get(method.upper(), method.lower())


class ReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        return request.method in SAFE_METHODS
