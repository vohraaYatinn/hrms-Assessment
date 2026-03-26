"""
HTTP handlers for attendance listing, creation, and daily summaries.
"""

from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action

from core.responses import success_response

from .models import Attendance, AttendanceStatus
from .serializers import AttendanceSerializer


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
