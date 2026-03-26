"""
Production settings: DEBUG off, PostgreSQL from DATABASE_URL, strict hosts and CORS.
"""

from urllib.parse import urlparse

from decouple import Csv, config

from .base import *  # noqa: F403, F401

DEBUG = False

ALLOWED_HOSTS = [h.strip() for h in config("ALLOWED_HOSTS", default="").split(",") if h.strip()]

DATABASE_URL = config("DATABASE_URL", default="")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in production.")

url = urlparse(DATABASE_URL)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": url.path[1:] if url.path else "",
        "USER": url.username or "",
        "PASSWORD": url.password or "",
        "HOST": url.hostname or "",
        "PORT": str(url.port or 5432),
        "CONN_MAX_AGE": 60,
    }
}

_cors_origins = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins if o.strip()]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
