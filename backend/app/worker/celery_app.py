from __future__ import annotations

import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "valora",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.worker.tasks.pos_sync_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,                    # Only ack after task completes
    worker_prefetch_multiplier=1,           # One task at a time per worker
    task_max_retries=3,                     # Retry failed tasks 3 times
    task_default_retry_delay=60,            # Wait 60s before retry
)