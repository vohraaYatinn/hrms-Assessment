"""
Root URL configuration for the HRMS API.
"""

from django.contrib import admin
from django.urls import include, path

from core import views as core_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", core_views.health_check),
    path("api/employees/", include("employees.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/dashboard/", include("core.urls")),
]
