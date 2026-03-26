"""
API pagination defaults for list endpoints.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.utils.urls import remove_query_param, replace_query_param


class StandardPagination(PageNumberPagination):
    """Page-number based pagination with a client-overridable page size (capped)."""

    page_size_query_param = "page_size"
    max_page_size = 100

    def get_next_link(self):
        """
        Use a path-only URL so pagination does not call ``build_absolute_uri()`` / ``get_host()``.

        A mismatched ``Host`` header (proxy, health checks, alternate domains) would otherwise
        raise ``DisallowedHost``, which DRF does not map to an API response and becomes a 500
        ``SERVER_ERROR`` from the custom exception handler.
        """
        if not self.page.has_next():
            return None
        url = self.request.get_full_path()
        page_number = self.page.next_page_number()
        return replace_query_param(url, self.page_query_param, page_number)

    def get_previous_link(self):
        if not self.page.has_previous():
            return None
        url = self.request.get_full_path()
        page_number = self.page.previous_page_number()
        if page_number == 1:
            return remove_query_param(url, self.page_query_param)
        return replace_query_param(url, self.page_query_param, page_number)
