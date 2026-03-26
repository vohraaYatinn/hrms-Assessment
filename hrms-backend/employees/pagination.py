"""
Pagination for the employees collection API.
"""

from core.pagination import StandardPagination


class EmployeePagination(StandardPagination):
    """
    Page-number pagination for employee lists.

    Query params: ``page``, ``page_size`` (capped for bulk sync / table views).
    """

    page_size = 20
    max_page_size = 200
