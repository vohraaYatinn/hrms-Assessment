"""
Serializers for creating and reading employee resources.
"""

import unicodedata

from rest_framework import serializers

from .models import Employee

_LETTER_CATEGORIES = frozenset({"Lu", "Ll", "Lt", "Lm", "Lo"})
EMPLOYEE_FULL_NAME_MAX_LEN = 100
EMPLOYEE_EMAIL_MAX_LEN = 254


def _is_letters_and_spaces_only(value: str) -> bool:
    """Match frontend rule: Unicode letters and spaces only (no digits or punctuation)."""
    for ch in value:
        if ch.isspace():
            continue
        if unicodedata.category(ch) not in _LETTER_CATEGORIES:
            return False
    return True


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
        raw = (value or "").strip()
        if not raw:
            raise serializers.ValidationError("email is required.")
        if len(raw) > EMPLOYEE_EMAIL_MAX_LEN:
            raise serializers.ValidationError(
                f"email must be at most {EMPLOYEE_EMAIL_MAX_LEN} characters."
            )
        return raw.lower()

    def validate_full_name(self, value):
        """Require 2–100 chars; letters and spaces only (aligned with HRMS UI)."""
        name = (value or "").strip()
        if len(name) < 2:
            raise serializers.ValidationError("full_name must be at least 2 characters.")
        if len(name) > EMPLOYEE_FULL_NAME_MAX_LEN:
            raise serializers.ValidationError(
                f"full_name must be at most {EMPLOYEE_FULL_NAME_MAX_LEN} characters."
            )
        if not _is_letters_and_spaces_only(name):
            raise serializers.ValidationError("full_name may contain only letters and spaces.")
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
