"""
HTTP handlers for attendance listing, creation, and daily summaries.
"""

import random
from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from core.responses import success_response
from employees.models import Employee

from .models import Attendance, AttendanceStatus
from .serializers import (
    AttendanceSerializer,
    BulkAttendanceSerializer,
    DEMO_PAST_STATUS_RANDOM,
    DemoPastAttendanceSerializer,
)


def _parse_ymd(value):
    """Parse ``YYYY-MM-DD`` or return ``None``."""
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


class AttendanceViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    List and create attendance rows; supports filtering and a fixed ``today_summary`` report.
    """

    serializer_class = AttendanceSerializer
    queryset = Attendance.objects.select_related("employee").all()

    def get_queryset(self):
        """Apply optional filters: ``employee_id`` (business id), ``date``, ``status``."""
        qs = super().get_queryset()
        employee_id = self.request.query_params.get("employee_id")
        date_param = self.request.query_params.get("date")
        status_param = self.request.query_params.get("status")
        if employee_id:
            qs = qs.filter(employee__employee_id=employee_id)
        if date_param:
            qs = qs.filter(date=date_param)
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs

    def list(self, request, *args, **kwargs):
        """Return a paginated list of attendance records, honoring query filters."""
        response = super().list(request, *args, **kwargs)
        return success_response(data=response.data)

    def create(self, request, *args, **kwargs):
        """Create a single attendance row after serializer validation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return success_response(
            data=serializer.data,
            message="Attendance recorded successfully.",
            status_code=201,
        )

    @action(detail=False, methods=["get"], url_path="by_date")
    def by_date(self, request):
        """Return every attendance row for a single calendar date (no pagination)."""
        date_param = request.query_params.get("date")
        if not date_param:
            raise ValidationError({"date": "This query parameter is required (YYYY-MM-DD)."})
        qs = (
            self.get_queryset()
            .filter(date=date_param)
            .order_by("employee__employee_id", "employee_id")
        )
        serializer = self.get_serializer(qs, many=True)
        return success_response(data=serializer.data)

    @action(detail=False, methods=["get"], url_path="by_range")
    def by_range(self, request):
        """
        Return every attendance row between ``start_date`` and ``end_date`` (inclusive).

        Both query parameters are required (``YYYY-MM-DD``). Not paginated — suitable for
        calendar / matrix views over modest ranges (e.g. one month).
        """
        start_d = _parse_ymd(request.query_params.get("start_date"))
        end_d = _parse_ymd(request.query_params.get("end_date"))
        if not start_d or not end_d:
            raise ValidationError(
                {
                    "start_date": "Required (YYYY-MM-DD).",
                    "end_date": "Required (YYYY-MM-DD).",
                }
            )
        if start_d > end_d:
            raise ValidationError(
                {"end_date": "end_date must be on or after start_date."}
            )
        span = (end_d - start_d).days + 1
        if span > 366:
            raise ValidationError(
                {"detail": "Range cannot exceed 366 days."}
            )
        qs = (
            Attendance.objects.filter(date__gte=start_d, date__lte=end_d)
            .select_related("employee")
            .order_by("employee__full_name", "employee_id", "date")
        )
        serializer = self.get_serializer(qs, many=True)
        return success_response(data=serializer.data)

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """
        Set attendance for many employees on one date.

        Omit ``employee_ids`` to apply ``status`` to every employee. When provided, only those
        primary keys are updated. Existing rows for the same employee/date are overwritten.
        """
        ser = BulkAttendanceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        day = ser.validated_data["date"]
        new_status = ser.validated_data["status"]
        ids = ser.validated_data.get("employee_ids")

        emp_qs = Employee.objects.all().order_by("pk")
        if ids is not None:
            emp_qs = emp_qs.filter(pk__in=ids)
            found = set(emp_qs.values_list("pk", flat=True))
            missing = set(ids) - found
            if missing:
                raise ValidationError(
                    {"employee_ids": f"Unknown employee id(s): {sorted(missing)}"}
                )

        emp_ids = list(emp_qs.values_list("pk", flat=True))
        if not emp_ids:
            return success_response(
                data={"created": 0, "updated": 0, "total": 0},
                message="No employees matched.",
            )

        existing = {
            row.employee_id: row
            for row in Attendance.objects.filter(date=day, employee_id__in=emp_ids)
        }
        to_create = []
        to_update = []
        for pk in emp_ids:
            if pk in existing:
                row = existing[pk]
                if row.status != new_status:
                    row.status = new_status
                    to_update.append(row)
            else:
                to_create.append(
                    Attendance(employee_id=pk, date=day, status=new_status)
                )

        with transaction.atomic():
            if to_create:
                Attendance.objects.bulk_create(to_create, batch_size=500)
            if to_update:
                Attendance.objects.bulk_update(to_update, ["status"], batch_size=500)

        return success_response(
            data={
                "created": len(to_create),
                "updated": len(to_update),
                "total": len(emp_ids),
            },
            message="Attendance saved.",
        )

    @action(detail=False, methods=["get"], url_path="today_summary")
    def today_summary(self, request):
        """
        Return present and absent counts for the current local calendar date.

        Counts are derived only from stored attendance rows for ``today``.
        """
        today = timezone.localdate()
        rows = (
            Attendance.objects.filter(date=today)
            .values("status")
            .annotate(count=Count("id"))
        )
        by_status = {row["status"]: row["count"] for row in rows}
        present = by_status.get(AttendanceStatus.PRESENT, 0)
        absent = by_status.get(AttendanceStatus.ABSENT, 0)
        return success_response(
            data={
                "date": str(today),
                "present": present,
                "absent": absent,
            }
        )

    @action(detail=False, methods=["post"], url_path="demo_past")
    def demo_past(self, request):
        """
        For each of the last ``days`` calendar days strictly before today, set attendance
        for all employees. Use ``status`` PRESENT, ABSENT, or RANDOM (per employee per day).
        Existing rows are overwritten.
        """
        ser = DemoPastAttendanceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        n_days = ser.validated_data["days"]
        status_mode = ser.validated_data["status"]

        today = timezone.localdate()
        dates = [today - timedelta(days=i) for i in range(1, n_days + 1)]
        emp_ids = list(Employee.objects.order_by("pk").values_list("pk", flat=True))
        if not emp_ids:
            return success_response(
                data={
                    "days": n_days,
                    "dates": [str(d) for d in dates],
                    "employees": 0,
                    "created": 0,
                    "updated": 0,
                },
                message="No employees to mark.",
            )

        existing_rows = Attendance.objects.filter(
            date__in=dates,
            employee_id__in=emp_ids,
        )
        keyed = {(row.employee_id, row.date): row for row in existing_rows}

        choices = [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT]

        def target_status_for(_pk, _day):
            if status_mode == DEMO_PAST_STATUS_RANDOM:
                return random.choice(choices)
            return status_mode

        to_create = []
        to_update = []
        for day in dates:
            for pk in emp_ids:
                key = (pk, day)
                new_status = target_status_for(pk, day)
                if key in keyed:
                    row = keyed[key]
                    if row.status != new_status:
                        row.status = new_status
                        to_update.append(row)
                else:
                    to_create.append(
                        Attendance(employee_id=pk, date=day, status=new_status)
                    )

        with transaction.atomic():
            if to_create:
                Attendance.objects.bulk_create(to_create, batch_size=500)
            if to_update:
                Attendance.objects.bulk_update(to_update, ["status"], batch_size=500)

        return success_response(
            data={
                "days": n_days,
                "dates": [str(d) for d in dates],
                "employees": len(emp_ids),
                "created": len(to_create),
                "updated": len(to_update),
            },
            message=f"Demo attendance applied for {n_days} past day(s).",
        )

    @action(detail=False, methods=["delete"], url_path="purge")
    def purge(self, request):
        """Remove every attendance row (employees are unchanged)."""
        deleted, _ = Attendance.objects.all().delete()
        return success_response(
            data={"deleted": deleted},
            message="All attendance records removed.",
        )
