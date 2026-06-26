from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CommunicationLogViewSet, SendEmailView, SendSMSView

router = DefaultRouter()
router.register("communications/logs", CommunicationLogViewSet, basename="commslog")

urlpatterns = [
    path("communications/sms/", SendSMSView.as_view(), name="comms-sms"),
    path("communications/email/", SendEmailView.as_view(), name="comms-email"),
] + router.urls
