from __future__ import annotations
# Beat schedule is now configured directly in celery_app.py
# This file exists only to satisfy the Render start command:
# celery -A app.worker.beat_schedule beat --loglevel=info
from app.worker.celery_app import celery_app  # noqa: F401 — imports beat_schedule config
