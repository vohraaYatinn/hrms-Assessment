"""
HTTP handlers for employee collection and detail operations.
"""

from rest_framework import mixins, viewsets

from core.responses import success_response

from .models import Employee
from .serializers import EmployeeSerializer


class EmployeeViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    List, create, retrieve, and delete employees.

    Update (PUT/PATCH) is intentionally omitted per API design.
    """

    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    def list(self, request, *args, **kwargs):
        """Return a paginated list of all employees."""
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
