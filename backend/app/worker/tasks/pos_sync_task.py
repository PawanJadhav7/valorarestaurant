from __future__ import annotations

import logging

from celery import shared_task
from sqlalchemy import text

from app.db import get_db
from app.integrations.pos.registry_instance import pos_registry
from app.integrations.pos.service import POSIngestionService
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# MASTER TASK — runs every 15 mins via Beat
# Queries all active POS connections and spawns individual sync tasks
# ------------------------------------------------------------------

@celery_app.task(
    name="app.worker.tasks.pos_sync_task.dispatch_all_pos_syncs",
    queue="beat",
    bind=True,
    max_retries=1,
)
def dispatch_all_pos_syncs(self):
    """
    Master scheduler task.
    Fetches all active POS connections and dispatches
    individual sync tasks for each tenant+provider+location.
    """
    logger.info("Starting POS sync dispatch")

    db = next(get_db())
    try:
        connections = db.execute(text("""
            SELECT
                tenant_id::text,
                location_id,
                provider
            FROM restaurant.pos_connection
            WHERE status = 'active'
        """)).mappings().all()

        dispatched = 0
        for conn in connections:
            try:
                sync_pos_orders_task.apply_async(
                    kwargs={
                        "tenant_id": conn["tenant_id"],
                        "location_id": conn["location_id"],
                        "provider": conn["provider"],
                    },
                    queue="sync",
                )
                dispatched += 1
                logger.info(
                    "Dispatched sync task tenant=%s provider=%s location=%s",
                    conn["tenant_id"],
                    conn["provider"],
                    conn["location_id"],
                )
            except Exception as e:
                logger.error(
                    "Failed to dispatch sync for tenant=%s provider=%s: %s",
                    conn["tenant_id"],
                    conn["provider"],
                    str(e),
                )

        logger.info("Dispatched %s sync tasks", dispatched)
        return {"dispatched": dispatched}

    except Exception as e:
        logger.exception("dispatch_all_pos_syncs failed: %s", str(e))
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()


# ------------------------------------------------------------------
# WORKER TASK — runs per tenant+provider+location
# Actually calls the sync logic
# ------------------------------------------------------------------

@celery_app.task(
    name="app.worker.tasks.pos_sync_task.sync_pos_orders_task",
    queue="sync",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def sync_pos_orders_task(
    self,
    *,
    tenant_id: str,
    location_id: int,
    provider: str,
):
    """
    Individual sync task per tenant + provider + location.
    Retries up to 3 times on failure with 60s delay.
    """
    logger.info(
        "Running sync task tenant=%s provider=%s location=%s",
        tenant_id, provider, location_id,
    )

    db = next(get_db())
    try:
        service = POSIngestionService(db=db, registry=pos_registry)

        result = service.sync_orders(
            tenant_id=tenant_id,
            location_id=location_id,
            provider=provider,
        )

        logger.info(
            "Sync complete tenant=%s provider=%s processed=%s failed=%s",
            tenant_id,
            provider,
            result.get("processed_orders", 0),
            result.get("failed_orders", 0),
        )

        return result

    except NotImplementedError as e:
        logger.warning(
            "Provider not implemented yet, skipping: provider=%s error=%s",
            provider, str(e)
        )
        return {"status": "skipped", "reason": str(e)}

    except Exception as e:
        logger.exception(
            "Sync failed tenant=%s provider=%s location=%s: %s",
            tenant_id, provider, location_id, str(e),
        )
        raise self.retry(exc=e, countdown=60)

    finally:
        db.close()