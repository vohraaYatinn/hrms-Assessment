"""
Serializers for creating and reading employee resources.
"""

from rest_framework import serializers

from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Full read/write representation of an ``Employee``.

    ``employee_id`` is assigned by the server (``EMP{pk:04d}``) and is not
    accepted from clients on create or update.
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
        read_only_fields = ("id", "employee_id", "created_at", "updated_at")

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
        """Cross-field checks for create/update flows (email uniqueness)."""
        email = attrs.get("email")
        if self.instance is None:
            if email and Employee.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError(
                    {"email": "An employee with this email already exists."}
                )
        else:
            if (
                email
                and Employee.objects.exclude(pk=self.instance.pk)
                .filter(email__iexact=email)
                .exists()
            ):
                raise serializers.ValidationError(
                    {"email": "An employee with this email already exists."}
                )
        return attrs
