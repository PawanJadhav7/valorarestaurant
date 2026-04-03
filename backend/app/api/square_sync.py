from __future__ import annotations

import logging
import json
from sqlalchemy import text
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.integrations.pos.registry_instance import pos_registry
from app.integrations.pos.repositories import POSRepository
from app.integrations.pos.service import POSIngestionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pos/square", tags=["Square POS"])


# ------------------------------------------------------------------
# Request Models
# ------------------------------------------------------------------

class SyncOrdersRequest(BaseModel):
    tenant_id: str
    location_id: int


# ------------------------------------------------------------------
# POST /api/pos/square/sync
# Manually trigger a Square order sync for a tenant+location
# ------------------------------------------------------------------

@router.post("/sync")
def sync_square_orders(
    payload: SyncOrdersRequest,
    db: Session = Depends(get_db),
):
    """
    Triggers a full order sync from Square for a given tenant + location.
    Uses cursor-based pagination so it picks up from last sync automatically.
    """
    try:
        service = POSIngestionService(db=db, registry=pos_registry)

        result = service.sync_orders(
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            provider="square",
        )

        return result

    except ValueError as e:
        # e.g. "Active POS connection not found"
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.exception("Square sync failed for tenant=%s location=%s",
                         payload.tenant_id, payload.location_id)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# POST /api/pos/square/webhook
# Receives real-time events from Square (order.updated, payment.created, etc.)
# ------------------------------------------------------------------

@router.post("/webhook")
async def square_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Square sends webhook here.
    Tenant is identified by merchant_id in the payload — no hardcoding.
    """
    raw_body = await request.body()
    headers = dict(request.headers)

    try:
        # ---- Parse payload to extract merchant_id ----
        payload = json.loads(raw_body)
        merchant_id = payload.get("merchant_id")

        if not merchant_id:
            raise HTTPException(status_code=400, detail="merchant_id missing from payload")

        # ---- Lookup tenant by merchant_id ----
        repo = POSRepository(db)
        conn = db.execute(text("""
            SELECT *
            FROM restaurant.pos_connection
            WHERE external_merchant_id = :merchant_id
              AND provider = 'square'
              AND status = 'active'
            LIMIT 1
        """), {"merchant_id": merchant_id}).mappings().first()

        if not conn:
            raise HTTPException(
                status_code=404,
                detail=f"No active Square connection for merchant_id={merchant_id}"
            )

        tenant_id = str(conn["tenant_id"])
        location_id = int(conn["location_id"])

        # ---- Verify webhook signature ----
        webhook_secret = conn.get("webhook_secret_encrypted") or ""
        adapter = pos_registry.get("square")

        if webhook_secret:
            is_valid = adapter.verify_webhook_signature(
                headers=headers,
                raw_body=raw_body,
                secret=webhook_secret,
            )
            if not is_valid:
                logger.warning(
                    "Invalid Square webhook signature merchant_id=%s", merchant_id
                )
                raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # ---- Process webhook ----
        service = POSIngestionService(db=db, registry=pos_registry)

        result = service.handle_webhook(
            provider="square",
            headers=headers,
            raw_body=raw_body,
            tenant_id=tenant_id,
            location_id=location_id,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Square webhook failed")
        raise HTTPException(status_code=500, detail=str(e))