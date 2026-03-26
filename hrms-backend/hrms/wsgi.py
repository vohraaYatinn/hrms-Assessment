"""
WSGI config for the HRMS project.

It exposes the WSGI callable as a module-level variable named ``application``.

For production, point your WSGI server (e.g. Gunicorn) at this module.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrms.settings.production")

application = get_wsgi_application()
