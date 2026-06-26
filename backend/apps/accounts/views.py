from __future__ import annotations

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.permissions import HasRolePermission, SUPER_ADMIN, MANAGER

from .models import Role, User
from .serializers import (
    LoginSerializer,
    PasswordResetRequestSerializer,
    RoleSerializer,
    UserSerializer,
)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response(
            {
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data["refresh"],
                "user": UserSerializer(user).data,
            }
        )


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Stub — actual reset email could be wired through Celery later.
        return Response({"detail": "If an account exists, a reset email has been sent."})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("role").all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = ("email", "full_name", "phone")
    ordering_fields = ("email", "full_name", "created_at")
    filterset_fields = ("is_active", "role__name")
    required_roles = {
        "list": (SUPER_ADMIN, MANAGER),
        "retrieve": (SUPER_ADMIN, MANAGER),
        "create": (SUPER_ADMIN,),
        "update": (SUPER_ADMIN,),
        "partial_update": (SUPER_ADMIN,),
        "destroy": (SUPER_ADMIN,),
    }


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    search_fields = ("name",)
    ordering_fields = ("name",)
    required_roles = {
        "list": (SUPER_ADMIN, MANAGER, "Customer Service Officer", "Finance Officer", "Operations Officer"),
        "retrieve": (SUPER_ADMIN, MANAGER),
        "create": (SUPER_ADMIN,),
        "update": (SUPER_ADMIN,),
        "partial_update": (SUPER_ADMIN,),
        "destroy": (SUPER_ADMIN,),
    }
