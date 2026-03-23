# backend/app/api/onboarding_pos.py
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import text
from app.db import get_db
import logging
from app.services.pos_ingestion_service import POSIngestionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


class POSOnboardingPayload(BaseModel):
    user_id: str
    provider: str
    mode: str  # "oauth" or "manual"


@router.post("/pos")
def save_pos(payload: POSOnboardingPayload):
    db = next(get_db())
    try:
        provider = payload.provider.strip().lower()
        mode = payload.mode.strip().lower()

        if provider not in {"toast", "square", "clover", "csv"}:
            raise HTTPException(status_code=400, detail="Invalid POS provider")

        if mode not in {"oauth", "manual"}:
            raise HTTPException(status_code=400, detail="Invalid connection mode")

        # Fetch tenant for this user
        owner_row = db.execute(
            text("""
                SELECT tenant_id
                FROM app.tenant_user
                WHERE user_id = CAST(:user_id AS uuid)
                  AND role = 'owner'
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {"user_id": payload.user_id},
        ).mappings().first()

        if not owner_row:
            raise HTTPException(status_code=404, detail="No tenant found for this user")

        tenant_id = str(owner_row["tenant_id"])

        # Update onboarding status to POS done
        db.execute(
            text("""
                UPDATE auth.app_user
                SET onboarding_status = 'pos_done'
                WHERE user_id = CAST(:user_id AS uuid)
            """),
            {"user_id": payload.user_id},
        )
        db.commit()

        # Handle Clover OAuth flow
        if provider == "clover" and mode == "oauth":
            oauth_url = POSIngestionService(tenant_id, provider, mode).get_clover_oauth_url(tenant_id)
            return {"ok": True, "tenant_id": tenant_id, "oauth_url": oauth_url}

        # For manual or CSV mode, just trigger ingestion
        pos_service = POSIngestionService(tenant_id, provider, mode)
        ingestion_result = pos_service.start_ingestion()
        logger.info(f"POS ingestion result: {ingestion_result}")

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "provider": provider,
            "mode": mode,
            "ingestion_triggered": True
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ------------------ Clover OAuth callback endpoint ------------------ #
@router.get("/pos/clover/callback")
def clover_callback(request: Request):
    code = request.query_params.get("code")
    state = request.query_params.get("state")  # tenant_id

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state in callback")

    try:
        pos_service = POSIngestionService(state, "clover", "oauth")
        token_data = pos_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")

        # Fetch initial data
        data = pos_service.fetch_initial_data(access_token)
        logger.info(f"Clover initial data fetched for tenant {state}: {len(data.get('elements', []))} items")

        # TODO: save token_data and fetched data to your DB

        return {"ok": True, "message": "Clover connected and initial data fetched", "tenant_id": state}

    except Exception as e:
        logger.error(f"Clover OAuth callback failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))