from __future__ import annotations

import os
import logging
import requests

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from app.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


@router.get("/clover/callback")
def clover_callback(request: Request, code: str, state: str):
    """
    Clover redirects here after OAuth with ?code=...&state=tenant_id
    Saves merchant, locations to pos_connection + dim_location
    """
    tenant_id = state
    db = next(get_db())

    try:
        clover_base = os.getenv("CLOVER_API_BASE", "https://sandbox.dev.clover.com")

        # ── Step 1: Exchange code for access token ──
        token_url = f"{clover_base}/oauth/token"
        resp = requests.post(token_url, data={
            "client_id":     os.getenv("CLOVER_APP_ID"),
            "client_secret": os.getenv("CLOVER_CLIENT_SECRET"),
            "code":          code,
            "grant_type":    "authorization_code",
        }, timeout=30)
        resp.raise_for_status()
        token_data   = resp.json()
        access_token = token_data.get("access_token")
        merchant_id  = token_data.get("merchant_id")

        if not access_token:
            raise ValueError("No access token returned from Clover")

        # ── Step 2: Fetch merchant info from Clover ──
        merchant_resp = requests.get(
            f"{clover_base}/v3/merchants/{merchant_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        merchant_resp.raise_for_status()
        merchant_data = merchant_resp.json()
        location_name = merchant_data.get("name", "Clover Location")
        currency_code = merchant_data.get("currency", "USD")
        country_code  = merchant_data.get("address", {}).get("country", "US")

        # ── Step 3: Get next entity_id ──
        entity_row = db.execute(text("""
            SELECT COALESCE(MAX(entity_id), 0) + 1 AS next_entity_id
            FROM restaurant.dim_location
            WHERE tenant_id = CAST(:tenant_id AS uuid)
        """), {"tenant_id": tenant_id}).mappings().first()
        next_entity_id = entity_row["next_entity_id"]

        # ── Step 4: Upsert dim_location ──
        # In Clover, merchant_id = location_id
        loc_result = db.execute(text("""
            INSERT INTO restaurant.dim_location (
                entity_id,
                location_code,
                location_name,
                tenant_id,
                external_location_id,
                primary_pos_provider,
                currency_code,
                country_code,
                is_active,
                created_at
            )
            VALUES (
                :entity_id,
                :location_code,
                :location_name,
                CAST(:tenant_id AS uuid),
                :external_location_id,
                'clover',
                :currency_code,
                :country_code,
                true,
                now()
            )
            ON CONFLICT (tenant_id, external_location_id)
            DO UPDATE SET
                location_name        = EXCLUDED.location_name,
                primary_pos_provider = EXCLUDED.primary_pos_provider,
                is_active            = true
            RETURNING location_id
        """), {
            "entity_id":           next_entity_id,
            "location_code":       str(next_entity_id),
            "location_name":       location_name,
            "tenant_id":           tenant_id,
            "external_location_id": merchant_id,  # Clover uses merchant_id as location
            "currency_code":       currency_code,
            "country_code":        country_code,
        })
        location_id = loc_result.scalar_one()

        # ── Step 5: Upsert pos_connection ──
        db.execute(text("""
            INSERT INTO restaurant.pos_connection (
                tenant_id,
                location_id,
                provider,
                auth_type,
                external_merchant_id,
                external_location_id,
                access_token_encrypted,
                status
            )
            VALUES (
                CAST(:tenant_id AS uuid),
                :location_id,
                'clover',
                'oauth',
                :merchant_id,
                :merchant_id,
                :access_token,
                'active'
            )
            ON CONFLICT (tenant_id, provider, external_location_id)
            DO UPDATE SET
                access_token_encrypted = EXCLUDED.access_token_encrypted,
                external_merchant_id   = EXCLUDED.external_merchant_id,
                status                 = 'active'
        """), {
            "tenant_id":   tenant_id,
            "location_id": location_id,
            "merchant_id": merchant_id,
            "access_token": access_token,
        })

        db.commit()

        logger.info(
            "Clover location saved: tenant=%s location=%s merchant=%s",
            tenant_id, location_id, merchant_id
        )

        # ── Step 6: Redirect to frontend ──
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{frontend_url}/restaurant?pos=clover&status=connected")

    except Exception as e:
        db.rollback()
        logger.exception("Clover OAuth callback failed")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()