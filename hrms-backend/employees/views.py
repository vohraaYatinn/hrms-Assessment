"""
HTTP handlers for employee collection and detail operations.
"""

import uuid

from django.utils.dateparse import parse_date
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from attendance.models import AttendanceStatus
from core.responses import success_response

from .models import Department, Employee
from .pagination import EmployeePagination
from .serializers import EmployeeSerializer


class EmployeeViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    List, create, retrieve, and delete employees.

    Supports full CRUD operations.

    **List query params**

    - ``page``, ``page_size`` — pagination (see :class:`EmployeePagination`).
    - ``search`` — case-insensitive match on ``full_name``, ``email``, ``employee_id``.
    - ``department`` — exact department code (e.g. ``ENGINEERING``).
    - ``employee_id`` — exact business id (case-insensitive).
    - ``ordering`` — sort field(s); prefix ``-`` for descending. Allowed:
      ``full_name``, ``email``, ``created_at``, ``employee_id``, ``department``.
    - ``attendance_date`` — ``YYYY-MM-DD``; use with ``attendance_status`` to restrict the roster
      to employees marked present or absent on that date (unmarked employees are excluded).
    - ``attendance_status`` — ``present`` or ``absent`` (case-insensitive); requires a valid
      ``attendance_date``.
    """

    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    pagination_class = EmployeePagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ("full_name", "email", "employee_id")
    ordering_fields = ("full_name", "email", "created_at", "employee_id", "department")
    ordering = ("full_name", "employee_id")

    def get_queryset(self):
        """Apply ``department`` and ``employee_id`` filters from query params."""
        qs = Employee.objects.all()
        params = self.request.query_params

        dept = (params.get("department") or "").strip().upper()
        if dept:
            valid = {c[0] for c in Department.choices}
            if dept in valid:
                qs = qs.filter(department=dept)

        business_id = (params.get("employee_id") or "").strip()
        if business_id:
            qs = qs.filter(employee_id__iexact=business_id)

        att_date_raw = (params.get("attendance_date") or "").strip()
        att_status_raw = (params.get("attendance_status") or "").strip().upper()
        parsed_date = parse_date(att_date_raw)
        status_by_param = {
            "PRESENT": AttendanceStatus.PRESENT,
            "ABSENT": AttendanceStatus.ABSENT,
        }
        if parsed_date is not None and att_status_raw in status_by_param:
            qs = qs.filter(
                attendance_records__date=parsed_date,
                attendance_records__status=status_by_param[att_status_raw],
            )

        return qs

    def list(self, request, *args, **kwargs):
        """Return a paginated list of employees (filters applied)."""
        response = super().list(request, *args, **kwargs)
        return success_response(data=response.data)

    def create(self, request, *args, **kwargs):
        """Create a new employee and return the created representation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return success_response(
            data=serializer.data,
            message="Employee created successfully.",
            status_code=201,
        )

    def retrieve(self, request, *args, **kwargs):
        """Return a single employee by primary key."""
        response = super().retrieve(request, *args, **kwargs)
        return success_response(data=response.data)

    def destroy(self, request, *args, **kwargs):
        """Delete an employee by primary key."""
        instance = self.get_object()
        self.perform_destroy(instance)
        return success_response(message="Employee deleted successfully.")

    def update(self, request, *args, **kwargs):
        """Replace an employee record by primary key."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return success_response(data=serializer.data, message="Employee updated successfully.")

    def partial_update(self, request, *args, **kwargs):
        """Partially update an employee by primary key."""
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="demo")
    def demo_batch(self, request):
        """Create ``count`` synthetic employees (unique emails; ``employee_id`` from model)."""
        raw = request.data.get("count", 10)
        try:
            n = int(raw)
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "count must be a whole number.",
                        "details": {},
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        n = max(1, min(n, 200))
        dept_codes = [c for c, _ in Department.choices]
        for i in range(n):
            suffix = uuid.uuid4().hex[:12]
            emp = Employee(
                full_name=f"Demo Employee {suffix[:8]}",
                email=f"demo.{suffix}@example.com",
                department=dept_codes[i % len(dept_codes)],
            )
            emp.save()
        return success_response(
            data={"created": n},
            message=f"Created {n} demo employee(s).",
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["delete"], url_path="purge")
    def purge_all(self, request):
        """Delete every employee (attendance rows cascade)."""
        total = Employee.objects.count()
        Employee.objects.all().delete()
        return success_response(
            data={"deleted_employees": total},
            message=f"Deleted {total} employee(s).",
        )
