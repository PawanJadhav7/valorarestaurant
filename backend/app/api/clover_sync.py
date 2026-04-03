from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.integrations.pos.registry_instance import pos_registry
from app.integrations.pos.repositories import POSRepository
from app.integrations.pos.service import POSIngestionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pos/clover", tags=["Clover POS"])


class SyncOrdersRequest(BaseModel):
    tenant_id: str
    location_id: int


# ------------------------------------------------------------------
# POST /api/pos/clover/sync
# ------------------------------------------------------------------

@router.post("/sync")
def sync_clover_orders(
    payload: SyncOrdersRequest,
    db: Session = Depends(get_db),
):
    try:
        service = POSIngestionService(db=db, registry=pos_registry)

        result = service.sync_orders(
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            provider="clover",
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.exception("Clover sync failed tenant=%s location=%s",
                         payload.tenant_id, payload.location_id)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------
# GET /api/pos/clover/webhook — Clover verification ping
# ------------------------------------------------------------------

@router.get("/webhook")
async def clover_webhook_verify(request: Request):
    return {"status": "ok"}


# ------------------------------------------------------------------
# POST /api/pos/clover/webhook
# ------------------------------------------------------------------

@router.post("/webhook")
async def clover_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    headers = dict(request.headers)

    # ---- Handle empty body or verification ping ----
    if not raw_body or raw_body.strip() == b"":
        return {"status": "ok"}

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return {"status": "ok"}


    # ---- Handle Clover verification code ----
    verification_code = payload.get("verificationCode")
    if verification_code:
        logger.info("Clover verification code received: %s", verification_code)
        return {"status": "ok", "verificationCode": verification_code}

    # ---- Handle real webhook events ----
    merchant_id = (
            payload.get("merchantId")
            or payload.get("merchant_id")
    )

    if not merchant_id:
        logger.info("Clover verification ping - no merchantId, returning ok")
        return {"status": "ok"}

    try:
        # ---- Lookup tenant by merchant_id ----
        conn = db.execute(text("""
            SELECT *
            FROM restaurant.pos_connection
            WHERE external_merchant_id = :merchant_id
              AND provider = 'clover'
              AND status = 'active'
            LIMIT 1
        """), {"merchant_id": merchant_id}).mappings().first()

        if not conn:
            raise HTTPException(
                status_code=404,
                detail=f"No active Clover connection for merchant_id={merchant_id}"
            )

        tenant_id = str(conn["tenant_id"])
        location_id = int(conn["location_id"])

        # ---- Verify webhook signature ----
        webhook_secret = conn.get("webhook_secret_encrypted") or ""
        adapter = pos_registry.get("clover")

        if webhook_secret:
            is_valid = adapter.verify_webhook_signature(
                headers=headers,
                raw_body=raw_body,
                secret=webhook_secret,
            )
            if not is_valid:
                logger.warning(
                    "Invalid Clover webhook signature merchant_id=%s", merchant_id
                )
                raise HTTPException(status_code=401, detail="Invalid webhook signature")

        # ---- Process webhook ----
        service = POSIngestionService(db=db, registry=pos_registry)

        result = service.handle_webhook(
            provider="clover",
            headers=headers,
            raw_body=raw_body,
            tenant_id=tenant_id,
            location_id=location_id,
        )

        return result

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Clover webhook failed")
        raise HTTPException(status_code=500, detail=str(e))