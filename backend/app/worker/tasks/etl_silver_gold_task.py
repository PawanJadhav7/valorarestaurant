from __future__ import annotations
import logging
import subprocess
import sys
from datetime import date, timedelta
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(
    name="app.worker.tasks.etl_silver_gold_task.dispatch_all_silver_gold",
    queue="beat",
    bind=True,
    max_retries=1,
)
def dispatch_all_silver_gold(self):
    from app.db import get_db
    from sqlalchemy import text
    db = next(get_db())
    try:
        connections = db.execute(text("""
            SELECT DISTINCT tenant_id::text, location_id
            FROM restaurant.pos_connection
            WHERE status = 'active'
        """)).mappings().all()
        dispatched = 0
        for conn in connections:
            try:
                run_silver_gold_task.apply_async(
                    kwargs={"tenant_id": conn["tenant_id"], "location_id": conn["location_id"]},
                    queue="sync",
                )
                dispatched += 1
                logger.info("Dispatched Silver→Gold tenant=%s location=%s", conn["tenant_id"], conn["location_id"])
            except Exception as e:
                logger.error("Failed to dispatch Silver→Gold tenant=%s: %s", conn["tenant_id"], str(e))
        logger.info("Dispatched %s Silver→Gold tasks", dispatched)
        return {"dispatched": dispatched}
    except Exception as e:
        logger.exception("dispatch_all_silver_gold failed: %s", str(e))
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()

@celery_app.task(
    name="app.worker.tasks.etl_silver_gold_task.run_silver_gold_task",
    queue="sync",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def run_silver_gold_task(self, *, tenant_id: str, location_id: int):
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    logger.info("Running ETL tenant=%s location=%s range=%s->%s", tenant_id, location_id, yesterday, today)
    try:
        result = subprocess.run(
            [sys.executable, "scripts/bronze_to_silver_etl.py",
             "--tenant-id", tenant_id, "--location-id", str(location_id),
             "--start", yesterday, "--end", today],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Bronze->Silver failed: {result.stderr}")
        logger.info("Bronze->Silver done: %s", result.stdout.strip().split('\n')[-1])
        result = subprocess.run(
            [sys.executable, "scripts/silver_to_gold_etl.py",
             "--tenant-id", tenant_id, "--location-id", str(location_id),
             "--start", yesterday, "--end", today],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Silver->Gold failed: {result.stderr}")
        logger.info("Silver->Gold done: %s", result.stdout.strip().split('\n')[-1])
        return {"status": "success", "tenant_id": tenant_id, "location_id": location_id}
    except Exception as e:
        logger.exception("ETL failed tenant=%s location=%s: %s", tenant_id, location_id, str(e))
        raise self.retry(exc=e, countdown=30)
