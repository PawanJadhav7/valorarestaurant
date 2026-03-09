from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Valora Dashboard"])


@router.get("/home")
def get_dashboard_home(
    tenant_id: UUID,
    day: date,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT *
        FROM ml.mv_dashboard_location_daily
        WHERE tenant_id = :tenant_id
          AND day = :day
        ORDER BY max_severity_score DESC NULLS LAST, revenue DESC
    """)
    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day},
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/kpis")
def get_dashboard_kpis(
    tenant_id: UUID,
    day: date,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            day,
            tenant_id,
            COUNT(*) AS location_count,
            SUM(revenue) AS total_revenue,
            SUM(gross_profit) AS total_gross_profit,
            AVG(gross_margin) AS avg_gross_margin,
            AVG(food_cost_pct) AS avg_food_cost_pct,
            AVG(labor_cost_pct) AS avg_labor_cost_pct,
            AVG(prime_cost_pct) AS avg_prime_cost_pct,
            SUM(waste_amount) AS total_waste_amount,
            SUM(stockout_count) AS total_stockouts
        FROM ml.mv_dashboard_location_daily
        WHERE tenant_id = :tenant_id
          AND day = :day
        GROUP BY day, tenant_id
    """)
    row = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day},
    ).mappings().first()
    return dict(row) if row else {}


@router.get("/risks")
def get_dashboard_risks(
    tenant_id: UUID,
    day: date,
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            as_of_date,
            tenant_id,
            location_id,
            location_name,
            region,
            risk_type,
            risk_probability,
            severity_score,
            severity_band,
            impact_estimate,
            top_drivers_json
        FROM ml.mv_dashboard_top_risks
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
        ORDER BY severity_score DESC, impact_estimate DESC NULLS LAST
        LIMIT :limit
    """)
    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day, "limit": limit},
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/actions")
def get_dashboard_actions(
    tenant_id: UUID,
    day: date,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            as_of_date,
            tenant_id,
            location_id,
            location_name,
            region,
            action_code,
            priority_rank,
            expected_roi,
            difficulty_score,
            time_to_impact_days,
            rationale_json
        FROM ml.mv_dashboard_top_actions
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
        ORDER BY priority_rank, expected_roi DESC NULLS LAST
    """)
    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day},
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/insights")
def get_dashboard_insights(
    tenant_id: UUID,
    day: date,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            as_of_date,
            tenant_id,
            location_id,
            location_name,
            region,
            headline,
            summary_text,
            risk_summary_json,
            recommended_actions_json
        FROM ml.mv_dashboard_insight_briefs
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
        ORDER BY location_name
    """)
    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day},
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/forecast")
def get_dashboard_forecast(
    tenant_id: UUID,
    metric: str = Query("revenue"),
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            forecast_date,
            location_id,
            location_name,
            region,
            predicted_value,
            lower_bound,
            upper_bound
        FROM ml.mv_dashboard_forecast_trend
        WHERE tenant_id = :tenant_id
          AND forecast_metric = :metric
        ORDER BY forecast_date, location_name
    """)
    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "metric": metric},
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/opportunities")
def get_dashboard_opportunities(
    tenant_id: UUID,
    day: date,
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            as_of_date,
            tenant_id,
            location_id,
            location_name,
            region,
            opportunity_type,
            action_code,
            estimated_profit_uplift,
            uplift_horizon_days,
            confidence_score,
            driver_metrics_json,
            rationale_json
        FROM ml.mv_dashboard_profit_opportunity
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
        ORDER BY estimated_profit_uplift DESC
        LIMIT :limit
    """)
    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day, "limit": limit},
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/control-tower")
def get_control_tower(
    tenant_id: UUID,
    day: date,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            as_of_date,
            tenant_id,
            location_id,
            location_name,
            region,
            country_code,

            revenue,
            gross_profit,
            gross_margin,
            food_cost_pct,
            labor_cost_pct,
            prime_cost_pct,
            aov,
            orders,
            customers,
            labor_hours,
            sales_per_labor_hour,
            avg_inventory,
            stockout_count,
            waste_amount,
            waste_pct,

            top_risk_type,
            top_risk_score,
            top_risk_band,
            top_risk_impact_estimate,

            top_action_code,
            top_action_priority_rank,
            top_action_expected_roi,
            top_action_confidence_score,
            top_action_rationale_json,

            opportunity_type,
            top_opportunity_action_code,
            estimated_profit_uplift,
            uplift_horizon_days,
            opportunity_confidence_score,
            opportunity_driver_metrics_json,
            opportunity_rationale_json,

            headline,
            summary_text,
            risk_summary_json,
            recommended_actions_json,
            insight_model_name,
            insight_model_version,

            next_forecast_date,
            forecast_revenue_next_day,
            forecast_revenue_lower_bound,
            forecast_revenue_upper_bound

        FROM ml.mv_valora_control_tower
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
        ORDER BY estimated_profit_uplift DESC NULLS LAST, revenue DESC
        LIMIT :limit
    """)
    rows = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "day": day,
            "limit": limit,
        },
    ).mappings().all()
    return {"items": [dict(r) for r in rows]}


@router.get("/alerts")
def get_dashboard_alerts(
    tenant_id: UUID,
    day: date,
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT
            as_of_date,
            tenant_id,
            location_id,
            location_name,
            region,
            risk_type,
            severity_score,
            severity_band,
            impact_estimate
        FROM ml.mv_dashboard_top_risks
        WHERE tenant_id = :tenant_id
          AND as_of_date = :day
          AND severity_band IN ('high','watch','critical')
        ORDER BY severity_score DESC, impact_estimate DESC NULLS LAST
        LIMIT :limit
    """)

    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day, "limit": limit},
    ).mappings().all()

    return {"items": [dict(r) for r in rows]}


@router.get("/latest-date")
def get_latest_dashboard_date(
    tenant_id: UUID,
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT MAX(as_of_date) AS latest_date
        FROM ml.mv_valora_control_tower
        WHERE tenant_id = :tenant_id
    """)

    row = db.execute(
        sql,
        {"tenant_id": str(tenant_id)},
    ).mappings().first()

    return {
        "tenant_id": str(tenant_id),
        "latest_date": row["latest_date"] if row and row["latest_date"] else None,
    }