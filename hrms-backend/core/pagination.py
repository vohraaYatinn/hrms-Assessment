"""
API pagination defaults for list endpoints.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Page-number based pagination with a client-overridable page size (capped)."""

    page_size_query_param = "page_size"
    max_page_size = 100
