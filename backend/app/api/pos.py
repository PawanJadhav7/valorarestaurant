# backend/app/api/pos.py

# RETIRE
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.pos_ingestion_service import POSIngestionService

router = APIRouter(prefix="/api/onboarding/pos", tags=["Onboarding"])

class POSOnboardingPayload(BaseModel):
    user_id: str
    provider: str
    mode: str  # "oauth" or "manual"

@router.post("/")
def onboarding_pos(payload: POSOnboardingPayload, db: Session = Depends(get_db)):
    """
    Handles POS onboarding for a tenant:
    - Verifies tenant ownership
    - Initializes POS ingestion
    - Simulates data ingestion for OAuth/manual modes
    """
    try:
        # Fetch tenant_id for the user
        tenant_row = db.execute(
            text("""
                SELECT tenant_id
                FROM app.tenant_user
                WHERE user_id = CAST(:user_id AS uuid)
                  AND role = 'owner'
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {"user_id": payload.user_id}
        ).mappings().first()

        if not tenant_row:
            raise HTTPException(status_code=404, detail="No tenant found for this user")

        tenant_id = str(tenant_row["tenant_id"])

        # Initialize POS ingestion service
        service = POSIngestionService(tenant_id, payload.provider, payload.mode)

        # Handle provider-specific logic
        if payload.provider.lower() == "csv":
            # CSV is manual ingestion
            return {
                "ok": True,
                "tenant_id": tenant_id,
                "provider": payload.provider,
                "mode": payload.mode,
                "message": "CSV import will be handled manually",
            }

        # For OAuth providers (toast, square, clover)
        result = service.start_ingestion()

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "provider": payload.provider,
            "mode": payload.mode,
            "result": result,
        }

    except ValueError as ve:
        # Invalid provider/mode handled by POSIngestionService
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))