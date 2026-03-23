from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from ValoraEngine.generation_orchestrator import (
    generate_daily_insights,
    generate_location_insight,
    generate_tenant_insights,
)

router = APIRouter(prefix="/internal/ai", tags=["AI Generation"])


class DailyGenerationRequest(BaseModel):
    as_of_date: date
    tenant_id: Optional[UUID] = None
    force_regenerate: bool = False


class TenantGenerationRequest(BaseModel):
    tenant_id: UUID
    as_of_date: date
    force_regenerate: bool = False


class LocationGenerationRequest(BaseModel):
    tenant_id: UUID
    location_id: int = Field(..., gt=0)
    as_of_date: date
    force_regenerate: bool = True


@router.post("/generate/daily")
def run_daily_ai_generation(
    payload: DailyGenerationRequest,
    db: Session = Depends(get_db),
):
    try:
        result = generate_daily_insights(
            db=db,
            as_of_date=payload.as_of_date,
            tenant_id=payload.tenant_id,
            force_regenerate=payload.force_regenerate,
        )
        return {
            "ok": True,
            "scope": "daily",
            "result": result,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Daily AI generation failed: {str(e)}",
        )


@router.post("/generate/tenant")
def run_tenant_ai_generation(
    payload: TenantGenerationRequest,
    db: Session = Depends(get_db),
):
    try:
        result = generate_tenant_insights(
            db=db,
            tenant_id=payload.tenant_id,
            as_of_date=payload.as_of_date,
            force_regenerate=payload.force_regenerate,
        )
        return {
            "ok": True,
            "scope": "tenant",
            "result": result,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tenant AI generation failed: {str(e)}",
        )


@router.post("/generate/location")
def run_location_ai_generation(
    payload: LocationGenerationRequest,
    db: Session = Depends(get_db),
):
    try:
        result = generate_location_insight(
            db=db,
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            force_regenerate=payload.force_regenerate,
        )
        return {
            "ok": True,
            "scope": "location",
            "result": result,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Location AI generation failed: {str(e)}",
        )