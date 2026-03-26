"""
Serializers for attendance marking and reporting.
"""

from rest_framework import serializers

from .models import Attendance, AttendanceStatus


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Accepts employee primary key on write; exposes derived employee fields on read.

    ``full_name`` and ``department`` are computed from the related ``Employee``.
    """

    full_name = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

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
        """Reject duplicate attendance for the same employee and date."""
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        date_val = attrs.get("date") or getattr(self.instance, "date", None)
        if employee is not None and date_val is not None:
            qs = Attendance.objects.filter(employee=employee, date=date_val)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": ["Attendance for this employee on this date already exists."]}
                )
        return attrs


class BulkAttendanceSerializer(serializers.Serializer):
    """Apply the same status to many employees for one date (creates or updates rows)."""

    date = serializers.DateField()
    status = serializers.ChoiceField(choices=AttendanceStatus.choices)
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_null=True,
    )

    def validate_employee_ids(self, value):
        """Empty list means no employees; None is handled in the view (all staff)."""
        if value is not None and len(value) == 0:
            raise serializers.ValidationError("employee_ids cannot be an empty list; omit the field to target all employees.")
        return value


DEMO_PAST_STATUS_RANDOM = "RANDOM"


class DemoPastAttendanceSerializer(serializers.Serializer):
    """Mark every employee for the last ``days`` calendar days before today (fixed or random status)."""

    days = serializers.IntegerField(min_value=1, max_value=366)
    status = serializers.ChoiceField(
        choices=list(AttendanceStatus.choices)
        + [(DEMO_PAST_STATUS_RANDOM, "Random")],
        default=AttendanceStatus.PRESENT,
    )
