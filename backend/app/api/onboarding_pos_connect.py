# backend/app/api/onboarding_pos_connect.py
from __future__ import annotations

import logging
import os

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])

SQUARE_BASE = os.getenv("SQUARE_OAUTH_BASE", "https://connect.squareupsandbox.com")
CLOVER_BASE = os.getenv("CLOVER_API_BASE",   "https://sandbox.dev.clover.com")


class SaveConnectionRequest(BaseModel):
    provider:     str
    api_key:      str
    merchant_id:  str | None = None
    location_ids: list[str]


@router.post("/pos/connect")
def save_pos_connection(payload: SaveConnectionRequest, user_id: str):
    """
    Save POS connection for selected locations.
    Creates dim_location + pos_connection + app.tenant_location
    Saves full address from POS (name, address, city, region, postal_code, timezone)
    Triggers background sync.
    Updates onboarding_status to 'complete'.
    """
    provider     = payload.provider.strip().lower()
    api_key      = payload.api_key.strip()
    location_ids = payload.location_ids

    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required")
    if not location_ids:
        raise HTTPException(status_code=400, detail="At least one location_id is required")
    if provider not in ("square", "clover"):
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    db = next(get_db())
    try:
        # ── Get tenant_id ───────────────────────────────────────────
        owner_row = db.execute(
            text("""
                SELECT tenant_id
                FROM app.tenant_user
                WHERE user_id = CAST(:user_id AS uuid)
                  AND role = 'owner'
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {"user_id": user_id},
        ).mappings().first()

        if not owner_row:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant_id = str(owner_row["tenant_id"])

        # ── Check subscription ──────────────────────────────────────
        sub = db.execute(
            text("""
                SELECT subscription_status
                FROM app.tenant_subscription
                WHERE tenant_id = CAST(:tenant_id AS uuid)
                LIMIT 1
            """),
            {"tenant_id": tenant_id},
        ).mappings().first()

        if not sub or sub["subscription_status"] not in ("trial", "active", "trialing"):
            raise HTTPException(
                status_code=403,
                detail="Active subscription required"
            )

        # ── Fetch full location details from POS ────────────────────
        if provider == "square":
            locations_data = _fetch_square_locations_detail(api_key, location_ids)
            merchant_id    = _get_square_merchant_id(api_key)
        else:
            merchant_id    = payload.merchant_id
            if not merchant_id:
                raise HTTPException(status_code=400, detail="merchant_id required for Clover")
            locations_data = _fetch_clover_location_detail(api_key, merchant_id)

        # ── Get next entity_id ──────────────────────────────────────
        entity_row = db.execute(
            text("""
                SELECT COALESCE(MAX(entity_id), 0) + 1 AS next_entity_id
                FROM restaurant.dim_location
                WHERE tenant_id = CAST(:tenant_id AS uuid)
            """),
            {"tenant_id": tenant_id},
        ).mappings().first()
        next_entity_id = entity_row["next_entity_id"]

        saved_locations = []

        for idx, loc in enumerate(locations_data):
            external_location_id = loc["id"]
            location_name        = loc.get("name", f"Location {idx + 1}")
            business_name        = loc.get("business_name") or location_name
            currency_code        = loc.get("currency", "USD")
            country_code         = loc.get("country", "US")
            address_line         = loc.get("address_line")
            city                 = loc.get("city")
            region               = loc.get("state")
            postal_code          = loc.get("postal_code")
            timezone             = loc.get("timezone")
            entity_id            = next_entity_id + idx
            location_code        = f"{str(entity_id)}_{str(tenant_id)[:8].upper()}"

            # 1. Upsert dim_location with full address
            loc_result = db.execute(
                text("""
                    INSERT INTO restaurant.dim_location (
                        entity_id,
                        location_code,
                        location_name,
                        business_name,
                        tenant_id,
                        external_location_id,
                        primary_pos_provider,
                        currency_code,
                        country_code,
                        address_line,
                        city,
                        region,
                        postal_code,
                        timezone,
                        is_active,
                        created_at
                    )
                    VALUES (
                        :entity_id,
                        :location_code,
                        :location_name,
                        :business_name,
                        CAST(:tenant_id AS uuid),
                        :external_location_id,
                        :provider,
                        :currency_code,
                        :country_code,
                        :address_line,
                        :city,
                        :region,
                        :postal_code,
                        :timezone,
                        true,
                        now()
                    )
                    ON CONFLICT (tenant_id, external_location_id)
                    DO UPDATE SET
                        location_name        = EXCLUDED.location_name,
                        business_name        = EXCLUDED.business_name,
                        primary_pos_provider = EXCLUDED.primary_pos_provider,
                        address_line         = EXCLUDED.address_line,
                        city                 = EXCLUDED.city,
                        region               = EXCLUDED.region,
                        postal_code          = EXCLUDED.postal_code,
                        timezone             = EXCLUDED.timezone,
                        is_active            = true
                    RETURNING location_id
                """),
                {
                    "entity_id":            entity_id,
                    "location_code":        location_code,
                    "location_name":        location_name,
                    "business_name":        business_name,
                    "tenant_id":            tenant_id,
                    "external_location_id": external_location_id,
                    "provider":             provider,
                    "currency_code":        currency_code,
                    "country_code":         country_code,
                    "address_line":         address_line,
                    "city":                 city,
                    "region":               region,
                    "postal_code":          postal_code,
                    "timezone":             timezone,
                },
            )
            location_id = loc_result.scalar_one()

            # 2. Upsert app.tenant_location
            db.execute(
                text("""
                    INSERT INTO app.tenant_location (tenant_id, location_id, is_active)
                    VALUES (CAST(:tenant_id AS uuid), :location_id, true)
                    ON CONFLICT (tenant_id, location_id) DO UPDATE SET is_active = true
                """),
                {"tenant_id": tenant_id, "location_id": location_id},
            )

            # 3. Upsert pos_connection
            db.execute(
                text("""
                    INSERT INTO restaurant.pos_connection (
                        tenant_id,
                        location_id,
                        provider,
                        auth_type,
                        external_merchant_id,
                        external_location_id,
                        api_key,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        CAST(:tenant_id AS uuid),
                        :location_id,
                        :provider,
                        'api_key',
                        :merchant_id,
                        :external_location_id,
                        :api_key,
                        'active',
                        now(),
                        now()
                    )
                    ON CONFLICT (tenant_id, provider, external_location_id)
                    DO UPDATE SET
                        api_key              = EXCLUDED.api_key,
                        external_merchant_id = EXCLUDED.external_merchant_id,
                        status               = 'active',
                        updated_at           = now()
                """),
                {
                    "tenant_id":            tenant_id,
                    "location_id":          location_id,
                    "provider":             provider,
                    "merchant_id":          merchant_id,
                    "external_location_id": external_location_id,
                    "api_key":              api_key,
                },
            )

            saved_locations.append({
                "location_id":          location_id,
                "location_name":        location_name,
                "city":                 city,
                "region":               region,
                "external_location_id": external_location_id,
            })

            logger.info(
                "POS connection saved: tenant=%s provider=%s location=%s external=%s city=%s region=%s",
                tenant_id, provider, location_id, external_location_id, city, region
            )

        # ── Mark tenant data_ready ──────────────────────────────────
        db.execute(
            text("""
                UPDATE app.tenant
                SET data_ready = true
                WHERE tenant_id = CAST(:tenant_id AS uuid)
            """),
            {"tenant_id": tenant_id},
        )

        # ── Update onboarding status ────────────────────────────────
        db.execute(
            text("""
                UPDATE auth.app_user
                SET onboarding_status = 'complete'
                WHERE user_id = CAST(:user_id AS uuid)
            """),
            {"user_id": user_id},
        )

        db.commit()

        # ── Trigger background sync (non-blocking) ──────────────────
        try:
            _trigger_background_sync(tenant_id, provider, saved_locations)
        except Exception as sync_err:
            logger.warning("Background sync trigger failed (non-fatal): %s", sync_err)

        return {
            "ok":        True,
            "tenant_id": tenant_id,
            "provider":  provider,
            "locations": saved_locations,
            "redirect":  "/restaurant",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("POS connect failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _fetch_square_locations_detail(access_token: str, location_ids: list[str]) -> list[dict]:
    """Fetch full location details from Square including address."""
    resp = requests.get(
        f"{SQUARE_BASE}/v2/locations",
        headers={
            "Authorization":  f"Bearer {access_token}",
            "Square-Version": "2024-01-18",
        },
        timeout=15,
    )
    resp.raise_for_status()
    all_locs = resp.json().get("locations", [])
    selected = [l for l in all_locs if l["id"] in location_ids]
    result = []
    for l in selected:
        address = l.get("address") or {}
        result.append({
            "id":           l["id"],
            "name":         l.get("name", "Unnamed"),
            "business_name": l.get("business_name") or l.get("name", "Unnamed"),
            "currency":     l.get("currency", "USD"),
            "country":      address.get("country", "US"),
            "address_line": address.get("address_line_1"),
            "city":         address.get("locality"),
            "state":        address.get("administrative_district_level_1"),
            "postal_code":  address.get("postal_code"),
            "timezone":     l.get("timezone"),
        })
    return result


def _get_square_merchant_id(access_token: str) -> str | None:
    try:
        resp = requests.get(
            f"{SQUARE_BASE}/v2/merchants/me",
            headers={
                "Authorization":  f"Bearer {access_token}",
                "Square-Version": "2024-01-18",
            },
            timeout=15,
        )
        if resp.ok:
            return resp.json().get("merchant", {}).get("id")
    except Exception:
        pass
    return None


def _fetch_clover_location_detail(api_key: str, merchant_id: str) -> list[dict]:
    """Fetch full merchant/location details from Clover including address."""
    resp = requests.get(
        f"{CLOVER_BASE}/v3/merchants/{merchant_id}",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=15,
    )
    resp.raise_for_status()
    m = resp.json()
    address = m.get("address") or {}
    return [{
        "id":           m["id"],
        "name":         m.get("name", "Unnamed"),
        "business_name": m.get("name", "Unnamed"),
        "currency":     "USD",
        "country":      address.get("country", "US"),
        "address_line": address.get("address1"),
        "city":         address.get("city"),
        "state":        address.get("state"),
        "postal_code":  address.get("zip"),
        "timezone":     m.get("timezone"),
    }]


def _trigger_background_sync(tenant_id: str, provider: str, locations: list[dict]) -> None:
    """Trigger Celery sync task for each connected location."""
    render_url = os.getenv("RENDER_URL", "https://valorarestaurant.onrender.com")
    for loc in locations:
        try:
            requests.post(
                f"{render_url}/api/pos/{provider}/sync",
                json={
                    "tenant_id":   tenant_id,
                    "location_id": loc["location_id"],
                },
                timeout=5,
            )
            logger.info(
                "Sync triggered: tenant=%s provider=%s location=%s",
                tenant_id, provider, loc["location_id"]
            )
        except Exception as e:
            logger.warning("Sync trigger failed for location %s: %s", loc["location_id"], e)
