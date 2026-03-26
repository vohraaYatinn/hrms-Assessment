"""
Centralized DRF exception handling with a consistent JSON error envelope.
"""

import logging

from django.db import IntegrityError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def _flatten_validation_detail(detail):
    """Turn DRF validation detail into a short human-readable message."""
    if detail is None:
        return "Validation failed."
    if isinstance(detail, list):
        parts = []
        for item in detail:
            parts.append(_flatten_validation_detail(item))
        return "; ".join(p for p in parts if p) or "Validation failed."
    if isinstance(detail, dict):
        parts = []
        for key, value in detail.items():
            inner = _flatten_validation_detail(value)
            if key == "non_field_errors":
                parts.append(inner)
            else:
                parts.append(f"{key}: {inner}")
        return "; ".join(parts) if parts else "Validation failed."
    if hasattr(detail, "string"):
        return str(detail.string)
    return str(detail)


def _error_payload(code, message, details=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Build the standard error response body."""
    return Response(
        {
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details if details is not None else {},
            },
        },
        status=status_code,
    )


def custom_exception_handler(exc, context):
    """
    Return errors in the shape::

        {
            "success": false,
            "error": {
                "code": "...",
                "message": "...",
                "details": {}
            }
        }
    """
    if isinstance(exc, IntegrityError):
        logger.warning("IntegrityError: %s", exc)
        message = str(exc)
        if "unique" in message.lower() or "duplicate" in message.lower():
            friendly = "This record conflicts with an existing unique constraint."
            if "attendance" in message.lower():
                friendly = "Attendance for this employee on this date already exists."
            return _error_payload("INTEGRITY_ERROR", friendly, {"detail": message})

    if isinstance(exc, Http404):
        return _error_payload(
            "NOT_FOUND",
            "The requested resource was not found.",
            {},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    response = drf_exception_handler(exc, context)

    if response is None:
        logger.error("Unhandled API exception: %s", exc, exc_info=True)
        return _error_payload(
            "SERVER_ERROR",
            "An unexpected error occurred.",
            {},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, ValidationError):
        details = response.data if isinstance(response.data, (dict, list)) else {"detail": response.data}
        message = _flatten_validation_detail(response.data)
        return _error_payload("VALIDATION_ERROR", message, details if isinstance(details, dict) else {"detail": details})

    if isinstance(exc, NotFound):
        return _error_payload(
            "NOT_FOUND",
            _flatten_validation_detail(response.data),
            response.data if isinstance(response.data, dict) else {},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, PermissionDenied):
        return _error_payload(
            "PERMISSION_DENIED",
            _flatten_validation_detail(response.data),
            response.data if isinstance(response.data, dict) else {},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, APIException):
        code = getattr(exc, "default_code", "API_ERROR")
        code = str(code).upper() if code else "API_ERROR"
        detail = response.data
        message = _flatten_validation_detail(detail)
        details = detail if isinstance(detail, dict) else {"detail": detail}
        return _error_payload(code, message, details, status_code=response.status_code)

    details = response.data if isinstance(response.data, dict) else {"detail": response.data}
    message = _flatten_validation_detail(response.data)
    return _error_payload("ERROR", message, details, status_code=response.status_code)
