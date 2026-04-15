from __future__ import annotations
from celery.schedules import crontab
from app.worker.celery_app import celery_app

celery_app.conf.beat_schedule = {
    "sync-all-pos-every-15-mins": {
        "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "beat"},
    },
    "etl-silver-gold-every-30-mins": {
        "task": "app.worker.tasks.etl_silver_gold_task.dispatch_all_silver_gold",
        "schedule": crontab(minute="*/30"),
        "options": {"queue": "beat"},
    },
    "insights-every-60-mins": {
        "task": "app.worker.tasks.etl_insights_task.dispatch_all_insights",
        "schedule": crontab(minute="0", hour="*/1"),
        "options": {"queue": "beat"},
    },
}

celery_app.conf.task_queues = {
    "beat": {},
    "sync": {},
    "default": {},
}
