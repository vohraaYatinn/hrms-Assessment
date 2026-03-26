"""
URL routing for the employees API.
"""

from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet

router = DefaultRouter()
router.register(r"", EmployeeViewSet, basename="employee")

urlpatterns = router.urls
