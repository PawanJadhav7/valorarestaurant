"""
Valora AI — KPI Query API
Delegates to InsightHandler which manages:
  - Dynamic context building (KpiContextEngine)
  - Gemini API calls
  - Logging to ai.handler_run_log + ai.kpi_query_log
"""
from __future__ import annotations
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth import get_current_user
from app.agents.insights.insight_agent import InsightHandler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/kpi", tags=["KPI Query"])

# Single handler instance — reuses registry IDs
_handler = InsightHandler()


class KpiQueryRequest(BaseModel):
    kpi_code:    str
    location_id: Optional[int] = None
    day:         str
    query_type:  str = "attention"   # "attention" | "action"


@router.post("/query")
def kpi_query(
    payload: KpiQueryRequest,
    user=Depends(get_current_user),
):
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    result = _handler.query_kpi(
        tenant_id=tenant_id,
        location_id=payload.location_id,
        kpi_code=payload.kpi_code,
        day=payload.day,
        query_type=payload.query_type,
    )

    if not result.get("ok"):
        raise HTTPException(status_code=500, detail=result.get("error", "Query failed"))

    return result
