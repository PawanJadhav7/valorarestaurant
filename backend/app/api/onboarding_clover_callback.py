# backend/app/api/onboarding_clover_callback.py
from fastapi import APIRouter, Request, HTTPException
from app.services.pos_ingestion_service import POSIngestionService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/onboarding/pos/clover", tags=["CloverOnboarding"])

@router.get("/callback")
async def clover_callback(request: Request):
    # Extract OAuth code and tenant reference
    code = request.query_params.get("code")
    tenant_id = request.query_params.get("state") or request.query_params.get("merchant_id")

    if not code or not tenant_id:
        raise HTTPException(status_code=400, detail="Missing code or tenant reference")

    try:
        # Initialize POS service
        pos_service = POSIngestionService(tenant_id=tenant_id, provider="clover", mode="oauth")

        # Exchange code for access token
        token_response = pos_service.exchange_code_for_token(code)

        # Step 1a: Debug print
        logger.info(f"Clover token response: {token_response}")
        print(f"Clover token response: {token_response}")  # just to see in terminal

        access_token = token_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token from Clover")

        # Fetch initial data
        initial_data = pos_service.fetch_initial_data(access_token)
        logger.info(f"Initial Clover data fetched for tenant {tenant_id}: {initial_data}")

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "data_rows_fetched": len(initial_data.get("elements", []))
        }

    except Exception as e:
        logger.error(f"Clover callback processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))