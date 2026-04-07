# backend/app/api/onboarding_pos_locations.py
from __future__ import annotations

import logging
import os

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])

SQUARE_BASE  = os.getenv("SQUARE_OAUTH_BASE", "https://connect.squareupsandbox.com")
CLOVER_BASE  = os.getenv("CLOVER_API_BASE",   "https://sandbox.dev.clover.com")


class FetchLocationsRequest(BaseModel):
    provider:    str
    api_key:     str
    merchant_id: str | None = None


@router.post("/pos/locations")
def fetch_pos_locations(payload: FetchLocationsRequest):
    """
    Fetch locations from Square or Clover using the provided API key.
    Returns a standardised list of locations for the frontend location picker.
    """
    provider = payload.provider.strip().lower()
    api_key  = payload.api_key.strip()

    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required")

    if provider == "square":
        return _fetch_square_locations(api_key)
    elif provider == "clover":
        if not payload.merchant_id:
            raise HTTPException(status_code=400, detail="merchant_id is required for Clover")
        return _fetch_clover_locations(api_key, payload.merchant_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")


# ─────────────────────────────────────────────
# SQUARE
# ─────────────────────────────────────────────

def _fetch_square_locations(access_token: str) -> dict:
    try:
        resp = requests.get(
            f"{SQUARE_BASE}/v2/locations",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type":  "application/json",
                "Square-Version": "2024-01-18",
            },
            timeout=15,
        )

        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid Square API key")
        if resp.status_code == 403:
            raise HTTPException(status_code=403, detail="Square API key lacks permission to read locations")
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=f"Square API error: {resp.text[:200]}")

        data      = resp.json()
        locations = data.get("locations", [])

        if not locations:
            raise HTTPException(status_code=404, detail="No locations found in this Square account")

        # Standardise
        result = []
        for loc in locations:
            address = loc.get("address") or {}
            result.append({
                "id":                  loc["id"],
                "name":                loc.get("name", "Unnamed Location"),
                "address":             address.get("address_line_1"),
                "city":                address.get("locality"),
                "state":               address.get("administrative_district_level_1"),
                "country":             address.get("country", "US"),
                "currency":            loc.get("currency", "USD"),
                "external_location_id": loc["id"],
                "postal_code":         address.get("postal_code"),
                "timezone":            loc.get("timezone"),
                "business_name":       loc.get("business_name") or loc.get("name", "Unnamed"),
            })

        return {"ok": True, "provider": "square", "locations": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Square location fetch failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# CLOVER
# ─────────────────────────────────────────────

def _fetch_clover_locations(api_key: str, merchant_id: str) -> dict:
    try:
        resp = requests.get(
            f"{CLOVER_BASE}/v3/merchants/{merchant_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            timeout=15,
        )

        if resp.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid Clover API key")
        if resp.status_code == 403:
            raise HTTPException(status_code=403, detail="Clover API key lacks permission")
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Clover merchant not found")
        if not resp.ok:
            raise HTTPException(status_code=resp.status_code, detail=f"Clover API error: {resp.text[:200]}")

        merchant = resp.json()
        address  = merchant.get("address") or {}

        result = [{
            "id":                  merchant["id"],
            "name":                merchant.get("name", "Unnamed Location"),
            "address":             address.get("address1"),
            "city":                address.get("city"),
            "state":               address.get("state"),
            "country":             address.get("country", "US"),
            "currency":            "USD",
            "external_location_id": merchant["id"],
        }]

        return {"ok": True, "provider": "clover", "locations": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Clover location fetch failed")
        raise HTTPException(status_code=500, detail=str(e))
