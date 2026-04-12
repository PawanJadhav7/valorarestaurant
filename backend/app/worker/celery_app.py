from __future__ import annotations
import os
from celery import Celery
from celery.schedules import crontab

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
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_max_retries=3,
    task_default_retry_delay=60,
    broker_connection_retry_on_startup=True,

    # ── Beat Schedule — Option A: Time-of-day aware, every 15 min ──────────
    beat_schedule={
        # Breakfast 7am-10am: low volume (EST = UTC-5, so 12:00-15:00 UTC)
        "pos-sync-breakfast": {
            "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
            "schedule": crontab(minute="0,15,30,45", hour="12,13,14"),
            "kwargs": {"order_count_hint": 3},
        },
        # Lunch 11am-2pm: high volume (16:00-19:00 UTC)
        "pos-sync-lunch": {
            "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
            "schedule": crontab(minute="0,15,30,45", hour="16,17,18"),
            "kwargs": {"order_count_hint": 12},
        },
        # Afternoon 2pm-5pm: low volume (19:00-22:00 UTC)
        "pos-sync-afternoon": {
            "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
            "schedule": crontab(minute="0,15,30,45", hour="19,20,21"),
            "kwargs": {"order_count_hint": 2},
        },
        # Dinner 5pm-9pm: high volume (22:00-02:00 UTC)
        "pos-sync-dinner": {
            "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
            "schedule": crontab(minute="0,15,30,45", hour="22,23,0,1"),
            "kwargs": {"order_count_hint": 15},
        },
        # Late 9pm-11pm: medium volume (02:00-04:00 UTC)
        "pos-sync-late": {
            "task": "app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
            "schedule": crontab(minute="0,15,30,45", hour="2,3"),
            "kwargs": {"order_count_hint": 5},
        },
        # Closed 11pm-7am: no sync (04:00-12:00 UTC) — intentionally omitted
    },
)
