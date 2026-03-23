from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.analytics.kpi_repository import KPIRepository
from app.analytics.insight_service import InsightService
from app.auth import get_current_user

router = APIRouter(prefix="/api/insights", tags=["insights"])


# -----------------------------------------------------
# DAILY KPI-DRIVEN INSIGHTS
# -----------------------------------------------------
@router.get("/daily")
def get_daily_insights(
    location_id: int,
    business_date: date = Query(..., description="YYYY-MM-DD"),
    provider: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")

    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    kpi_repo = KPIRepository(db)
    insight_service = InsightService()

    snapshot = kpi_repo.get_daily_snapshot(
        tenant_id=tenant_id,
        location_id=location_id,
        business_date=business_date,
        provider=provider,
    )

    insights = insight_service.generate_daily_insights(snapshot)

    return {
        "tenant_id": tenant_id,
        "location_id": location_id,
        "business_date": str(business_date),
        "provider": provider,
        "insights": insights,
    }