from __future__ import annotations

import os
import requests
import logging

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text
from app.db import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


@router.get("/square/callback")
def square_callback(request: Request, code: str, state: str):
    """
    Square redirects here after OAuth with ?code=...&state=tenant_id
    """
    tenant_id = state
    db = next(get_db())

    try:
        # Step 1: Exchange code for access token
        token_url = f"{os.getenv('SQUARE_OAUTH_BASE', 'https://connect.squareupsandbox.com')}/oauth2/token"

        resp = requests.post(token_url, json={
            "client_id": os.getenv("SQUARE_APP_ID"),
            "client_secret": os.getenv("SQUARE_APP_SECRET"),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": os.getenv("SQUARE_REDIRECT_URI"),
        })
        resp.raise_for_status()
        token_data = resp.json()

        access_token = token_data["access_token"]
        merchant_id = token_data.get("merchant_id")

        # Step 2: Fetch location ID from Square
        loc_resp = requests.get(
            f"{os.getenv('SQUARE_OAUTH_BASE', 'https://connect.squareupsandbox.com')}/v2/locations",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        loc_resp.raise_for_status()
        locations = loc_resp.json().get("locations", [])
        external_location_id = locations[0]["id"] if locations else merchant_id

        # Step 3: Save connection to DB
        db.execute(
            text("""
                INSERT INTO app.pos_connection (
                    tenant_id,
                    provider,
                    auth_type,
                    access_token_encrypted,
                    external_location_id,
                    is_active
                )
                VALUES (
                    CAST(:tenant_id AS uuid),
                    'square',
                    'oauth',
                    :access_token,
                    :external_location_id,
                    true
                )
                ON CONFLICT (tenant_id, provider)
                DO UPDATE SET
                    access_token_encrypted = EXCLUDED.access_token_encrypted,
                    external_location_id   = EXCLUDED.external_location_id,
                    is_active              = true
            """),
            {
                "tenant_id": tenant_id,
                "access_token": access_token,
                "external_location_id": external_location_id,
            }
        )
        db.commit()

        # Step 4: Redirect to frontend
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return {"ok": True, "redirect": f"{frontend_url}/restaurant"}

    except Exception as e:
        db.rollback()
        logger.exception("Square OAuth callback failed")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        db.close()