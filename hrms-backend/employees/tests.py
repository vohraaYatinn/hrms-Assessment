"""
API tests for employee lifecycle endpoints.
"""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from employees.models import Department, Employee


class EmployeeAPITestCase(APITestCase):
    """Cover create (happy path + duplicates) and delete flows."""

    def setUp(self):
        self.list_url = reverse("employee-list")

    def test_create_employee_success(self):
        """POST with valid payload persists an employee and wraps success metadata."""
        payload = {
            "employee_id": "E100",
            "full_name": "Test User",
            "email": "test.user@example.com",
            "department": Department.ENGINEERING,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["employee_id"], "E100")
        self.assertIn("Employee created", body["message"])
        self.assertTrue(Employee.objects.filter(employee_id="E100").exists())

    def test_create_employee_duplicate_employee_id(self):
        """Second create with the same business id returns 400 with validation envelope."""
        Employee.objects.create(
            employee_id="E200",
            full_name="First",
            email="first@example.com",
            department=Department.HR,
        )
        payload = {
            "employee_id": "E200",
            "full_name": "Second",
            "email": "second@example.com",
            "department": Department.FINANCE,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = response.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "VALIDATION_ERROR")

    def test_delete_employee(self):
        """DELETE removes the row and returns a success wrapper."""
        emp = Employee.objects.create(
            employee_id="E300",
            full_name="To Remove",
            email="remove@example.com",
            department=Department.OPERATIONS,
        )
        detail_url = reverse("employee-detail", args=[emp.pk])
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertFalse(Employee.objects.filter(pk=emp.pk).exists())
