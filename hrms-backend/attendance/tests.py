"""
API tests for attendance marking, uniqueness rules, and daily summaries.
"""

from datetime import timedelta

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
        self.by_date_url = reverse("attendance-by-date")
        self.by_range_url = reverse("attendance-by-range")
        self.bulk_url = reverse("attendance-bulk")
        self.demo_past_url = reverse("attendance-demo-past")
        self.purge_url = reverse("attendance-purge")
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

    def test_by_date(self):
        """``by_date`` lists attendance rows for the requested calendar day."""
        today = timezone.localdate()
        Attendance.objects.create(
            employee=self.employee,
            date=today,
            status=AttendanceStatus.PRESENT,
        )
        response = self.client.get(self.by_date_url, {"date": str(today)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(len(body["data"]), 1)
        self.assertEqual(body["data"][0]["employee"], self.employee.pk)

    def test_by_range(self):
        """``by_range`` returns rows between start_date and end_date inclusive."""
        today = timezone.localdate()
        d0 = today - timedelta(days=10)
        d1 = today - timedelta(days=9)
        d2 = today - timedelta(days=8)
        Attendance.objects.create(
            employee=self.employee,
            date=d0,
            status=AttendanceStatus.PRESENT,
        )
        Attendance.objects.create(
            employee=self.employee,
            date=d2,
            status=AttendanceStatus.ABSENT,
        )
        response = self.client.get(
            self.by_range_url,
            {"start_date": str(d1), "end_date": str(d2)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(len(body["data"]), 1)
        self.assertEqual(body["data"][0]["date"], str(d2))

    def test_bulk_all_employees(self):
        """Bulk without ``employee_ids`` updates every employee for the given date."""
        today = timezone.localdate()
        other = Employee.objects.create(
            employee_id="A003",
            full_name="Attendee Three",
            email="attendee.three@example.com",
            department=Department.PRODUCT,
        )
        payload = {
            "date": str(today),
            "status": AttendanceStatus.PRESENT,
        }
        response = self.client.post(self.bulk_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["total"], 2)
        self.assertEqual(body["data"]["created"], 2)
        self.assertEqual(Attendance.objects.filter(date=today).count(), 2)

    def test_bulk_updates_existing(self):
        """Bulk overwrites status when a row already exists for that employee and date."""
        today = timezone.localdate()
        Attendance.objects.create(
            employee=self.employee,
            date=today,
            status=AttendanceStatus.PRESENT,
        )
        payload = {
            "date": str(today),
            "status": AttendanceStatus.ABSENT,
            "employee_ids": [self.employee.pk],
        }
        response = self.client.post(self.bulk_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["created"], 0)
        self.assertEqual(body["data"]["updated"], 1)
        row = Attendance.objects.get(employee=self.employee, date=today)
        self.assertEqual(row.status, AttendanceStatus.ABSENT)

    def test_demo_past_fills_yesterday_only(self):
        """``demo_past`` with days=1 marks only yesterday for all employees."""
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        other = Employee.objects.create(
            employee_id="A004",
            full_name="Attendee Four",
            email="attendee.four@example.com",
            department=Department.PRODUCT,
        )
        response = self.client.post(
            self.demo_past_url,
            {"days": 1, "status": AttendanceStatus.PRESENT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["created"], 2)
        self.assertEqual(body["data"]["updated"], 0)
        self.assertEqual(Attendance.objects.filter(date=yesterday).count(), 2)
        self.assertFalse(Attendance.objects.filter(date=today).exists())

    def test_demo_past_updates_existing(self):
        """``demo_past`` overwrites rows that already exist for those dates."""
        today = timezone.localdate()
        d1 = today - timedelta(days=1)
        Attendance.objects.create(
            employee=self.employee,
            date=d1,
            status=AttendanceStatus.PRESENT,
        )
        response = self.client.post(
            self.demo_past_url,
            {"days": 1, "status": AttendanceStatus.ABSENT},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["created"], 0)
        self.assertEqual(body["data"]["updated"], 1)
        row = Attendance.objects.get(employee=self.employee, date=d1)
        self.assertEqual(row.status, AttendanceStatus.ABSENT)

    def test_demo_past_random_uses_valid_statuses(self):
        """``demo_past`` with RANDOM assigns only PRESENT or ABSENT per cell."""
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        response = self.client.post(
            self.demo_past_url,
            {"days": 1, "status": "RANDOM"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["created"], 1)
        row = Attendance.objects.get(employee=self.employee, date=yesterday)
        self.assertIn(
            row.status,
            (AttendanceStatus.PRESENT, AttendanceStatus.ABSENT),
        )

    def test_purge_removes_all_attendance(self):
        """``purge`` deletes every attendance row."""
        today = timezone.localdate()
        Attendance.objects.create(
            employee=self.employee,
            date=today,
            status=AttendanceStatus.PRESENT,
        )
        response = self.client.delete(self.purge_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["deleted"], 1)
        self.assertEqual(Attendance.objects.count(), 0)
