"""
Helpers for the standard API success envelope.
"""

from rest_framework.response import Response


def success_response(data=None, message=None, status_code=200):
    """
    Build a JSON response with ``success``, ``data``, and ``message`` keys.

    When ``data`` is not passed, it defaults to an empty dict.
    """
    body = {
        "success": True,
        "data": data if data is not None else {},
        "message": message or "",
    }
    return Response(body, status=status_code)
