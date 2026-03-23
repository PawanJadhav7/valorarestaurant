#backend/app/api/kpi.py
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.analytics.kpi_repository import KPIRepository
from app.auth import get_current_user

router = APIRouter(prefix="/api/kpi", tags=["kpi"])

user = Depends(get_current_user)




# -----------------------------------------------------
# DAILY KPI SNAPSHOT
# -----------------------------------------------------
@router.get("/daily")
def get_daily_kpis(
    location_id: int,
    business_date: date = Query(...),
    provider: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    
):
    role = user.get("role")
    if role not in ["owner", "manager", "viewer"]:
        raise HTTPException(status_code=403, detail="Invalid role")
    
    tenant_id = user["tenant_id"]
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    repo = KPIRepository(db)

    result = repo.get_daily_snapshot(
        tenant_id=tenant_id,
        location_id=location_id,
        business_date=business_date,
        provider=provider,
    )

    return result