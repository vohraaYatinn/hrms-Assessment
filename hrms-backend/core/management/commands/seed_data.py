"""
Load deterministic sample employees and attendance for manual and automated testing.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from attendance.models import Attendance, AttendanceStatus
from employees.models import Department, Employee


class Command(BaseCommand):
    """Create five employees and ten attendance rows in a single transaction."""

    help = "Seed the database with sample employees and attendance records."

    def handle(self, *args, **options):
        with transaction.atomic():
            Attendance.objects.all().delete()
            Employee.objects.all().delete()

            employees_data = [
                ("E001", "Alice Johnson", "alice@example.com", Department.ENGINEERING),
                ("E002", "Bob Smith", "bob@example.com", Department.PRODUCT),
                ("E003", "Carol Davis", "carol@example.com", Department.DESIGN),
                ("E004", "Dan Wilson", "dan@example.com", Department.MARKETING),
                ("E005", "Eve Martinez", "eve@example.com", Department.HR),
            ]
            employees = []
            for eid, name, email, dept in employees_data:
                employees.append(
                    Employee(
                        employee_id=eid,
                        full_name=name,
                        email=email,
                        department=dept,
                    )
                )
            Employee.objects.bulk_create(employees)
            employees = list(Employee.objects.all())

            today = timezone.localdate()
            attendance_specs = [
                (0, today, AttendanceStatus.PRESENT),
                (1, today, AttendanceStatus.PRESENT),
                (2, today, AttendanceStatus.ABSENT),
                (3, today - timedelta(days=1), AttendanceStatus.PRESENT),
                (4, today - timedelta(days=1), AttendanceStatus.PRESENT),
                (0, today - timedelta(days=1), AttendanceStatus.ABSENT),
                (1, today - timedelta(days=2), AttendanceStatus.PRESENT),
                (2, today - timedelta(days=2), AttendanceStatus.PRESENT),
                (3, today - timedelta(days=2), AttendanceStatus.ABSENT),
                (4, today - timedelta(days=3), AttendanceStatus.PRESENT),
            ]
            rows = [
                Attendance(employee=employees[idx], date=d, status=st)
                for idx, d, st in attendance_specs
            ]
            Attendance.objects.bulk_create(rows)

        self.stdout.write(self.style.SUCCESS("Seeded 5 employees and 10 attendance records."))
