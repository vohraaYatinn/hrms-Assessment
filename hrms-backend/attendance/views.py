"""
HTTP handlers for attendance listing, creation, and daily summaries.
"""

import random
from datetime import datetime, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from core.responses import success_response
from employees.models import Employee

from .models import Attendance, AttendanceStatus
from .serializers import (
    ATTENDANCE_STALE_STATUS_MESSAGE,
    AttendanceSerializer,
    BulkAttendanceSerializer,
    DEMO_PAST_STATUS_RANDOM,
    DemoPastAttendanceSerializer,
)

_UNSET = object()


def _actual_status_for_employee_day(employee_pk, day):
    """Return stored status or ``None`` if there is no row for that employee and date."""
    row = Attendance.objects.filter(employee_id=employee_pk, date=day).first()
    return row.status if row else None


def _require_expectation_matches(employee_pk, day, expected):
    """
    If ``expected`` is ``_UNSET``, skip. Otherwise require DB state to match ``expected``
    (``None`` means client believes the cell is unmarked).
    """
    if expected is _UNSET:
        return
    actual = _actual_status_for_employee_day(employee_pk, day)
    if actual != expected:
        raise ValidationError(ATTENDANCE_STALE_STATUS_MESSAGE)


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
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    List, create, retrieve, update, and delete attendance rows; supports filtering and reports.
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
        """
        Create one attendance row.

        Normal duplicate (same employee + date) is rejected in the serializer. If two clients
        race and both pass validation, the database unique constraint fires; we then update the
        existing row so the API still succeeds (last write wins for ``status``).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.validated_data["employee"]
        day = serializer.validated_data["date"]
        status_val = serializer.validated_data["status"]
        expected = serializer.validated_data.get("expected_current_status", _UNSET)
        _require_expectation_matches(employee.pk, day, expected)
        try:
            with transaction.atomic():
                row = Attendance.objects.create(
                    employee=employee,
                    date=day,
                    status=status_val,
                )
        except IntegrityError as exc:
            try:
                with transaction.atomic():
                    row = Attendance.objects.select_for_update().get(
                        employee=employee,
                        date=day,
                    )
                    _require_expectation_matches(employee.pk, day, expected)
                    row.status = status_val
                    row.save(update_fields=["status"])
            except Attendance.DoesNotExist:
                raise exc
            out = self.get_serializer(row)
            return success_response(
                data=out.data,
                message="Attendance saved (existing row updated).",
            )
        out = self.get_serializer(row)
        return success_response(
            data=out.data,
            message="Attendance recorded successfully.",
            status_code=201,
        )

    def retrieve(self, request, *args, **kwargs):
        """Return one attendance row by primary key."""
        response = super().retrieve(request, *args, **kwargs)
        return success_response(data=response.data)

    def update(self, request, *args, **kwargs):
        """Replace or partially update an attendance row."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        expected = serializer.validated_data.get("expected_current_status", _UNSET)
        if expected is not _UNSET:
            _require_expectation_matches(instance.employee_id, instance.date, expected)
        self.perform_update(serializer)
        return success_response(
            data=serializer.data,
            message="Attendance updated successfully.",
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete an attendance row by primary key."""
        instance = self.get_object()
        self.perform_destroy(instance)
        return success_response(message="Attendance deleted successfully.")

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
        primary keys are updated. At most **one** row exists per employee per day (unique in DB).

        Uses an atomic upsert (PostgreSQL / SQLite) so two HR sessions saving the same cell at
        the same time do not raise duplicate-key errors.

        When ``employee_expectations`` is sent (requires ``employee_ids``), each cell must still
        match the client's last-known status (``null`` = unmarked); otherwise the request fails
        with a validation error so stale tabs do not silently overwrite.
        """
        ser = BulkAttendanceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        day = ser.validated_data["date"]
        new_status = ser.validated_data["status"]
        ids = ser.validated_data.get("employee_ids")
        raw_expectations = ser.validated_data.get("employee_expectations") or []
        exp_by_emp = {
            row["employee_id"]: row["expected_current_status"] for row in raw_expectations
        }

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

        if exp_by_emp:
            for pk in emp_ids:
                _require_expectation_matches(pk, day, exp_by_emp[pk])

        before_pks = set(
            Attendance.objects.filter(
                date=day,
                employee_id__in=emp_ids,
            ).values_list("employee_id", flat=True)
        )
        rows = [
            Attendance(employee_id=pk, date=day, status=new_status) for pk in emp_ids
        ]
        with transaction.atomic():
            if rows:
                Attendance.objects.bulk_create(
                    rows,
                    batch_size=500,
                    update_conflicts=True,
                    update_fields=["status"],
                    unique_fields=["employee", "date"],
                )

        created = sum(1 for pk in emp_ids if pk not in before_pks)
        updated = sum(1 for pk in emp_ids if pk in before_pks)

        return success_response(
            data={
                "created": created,
                "updated": updated,
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
