from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BulkSendView,
    CommunicationLogViewSet,
    IntegrationSettingsView,
    SendEmailView,
    SendSMSView,
    TestEmailView,
    TestSMSView,
)

router = DefaultRouter()
router.register("communications/logs", CommunicationLogViewSet, basename="commslog")

urlpatterns = [
    path("communications/sms/", SendSMSView.as_view(), name="comms-sms"),
    path("communications/email/", SendEmailView.as_view(), name="comms-email"),
    path("communications/bulk/", BulkSendView.as_view(), name="comms-bulk"),
    path("integrations/settings/", IntegrationSettingsView.as_view(), name="integrations-settings"),
    path("integrations/test-sms/", TestSMSView.as_view(), name="integrations-test-sms"),
    path("integrations/test-email/", TestEmailView.as_view(), name="integrations-test-email"),
] + router.urls
