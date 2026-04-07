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


@router.get("/square/callback")
def square_callback(request: Request, code: str, state: str):
    """
    Square redirects here after OAuth with ?code=...&state=tenant_id
    Saves merchant, locations to pos_connection + dim_location
    """
    tenant_id = state
    db = next(get_db())

    try:
        # ── Step 1: Exchange code for access token ──
        token_url = f"{os.getenv('SQUARE_OAUTH_BASE', 'https://connect.squareupsandbox.com')}/oauth2/token"

        resp = requests.post(token_url, json={
            "client_id":     os.getenv("SQUARE_APP_ID"),
            "client_secret": os.getenv("SQUARE_APP_SECRET"),
            "code":          code,
            "grant_type":    "authorization_code",
            "redirect_uri":  os.getenv("SQUARE_REDIRECT_URI"),
        }, timeout=30)
        resp.raise_for_status()
        token_data    = resp.json()
        access_token  = token_data["access_token"]
        merchant_id   = token_data.get("merchant_id")

        # ── Step 2: Fetch ALL locations from Square ──
        loc_resp = requests.get(
            f"{os.getenv('SQUARE_OAUTH_BASE', 'https://connect.squareupsandbox.com')}/v2/locations",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        loc_resp.raise_for_status()
        locations = loc_resp.json().get("locations", [])

        if not locations:
            raise ValueError("No locations found in Square account")

        # ── Step 3: Get next entity_id ──
        entity_row = db.execute(text("""
            SELECT COALESCE(MAX(entity_id), 0) + 1 AS next_entity_id
            FROM restaurant.dim_location
            WHERE tenant_id = CAST(:tenant_id AS uuid)
        """), {"tenant_id": tenant_id}).mappings().first()
        next_entity_id = entity_row["next_entity_id"]

        # ── Step 4: For each location — upsert dim_location + pos_connection ──
        for idx, loc in enumerate(locations):
            external_location_id = loc["id"]
            location_name        = loc.get("name", f"Location {idx + 1}")
            currency_code        = loc.get("currency", "USD")
            country_code         = loc.get("country", "US")
            entity_id            = next_entity_id + idx

            # Upsert dim_location
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
                    'square',
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
                "entity_id":           entity_id,
                "location_code":       str(entity_id),
                "location_name":       location_name,
                "tenant_id":           tenant_id,
                "external_location_id": external_location_id,
                "currency_code":       currency_code,
                "country_code":        country_code,
            })
            location_id = loc_result.scalar_one()

            # Upsert pos_connection
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
                    'square',
                    'oauth',
                    :merchant_id,
                    :external_location_id,
                    :access_token,
                    'active'
                )
                ON CONFLICT (tenant_id, provider, external_location_id)
                DO UPDATE SET
                    access_token_encrypted = EXCLUDED.access_token_encrypted,
                    external_merchant_id   = EXCLUDED.external_merchant_id,
                    status                 = 'active'
            """), {
                "tenant_id":           tenant_id,
                "location_id":         location_id,
                "merchant_id":         merchant_id,
                "external_location_id": external_location_id,
                "access_token":        access_token,
            })

            logger.info(
                "Square location saved: tenant=%s location=%s external=%s",
                tenant_id, location_id, external_location_id
            )

        db.commit()

        # ── Step 5: Redirect to frontend ──
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{frontend_url}/restaurant?pos=square&status=connected")

    except Exception as e:
        db.rollback()
        logger.exception("Square OAuth callback failed")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()