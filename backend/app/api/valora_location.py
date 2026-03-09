# app/api/valora_location.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db
from uuid import UUID
from datetime import date

router = APIRouter(prefix="/api/location", tags=["Valora Location"])


@router.get("/detail")
def get_location_detail(
    tenant_id: UUID,
    location_id: int,
    day: date,
    db: Session = Depends(get_db),
):
    summary_sql = text("""
        SELECT *
        FROM ml.mv_dashboard_location_daily
        WHERE tenant_id = :tenant_id
          AND location_id = :location_id
          AND day = :day
    """)

    risks_sql = text("""
        SELECT *
        FROM ml.mv_dashboard_top_risks
        WHERE tenant_id = :tenant_id
          AND location_id = :location_id
          AND as_of_date = :day
        ORDER BY severity_score DESC
    """)

    actions_sql = text("""
        SELECT *
        FROM ml.mv_dashboard_top_actions
        WHERE tenant_id = :tenant_id
          AND location_id = :location_id
          AND as_of_date = :day
        ORDER BY priority_rank
    """)

    insight_sql = text("""
        SELECT *
        FROM ml.mv_dashboard_insight_briefs
        WHERE tenant_id = :tenant_id
          AND location_id = :location_id
          AND as_of_date = :day
    """)

    summary = db.execute(summary_sql, {
        "tenant_id": str(tenant_id),
        "location_id": location_id,
        "day": day
    }).mappings().first()

    risks = db.execute(risks_sql, {
        "tenant_id": str(tenant_id),
        "location_id": location_id,
        "day": day
    }).mappings().all()

    actions = db.execute(actions_sql, {
        "tenant_id": str(tenant_id),
        "location_id": location_id,
        "day": day
    }).mappings().all()

    insight = db.execute(insight_sql, {
        "tenant_id": str(tenant_id),
        "location_id": location_id,
        "day": day
    }).mappings().first()

    return {
        "summary": summary,
        "risks": risks,
        "actions": actions,
        "insight": insight,
    }