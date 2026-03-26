"""
Employee domain model for HRMS Lite.
"""

from django.db import models


class Department(models.TextChoices):
    """Fixed set of departments used across the organization."""

    ENGINEERING = "ENGINEERING", "Engineering"
    DESIGN = "DESIGN", "Design"
    PRODUCT = "PRODUCT", "Product"
    MARKETING = "MARKETING", "Marketing"
    HR = "HR", "HR"
    FINANCE = "FINANCE", "Finance"
    OPERATIONS = "OPERATIONS", "Operations"


class Employee(models.Model):
    """
    Represents a single employee record with contact and org placement.

    Primary key ``id`` is an auto-incrementing integer as specified.
    """

    id = models.AutoField(primary_key=True)
    employee_id = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=32, choices=Department.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee_id"]

    def __str__(self):
        return f"{self.full_name} ({self.employee_id})"
