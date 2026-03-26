"""
Serializers for attendance marking and reporting.
"""

from django.utils import timezone
from rest_framework import serializers

from .models import Attendance, AttendanceStatus

ATTENDANCE_STALE_STATUS_MESSAGE = (
    "Record status has been changed. Please refresh and confirm the attendance change."
)


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Accepts employee primary key on write; exposes derived employee fields on read.

    ``full_name`` and ``department`` are computed from the related ``Employee``.
    """

    full_name = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    expected_current_status = serializers.ChoiceField(
        choices=AttendanceStatus.choices,
        required=False,
        allow_null=True,
        write_only=True,
        help_text=(
            "Client's last-known status for this employee and date: PRESENT, ABSENT, or null "
            "if unmarked. When sent, the server applies the write only if it matches the stored "
            "state (optimistic concurrency)."
        ),
    )

    class Meta:
        model = Attendance
        fields = (
            "id",
            "employee",
            "full_name",
            "department",
            "date",
            "status",
            "created_at",
            "expected_current_status",
        )
        read_only_fields = ("id", "created_at", "full_name", "department")

    def get_full_name(self, obj):
        """Return the related employee display name for API consumers."""
        return obj.employee.full_name

    def get_department(self, obj):
        """Return the related employee department code for API consumers."""
        return obj.employee.department

    def validate_status(self, value):
        """Restrict status to configured choices."""
        if value not in AttendanceStatus.values:
            raise serializers.ValidationError("status must be PRESENT or ABSENT.")
        return value

    def validate_employee(self, value):
        """Ensure the referenced employee exists (enforced by FK) and is non-null."""
        if value is None:
            raise serializers.ValidationError("employee is required.")
        return value

    def validate(self, attrs):
        """Reject future dates and duplicate attendance for the same employee and date."""
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        date_val = attrs.get("date") or getattr(self.instance, "date", None)
        if date_val is not None and date_val > timezone.localdate():
            raise serializers.ValidationError(
                {"date": "Attendance cannot be recorded for a future date."}
            )
        if employee is not None and date_val is not None:
            qs = Attendance.objects.filter(employee=employee, date=date_val)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["Attendance for this employee on this date already exists."]}
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop("expected_current_status", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("expected_current_status", None)
        return super().update(instance, validated_data)


class BulkEmployeeExpectationSerializer(serializers.Serializer):
    """Per-employee expected attendance state before a bulk write."""

    employee_id = serializers.IntegerField(min_value=1)
    expected_current_status = serializers.ChoiceField(
        choices=AttendanceStatus.choices,
        allow_null=True,
    )


class BulkAttendanceSerializer(serializers.Serializer):
    """Apply the same status to many employees for one date (creates or updates rows)."""

    date = serializers.DateField()
    status = serializers.ChoiceField(choices=AttendanceStatus.choices)
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_null=True,
    )
    employee_expectations = BulkEmployeeExpectationSerializer(
        many=True,
        required=False,
        help_text=(
            "When set, each targeted employee must have an entry; stored status must match "
            "expected_current_status (null = unmarked)."
        ),
    )

    def validate_employee_ids(self, value):
        """Empty list means no employees; None is handled in the view (all staff)."""
        if value is not None and len(value) == 0:
            raise serializers.ValidationError("employee_ids cannot be an empty list; omit the field to target all employees.")
        return value

    def validate(self, attrs):
        """Reject future dates; require expectation rows to match the employee set when sent."""
        if attrs["date"] > timezone.localdate():
            raise serializers.ValidationError(
                {"date": "Attendance cannot be recorded for a future date."}
            )
        expectations = attrs.get("employee_expectations")
        ids = attrs.get("employee_ids")
        if not expectations:
            return attrs
        if ids is None:
            raise serializers.ValidationError(
                {
                    "employee_expectations": (
                        "employee_expectations can only be used when employee_ids is provided."
                    )
                }
            )
        exp_by_emp = {row["employee_id"]: row["expected_current_status"] for row in expectations}
        missing = [pk for pk in ids if pk not in exp_by_emp]
        if missing:
            raise serializers.ValidationError(
                {
                    "employee_expectations": (
                        f"Missing expected_current_status for employee_id(s): {sorted(missing)}"
                    )
                }
            )
        extra = set(exp_by_emp.keys()) - set(ids)
        if extra:
            raise serializers.ValidationError(
                {
                    "employee_expectations": (
                        f"Unexpected employee_id(s) in expectations: {sorted(extra)}"
                    )
                }
            )
        return attrs


DEMO_PAST_STATUS_RANDOM = "RANDOM"


class DemoPastAttendanceSerializer(serializers.Serializer):
    """Mark every employee for the last ``days`` calendar days before today (fixed or random status)."""

    days = serializers.IntegerField(min_value=1, max_value=366)
    status = serializers.ChoiceField(
        choices=list(AttendanceStatus.choices)
        + [(DEMO_PAST_STATUS_RANDOM, "Random")],
        default=AttendanceStatus.PRESENT,
    )
