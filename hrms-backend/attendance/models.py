"""
Attendance records keyed by employee and calendar date.
"""

from django.db import models

from employees.models import Employee


class AttendanceStatus(models.TextChoices):
    """Allowed attendance states for a given day."""

    PRESENT = "PRESENT", "Present"
    ABSENT = "ABSENT", "Absent"


class Attendance(models.Model):
    """
    One row per employee per day.

    ``unique_together`` enforces a single row per (employee, date). Concurrent saves use upserts
    or row locks so two HR users cannot create two rows for the same cell; the last committed
    ``status`` wins if they disagree.
    """

    id = models.AutoField(primary_key=True)
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=AttendanceStatus.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("employee", "date")
        ordering = ["-date", "employee__employee_id"]

    def __str__(self):
        return f"{self.employee.employee_id} @ {self.date} ({self.status})"
