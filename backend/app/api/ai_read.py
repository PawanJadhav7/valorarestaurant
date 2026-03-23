from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db

router = APIRouter(prefix="/api/ai", tags=["AI Read"])


@router.get("/latest-date")
def get_latest_ai_date(
    tenant_id: UUID,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT MAX(as_of_date)
        FROM ai.location_insight_daily
        WHERE tenant_id = :tenant_id
          AND generation_status = 'active'
    """)

    latest_date = db.execute(
        sql,
        {"tenant_id": str(tenant_id)},
    ).scalar()

    return {
        "tenant_id": str(tenant_id),
        "latest_date": latest_date,
    }


@router.get("/location-insights")
def get_location_insights(
    tenant_id: UUID,
    day: date,
    audience_type: str = Query("operator"),
    insight_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    if audience_type not in {"operator", "manager", "executive"}:
        raise HTTPException(status_code=400, detail="Invalid audience_type")

    params = {
        "tenant_id": str(tenant_id),
        "day": day,
        "audience_type": audience_type,
    }

    sql = """
        SELECT
            location_insight_id,
            as_of_date,
            tenant_id,
            location_id,
            insight_type,
            audience_type,
            headline,
            summary_text,
            recommendation_text,
            risk_summary_json,
            recommended_actions_json,
            supporting_facts_json,
            explanation_json,
            top_risk_type,
            top_action_code,
            opportunity_type,
            confidence_score,
            priority_rank,
            prompt_template_version,
            llm_provider,
            llm_model_name,
            llm_model_version,
            generation_mode,
            generation_status,
            generated_at,
            expires_at,
            created_at,
            updated_at
        FROM ai.location_insight_daily
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
          AND audience_type = :audience_type
          AND generation_status = 'active'
    """

    if insight_type:
        params["insight_type"] = insight_type
        sql += " AND insight_type = :insight_type"

    sql += " ORDER BY location_id, insight_type"

    rows = db.execute(text(sql), params).mappings().all()

    return {
        "tenant_id": str(tenant_id),
        "as_of_date": str(day),
        "audience_type": audience_type,
        "insight_type": insight_type,
        "items": [dict(r) for r in rows],
    }


@router.get("/location-insight")
def get_location_insight(
    tenant_id: UUID,
    location_id: int,
    day: date,
    audience_type: str = Query("operator"),
    insight_type: str = Query("control_tower"),
    db: Session = Depends(get_db),
):
    if audience_type not in {"operator", "manager", "executive"}:
        raise HTTPException(status_code=400, detail="Invalid audience_type")

    sql = text("""
        SELECT
            location_insight_id,
            as_of_date,
            tenant_id,
            location_id,
            insight_type,
            audience_type,
            headline,
            summary_text,
            recommendation_text,
            risk_summary_json,
            recommended_actions_json,
            supporting_facts_json,
            explanation_json,
            top_risk_type,
            top_action_code,
            opportunity_type,
            confidence_score,
            priority_rank,
            source_hash,
            source_snapshot_json,
            generation_run_id,
            prompt_template_version,
            llm_provider,
            llm_model_name,
            llm_model_version,
            generation_mode,
            generation_status,
            generated_at,
            expires_at,
            created_at,
            updated_at
        FROM ai.location_insight_daily
        WHERE tenant_id = :tenant_id
          AND location_id = :location_id
          AND as_of_date = :day
          AND audience_type = :audience_type
          AND insight_type = :insight_type
          AND generation_status = 'active'
        LIMIT 1
    """)

    row = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "location_id": location_id,
            "day": day,
            "audience_type": audience_type,
            "insight_type": insight_type,
        },
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="AI insight not found")

    return dict(row)


@router.get("/executive-summary")
def get_executive_summary(
    tenant_id: UUID,
    day: date,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            location_insight_id,
            as_of_date,
            tenant_id,
            location_id,
            insight_type,
            audience_type,
            headline,
            summary_text,
            recommendation_text,
            risk_summary_json,
            recommended_actions_json,
            supporting_facts_json,
            explanation_json,
            top_risk_type,
            top_action_code,
            opportunity_type,
            confidence_score,
            priority_rank,
            prompt_template_version,
            llm_provider,
            llm_model_name,
            llm_model_version,
            generation_mode,
            generation_status,
            generated_at
        FROM ai.location_insight_daily
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
          AND audience_type = 'executive'
          AND generation_status = 'active'
        ORDER BY priority_rank NULLS LAST, location_id
    """)

    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day},
    ).mappings().all()

    return {
        "tenant_id": str(tenant_id),
        "as_of_date": str(day),
        "items": [dict(r) for r in rows],
    }