from rest_framework.routers import DefaultRouter

from .views import CustomerServiceViewSet

router = DefaultRouter()
router.register("subscriptions", CustomerServiceViewSet, basename="subscription")

urlpatterns = router.urls
