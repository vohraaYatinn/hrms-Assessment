from django.apps import AppConfig


class EmployeesConfig(AppConfig):
    """Django app configuration for employee master data."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "employees"
    verbose_name = "Employees"
