"""
Cross-cutting API views such as dashboard aggregates.
"""

from django.utils import timezone
from rest_framework.decorators import api_view

from attendance.models import Attendance, AttendanceStatus
from core.responses import success_response
from employees.models import Employee


@api_view(["GET"])
def health_check(_request):
    """
    Lightweight liveness check for waking free-tier hosts (e.g. Render) without DB access.
    """
    return success_response(data={"status": "ok"})


@api_view(["GET"])
def dashboard_stats(request):
    """
    Aggregate HR metrics for the dashboard: headcount and today's attendance.

    ``attendance_rate`` is the percentage of employees marked present today
    relative to total active employees (0 if there are no employees).
    """
    today = timezone.localdate()
    total_employees = Employee.objects.count()
    present_today = Attendance.objects.filter(
        date=today,
        status=AttendanceStatus.PRESENT,
    ).count()
    absent_today = Attendance.objects.filter(
        date=today,
        status=AttendanceStatus.ABSENT,
    ).count()
    if total_employees:
        attendance_rate = round((present_today / total_employees) * 100, 2)
    else:
        attendance_rate = 0.0
    return success_response(
        data={
            "total_employees": total_employees,
            "present_today": present_today,
            "absent_today": absent_today,
            "attendance_rate": attendance_rate,
        }
    )
