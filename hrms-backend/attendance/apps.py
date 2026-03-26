from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    """Django app configuration for daily attendance records."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "attendance"
    verbose_name = "Attendance"
