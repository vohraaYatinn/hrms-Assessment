"""
Production settings: DEBUG off, PostgreSQL from DATABASE_URL, strict hosts and CORS.
"""

import os
from urllib.parse import urlparse

from decouple import Csv, config

from .base import *  # noqa: F403, F401

DEBUG = False


def _host_from_entry(entry: str) -> str:
    entry = entry.strip()
    if not entry:
        return ""
    if entry.startswith("http://") or entry.startswith("https://"):
        return urlparse(entry).hostname or ""
    return entry


def _collect_allowed_hosts() -> list[str]:
    raw = [_host_from_entry(h) for h in config("ALLOWED_HOSTS", default="").split(",")]
    hosts = [h for h in raw if h]

    render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
    if render_host and render_host not in hosts:
        hosts.append(render_host)

    render_url = os.environ.get("RENDER_EXTERNAL_URL", "").strip()
    if render_url:
        parsed = urlparse(render_url).hostname
        if parsed and parsed not in hosts:
            hosts.append(parsed)

    return hosts


ALLOWED_HOSTS = _collect_allowed_hosts()
if not ALLOWED_HOSTS:
    raise ValueError(
        "ALLOWED_HOSTS is empty. On Render the hostname is set automatically; "
        "otherwise set ALLOWED_HOSTS to your domain(s), hostnames only (no https://)."
    )

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

_csrf_origins = [o.strip() for o in config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv()) if o.strip()]
_render_ext = os.environ.get("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
if _render_ext and _render_ext not in _csrf_origins:
    _csrf_origins.append(_render_ext)
CSRF_TRUSTED_ORIGINS = _csrf_origins

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
