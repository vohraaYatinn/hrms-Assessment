"""
Root URL configuration for the HRMS API.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/employees/", include("employees.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("api/dashboard/", include("core.urls")),
]
