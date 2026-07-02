from rest_framework.routers import DefaultRouter

from .views import CustomerServiceViewSet, UsageRecordViewSet

router = DefaultRouter()
router.register("subscriptions", CustomerServiceViewSet, basename="subscription")
router.register("usage", UsageRecordViewSet, basename="usage")

urlpatterns = router.urls
