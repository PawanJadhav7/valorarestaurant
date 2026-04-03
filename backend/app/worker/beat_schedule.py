from __future__ import annotations

from celery.schedules import crontab
from app.worker.celery_app import celery_app

celery_app.conf.beat_schedule = {
    "sync-all-pos-every-15-mins": {
        "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
        "options": {"queue": "beat"},
    },
}

celery_app.conf.task_queues = {
    "beat": {},       # For scheduler
    "sync": {},       # For sync tasks
    "default": {},    # Fallback
}