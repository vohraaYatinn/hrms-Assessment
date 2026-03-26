"""
Local development settings: DEBUG on, SQLite, permissive CORS.
"""

from decouple import config

from .base import *  # noqa: F403, F401

DEBUG = config("DEBUG", default=True, cast=bool)

# Hostnames only — no scheme (Django compares to the Host header).
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "hrms-assessment-4l8z.onrender.com",
    "hrms-assessment-five.vercel.app",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = [
    "https://hrms-assessment-4l8z.onrender.com",
    'https://hrms-assessment-five.vercel.app'
]