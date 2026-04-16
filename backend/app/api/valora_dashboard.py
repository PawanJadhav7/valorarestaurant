from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Valora Dashboard"])


# -------------------------------
# Helper
# -------------------------------
def resolve_tenant(user):
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")
    return tenant_id


# -------------------------------
# HOME
# -------------------------------
@router.get("/home")
def get_dashboard_home(
    day: date,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = resolve_tenant(user)

    # Try exact date first, fall back to latest available date
    sql = text("""
        SELECT *
        FROM ml.v_dashboard_location_daily
        WHERE tenant_id = :tenant_id
          AND day = (
            SELECT MAX(day) FROM ml.v_dashboard_location_daily
            WHERE tenant_id = :tenant_id
            AND day <= :day
          )
        ORDER BY revenue DESC
    """)

    rows = db.execute(sql, {"tenant_id": str(tenant_id), "day": day}).mappings().all()
    return {"items": [dict(r) for r in rows]}


# -------------------------------
# KPIS
# -------------------------------
@router.get("/kpis")
def get_dashboard_kpis(
    day: date,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = resolve_tenant(user)

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
        FROM ml.v_dashboard_location_daily
        WHERE tenant_id = :tenant_id
          AND day = (
            SELECT MAX(day) FROM ml.v_dashboard_location_daily
            WHERE tenant_id = :tenant_id AND day <= :day
          )
        GROUP BY day, tenant_id
    """)

    row = db.execute(sql, {"tenant_id": str(tenant_id), "day": day}).mappings().first()
    return dict(row) if row else {}


# -------------------------------
# CONTROL TOWER
# -------------------------------
@router.get("/control-tower")
def get_control_tower(
    day: date,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = resolve_tenant(user)

    sql = text("""
        SELECT *
        FROM ml.mv_valora_control_tower
        WHERE tenant_id = :tenant_id
          AND as_of_date = (
            SELECT MAX(as_of_date) FROM ml.mv_valora_control_tower
            WHERE tenant_id = :tenant_id AND as_of_date <= :day
          )
        ORDER BY estimated_profit_uplift DESC NULLS LAST, revenue DESC
        LIMIT :limit
    """)

    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day, "limit": limit},
    ).mappings().all()

    return {"items": [dict(r) for r in rows]}


# -------------------------------
# ALERTS
# -------------------------------
@router.get("/alerts")
def get_dashboard_alerts(
    day: date,
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = resolve_tenant(user)

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
          AND as_of_date = (
            SELECT MAX(as_of_date) FROM ml.mv_dashboard_top_risks
            WHERE tenant_id = :tenant_id AND as_of_date <= :day
          )
        ORDER BY severity_score DESC, impact_estimate DESC NULLS LAST
        LIMIT :limit
    """)

    rows = db.execute(
        sql,
        {"tenant_id": str(tenant_id), "day": day, "limit": limit},
    ).mappings().all()

    return {"items": [dict(r) for r in rows]}


# -------------------------------
# LATEST DATE
# -------------------------------
@router.get("/latest-date")
def get_latest_dashboard_date(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tenant_id = resolve_tenant(user)

    sql = text("""
        SELECT MAX(as_of_date) AS latest_date
        FROM ml.mv_valora_control_tower
        WHERE tenant_id = :tenant_id
    """)

    row = db.execute(sql, {"tenant_id": str(tenant_id)}).mappings().first()

    return {
        "tenant_id": str(tenant_id),
        "latest_date": row["latest_date"] if row else None,
    }