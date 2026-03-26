"""
Local development settings: DEBUG on, SQLite, permissive CORS.
"""

from decouple import config

from .base import *  # noqa: F403, F401

DEBUG = config("DEBUG", default=True, cast=bool)

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

CORS_ALLOW_ALL_ORIGINS = True
