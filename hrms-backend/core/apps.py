from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Django app configuration for shared HRMS utilities and management commands."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
    verbose_name = "Core"
