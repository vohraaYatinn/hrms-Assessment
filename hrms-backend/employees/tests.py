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
        """POST without employee_id assigns one server-side and wraps success metadata."""
        payload = {
            "full_name": "Test User",
            "email": "test.user@example.com",
            "department": Department.ENGINEERING,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        eid = body["data"]["employee_id"]
        self.assertTrue(eid.startswith("EMP"))
        self.assertIn("Employee created", body["message"])
        self.assertTrue(Employee.objects.filter(employee_id=eid).exists())

    def test_create_employee_duplicate_email(self):
        """Second create with the same email returns 400 with validation envelope."""
        Employee.objects.create(
            employee_id="E200",
            full_name="First",
            email="first@example.com",
            department=Department.HR,
        )
        payload = {
            "full_name": "Second",
            "email": "first@example.com",
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

    def test_list_paginated(self):
        """GET returns wrapped pagination keys: count, results, next."""
        for i in range(5):
            Employee.objects.create(
                employee_id=f"PG{i:03d}",
                full_name=f"Paginated {i}",
                email=f"pag{i}@example.com",
                department=Department.ENGINEERING,
            )
        response = self.client.get(self.list_url, {"page_size": 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertEqual(data["count"], 5)
        self.assertEqual(len(data["results"]), 2)
        self.assertIsNotNone(data["next"])

    def test_list_search(self):
        """``search`` filters by name, email, or employee_id (icontains)."""
        Employee.objects.create(
            employee_id="SRCH01",
            full_name="Alpha Unique",
            email="alpha@example.com",
            department=Department.HR,
        )
        Employee.objects.create(
            employee_id="SRCH02",
            full_name="Beta Other",
            email="beta@example.com",
            department=Department.HR,
        )
        response = self.client.get(self.list_url, {"search": "Unique"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["full_name"], "Alpha Unique")

    def test_list_department_filter(self):
        """``department`` restricts to that department code."""
        Employee.objects.create(
            employee_id="DF01",
            full_name="Eng Person",
            email="eng@example.com",
            department=Department.ENGINEERING,
        )
        Employee.objects.create(
            employee_id="DF02",
            full_name="HR Person",
            email="hrperson@example.com",
            department=Department.HR,
        )
        response = self.client.get(self.list_url, {"department": "HR"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["department"], "HR")

    def test_list_ordering(self):
        """``ordering`` sorts by allowed fields."""
        Employee.objects.create(
            employee_id="ORD03",
            full_name="Zebra",
            email="z@example.com",
            department=Department.HR,
        )
        Employee.objects.create(
            employee_id="ORD01",
            full_name="Apple",
            email="a@example.com",
            department=Department.HR,
        )
        response = self.client.get(self.list_url, {"ordering": "full_name"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [row["full_name"] for row in response.json()["data"]["results"]]
        self.assertEqual(names[0], "Apple")
        self.assertEqual(names[-1], "Zebra")
