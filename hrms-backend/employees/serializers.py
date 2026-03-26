"""
Serializers for creating and reading employee resources.
"""

import re

from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Full read/write representation of an ``Employee``.

    Enforces alphanumeric ``employee_id``, unique identifiers, and minimum name length.
    """

    class Meta:
        model = Employee
        fields = (
            "id",
            "employee_id",
            "full_name",
            "email",
            "department",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_employee_id(self, value):
        """Require a non-empty alphanumeric business identifier."""
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("employee_id is required.")
        if not re.fullmatch(r"[A-Za-z0-9]+", value):
            raise serializers.ValidationError("employee_id must be alphanumeric.")
        return value

    def validate_email(self, value):
        """Normalize email and rely on model uniqueness for conflicts."""
        if not (value or "").strip():
            raise serializers.ValidationError("email is required.")
        return value.strip().lower()

    def validate_full_name(self, value):
        """Require a name with at least two characters."""
        name = (value or "").strip()
        if len(name) < 2:
            raise serializers.ValidationError("full_name must be at least 2 characters.")
        return name

    def validate(self, attrs):
        """Cross-field checks for create/update flows."""
        employee_id = attrs.get("employee_id")
        email = attrs.get("email")
        if self.instance is None:
            if Employee.objects.filter(employee_id=employee_id).exists():
                raise serializers.ValidationError(
                    {"employee_id": "An employee with this employee_id already exists."}
                )
            if Employee.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "An employee with this email already exists."})
        else:
            if (
                employee_id
                and Employee.objects.exclude(pk=self.instance.pk)
                .filter(employee_id=employee_id)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"employee_id": "An employee with this employee_id already exists."}
                )
            if (
                email
                and Employee.objects.exclude(pk=self.instance.pk)
                .filter(email__iexact=email)
                .exists()
            ):
                raise serializers.ValidationError({"email": "An employee with this email already exists."})
        return attrs
