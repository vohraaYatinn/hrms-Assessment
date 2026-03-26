"""
API tests for attendance marking, uniqueness rules, and daily summaries.
"""

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from attendance.models import Attendance, AttendanceStatus
from employees.models import Department, Employee


class AttendanceAPITestCase(APITestCase):
    """Cover attendance create, duplicate protection, and ``today_summary``."""

    def setUp(self):
        self.list_url = reverse("attendance-list")
        self.today_summary_url = reverse("attendance-today-summary")
        self.employee = Employee.objects.create(
            employee_id="A001",
            full_name="Attendee One",
            email="attendee.one@example.com",
            department=Department.ENGINEERING,
        )

    def test_mark_attendance_success(self):
        """Valid attendance row is created and echoed in the success payload."""
        today = timezone.localdate()
        payload = {
            "employee": self.employee.pk,
            "date": str(today),
            "status": AttendanceStatus.PRESENT,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["full_name"], self.employee.full_name)
        self.assertEqual(body["data"]["department"], self.employee.department)
        self.assertTrue(
            Attendance.objects.filter(employee=self.employee, date=today).exists()
        )

    def test_mark_attendance_duplicate(self):
        """Same employee and date cannot be posted twice."""
        today = timezone.localdate()
        Attendance.objects.create(
            employee=self.employee,
            date=today,
            status=AttendanceStatus.PRESENT,
        )
        payload = {
            "employee": self.employee.pk,
            "date": str(today),
            "status": AttendanceStatus.ABSENT,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = response.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "VALIDATION_ERROR")

    def test_today_summary(self):
        """``today_summary`` reflects counts for the current local date."""
        today = timezone.localdate()
        other = Employee.objects.create(
            employee_id="A002",
            full_name="Attendee Two",
            email="attendee.two@example.com",
            department=Department.PRODUCT,
        )
        Attendance.objects.create(
            employee=self.employee,
            date=today,
            status=AttendanceStatus.PRESENT,
        )
        Attendance.objects.create(
            employee=other,
            date=today,
            status=AttendanceStatus.ABSENT,
        )
        response = self.client.get(self.today_summary_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["date"], str(today))
        self.assertEqual(body["data"]["present"], 1)
        self.assertEqual(body["data"]["absent"], 1)
