from __future__ import annotations
import logging
import subprocess
import sys
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(
    name="app.worker.tasks.etl_insights_task.dispatch_all_insights",
    queue="beat",
    bind=True,
    max_retries=1,
)
def dispatch_all_insights(self):
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
                run_insights_task.apply_async(
                    kwargs={"tenant_id": conn["tenant_id"], "location_id": conn["location_id"]},
                    queue="sync",
                )
                dispatched += 1
                logger.info("Dispatched Insights tenant=%s location=%s", conn["tenant_id"], conn["location_id"])
            except Exception as e:
                logger.error("Failed to dispatch Insights tenant=%s: %s", conn["tenant_id"], str(e))
        logger.info("Dispatched %s Insights tasks", dispatched)
        return {"dispatched": dispatched}
    except Exception as e:
        logger.exception("dispatch_all_insights failed: %s", str(e))
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()

@celery_app.task(
    name="app.worker.tasks.etl_insights_task.run_insights_task",
    queue="sync",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def run_insights_task(self, *, tenant_id: str, location_id: int):
    logger.info("Running Insights tenant=%s location=%s", tenant_id, location_id)
    try:
        result = subprocess.run(
            [sys.executable, "scripts/generate_insights.py",
             "--tenant-id", tenant_id, "--location-id", str(location_id)],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Insights failed: {result.stderr}")
        logger.info("Insights done tenant=%s location=%s: %s",
                    tenant_id, location_id, result.stdout.strip().split('\n')[-1])
        return {"status": "success", "tenant_id": tenant_id, "location_id": location_id}
    except Exception as e:
        logger.exception("Insights failed tenant=%s location=%s: %s", tenant_id, location_id, str(e))
        raise self.retry(exc=e, countdown=60)
