from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1_patterns = [
    path("auth/", include("apps.accounts.urls_auth")),
    path("", include("apps.accounts.urls")),
    path("", include("apps.customers.urls")),
    path("", include("apps.services.urls")),
    path("", include("apps.subscriptions.urls")),
    path("", include("apps.invoicing.urls")),
    path("", include("apps.communications.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.escalations.urls")),
    path("", include("apps.reporting.urls")),
    path("", include("apps.audit.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]
