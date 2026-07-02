from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DeliveryCallbackView, DeviceRegisterView, NotificationViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path(
        "notifications/delivery-callback/",
        DeliveryCallbackView.as_view(),
        name="notification-delivery-callback",
    ),
    path(
        "devices/register/",
        DeviceRegisterView.as_view(),
        name="device-register",
    ),
] + router.urls
