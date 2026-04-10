# backend/app/api/ml_alerts.py
from __future__ import annotations
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/ml", tags=["ML Alerts & Intelligence"])

def _resolve_tenant(user: dict) -> str:
    tid = user.get("active_tenant_id") or user.get("tenant_id")
    if not tid:
        raise HTTPException(status_code=403, detail="No active tenant")
    return str(tid)

@router.get("/alerts", summary="Get ML alerts, briefs, opportunities and actions")
def get_ml_alerts(
    as_of_date:  Optional[date] = Query(None),
    location_id: Optional[int]  = Query(None),
    scope:       Optional[str]  = Query(None),
    limit:       int            = Query(20, ge=1, le=100),
    db:          Session        = Depends(get_db),
    user:        dict           = Depends(get_current_user),
):
    tenant_id = _resolve_tenant(user)

    # Resolve anchor date
    if as_of_date is None:
        latest = db.execute(
            text("""SELECT COALESCE(MAX(day), CURRENT_DATE)::date AS d
                    FROM analytics.v_gold_daily
                    WHERE tenant_id = CAST(:tid AS uuid)
                      AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))"""),
            {"tid": tenant_id, "loc": location_id}
        ).scalar()
        as_of_date = latest or date.today()
    as_of_str = str(as_of_date)

    # Risks from pre-built view
    risks = db.execute(text("""
        SELECT risk_type, severity_band, severity_score,
               impact_estimate, location_id, location_name,
               as_of_date::text AS day
        FROM ml.v_dashboard_top_risks
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
        ORDER BY severity_score DESC NULLS LAST, impact_estimate DESC NULLS LAST
        LIMIT :lim
    """), {"tid": tenant_id, "day": as_of_str, "loc": location_id, "lim": limit}
    ).mappings().all()

    # Briefs from pre-built view
    briefs = db.execute(text("""
        SELECT location_id, location_name, headline, summary_text,
               recommended_actions_json, risk_summary_json,
               as_of_date::text AS as_of_date
        FROM ml.v_dashboard_insight_briefs
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
        ORDER BY as_of_date DESC
        LIMIT :lim
    """), {"tid": tenant_id, "day": as_of_str, "loc": location_id, "lim": limit}
    ).mappings().all()

    # Opportunities
    opps = db.execute(text("""
        SELECT opportunity_id, opportunity_type, action_code,
               estimated_profit_uplift AS impact_estimate,
               confidence_score, location_id, as_of_date::text AS day
        FROM ml.profit_opportunity_daily
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
        ORDER BY estimated_profit_uplift DESC NULLS LAST
        LIMIT :lim
    """), {"tid": tenant_id, "day": as_of_str, "loc": location_id, "lim": limit}
    ).mappings().all()

    # Actions from pre-built view
    actions = db.execute(text("""
        SELECT action_code, priority_rank, expected_roi,
               difficulty_score, time_to_impact_days,
               rationale_json, location_id, location_name,
               as_of_date::text AS day
        FROM ml.v_dashboard_top_actions
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
        ORDER BY priority_rank ASC NULLS LAST, expected_roi DESC NULLS LAST
        LIMIT :lim
    """), {"tid": tenant_id, "day": as_of_str, "loc": location_id, "lim": limit}
    ).mappings().all()

    # Context KPIs from Gold
    kpi = db.execute(text("""
        SELECT ROUND(SUM(revenue),2) AS revenue,
               ROUND(SUM(ebit),2) AS ebit,
               ROUND(AVG(CASE WHEN revenue>0 THEN gross_margin END),4) AS gross_margin,
               ROUND(AVG(CASE WHEN revenue>0 THEN food_cost_pct END),4) AS food_cost_pct,
               ROUND(AVG(CASE WHEN revenue>0 THEN labor_cost_pct END),4) AS labor_cost_pct,
               ROUND(AVG(CASE WHEN revenue>0 THEN prime_cost_pct END),4) AS prime_cost_pct,
               SUM(orders) AS orders
        FROM analytics.v_gold_daily
        WHERE tenant_id = CAST(:tid AS uuid)
          AND day BETWEEN (CAST(:day AS date) - interval '29 days') AND CAST(:day AS date)
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
    """), {"tid": tenant_id, "day": as_of_str, "loc": location_id}
    ).mappings().first()

    def sev_margin(v): return "risk" if (v or 0)<0.5 else "warn" if (v or 0)<0.6 else "good"
    def sev_cost(v, t=0.32): return "risk" if (v or 0)>0.35 else "warn" if (v or 0)>t else "good"

    scope_kpis = {
        "cost_management": [
            {"code":"CTX_FOOD_COST","label":"Food Cost %","value":float(kpi["food_cost_pct"] or 0),"unit":"pct","severity":sev_cost(float(kpi["food_cost_pct"] or 0))},
            {"code":"CTX_LABOR","label":"Labor Cost %","value":float(kpi["labor_cost_pct"] or 0),"unit":"pct","severity":sev_cost(float(kpi["labor_cost_pct"] or 0))},
            {"code":"CTX_PRIME","label":"Prime Cost %","value":float(kpi["prime_cost_pct"] or 0),"unit":"pct","severity":sev_cost(float(kpi["prime_cost_pct"] or 0),0.62)},
        ],
        "profitability": [
            {"code":"CTX_REVENUE","label":"Revenue (30D)","value":float(kpi["revenue"] or 0),"unit":"usd","severity":"good"},
            {"code":"CTX_EBIT","label":"EBIT (30D)","value":float(kpi["ebit"] or 0),"unit":"usd","severity":"risk" if float(kpi["ebit"] or 0)<0 else "good"},
            {"code":"CTX_MARGIN","label":"Gross Margin","value":float(kpi["gross_margin"] or 0),"unit":"pct","severity":sev_margin(float(kpi["gross_margin"] or 0))},
        ],
        "operations": [
            {"code":"CTX_LABOR","label":"Labor Cost %","value":float(kpi["labor_cost_pct"] or 0),"unit":"pct","severity":sev_cost(float(kpi["labor_cost_pct"] or 0))},
            {"code":"CTX_PRIME","label":"Prime Cost %","value":float(kpi["prime_cost_pct"] or 0),"unit":"pct","severity":sev_cost(float(kpi["prime_cost_pct"] or 0),0.62)},
            {"code":"CTX_REVENUE","label":"Revenue (30D)","value":float(kpi["revenue"] or 0),"unit":"usd","severity":"good"},
        ],
    }
    context_kpis = scope_kpis.get(scope or "overview", [
        {"code":"CTX_REVENUE","label":"Revenue (30D)","value":float(kpi["revenue"] or 0),"unit":"usd","severity":"good"},
        {"code":"CTX_MARGIN","label":"Gross Margin","value":float(kpi["gross_margin"] or 0),"unit":"pct","severity":sev_margin(float(kpi["gross_margin"] or 0))},
        {"code":"CTX_EBIT","label":"EBIT (30D)","value":float(kpi["ebit"] or 0),"unit":"usd","severity":"risk" if float(kpi["ebit"] or 0)<0 else "good"},
    ])

    risks_list = [dict(r) for r in risks]
    return {
        "ok": True,
        "tenant_id": tenant_id,
        "location_id": location_id,
        "as_of_date": as_of_str,
        "scope": scope,
        "risks": risks_list,
        "briefs": [dict(b) for b in briefs],
        "opportunities": [dict(o) for o in opps],
        "actions": [dict(a) for a in actions],
        "context_kpis": context_kpis,
        "summary": {
            "total_risks": len(risks_list),
            "critical_risks": sum(1 for r in risks_list if r.get("severity_band") in ("critical","high")),
            "total_briefs": len(briefs),
            "total_opportunities": len(opps),
            "total_actions": len(actions),
            "top_risk_type": risks_list[0]["risk_type"] if risks_list else None,
        }
    }

@router.get("/latest-date", summary="Latest available ML data date")
def get_latest_ml_date(
    location_id: Optional[int] = Query(None),
    db:          Session       = Depends(get_db),
    user:        dict          = Depends(get_current_user),
):
    tenant_id = _resolve_tenant(user)
    latest = db.execute(
        text("""SELECT COALESCE(MAX(day), CURRENT_DATE)::date AS d
                FROM analytics.v_gold_daily
                WHERE tenant_id = CAST(:tid AS uuid)
                  AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))"""),
        {"tid": tenant_id, "loc": location_id}
    ).scalar()
    return {"ok": True, "latest_date": str(latest), "tenant_id": tenant_id}

@router.get("/risks", summary="Get ML risks only")
def get_risks(
    as_of_date:  Optional[date] = Query(None),
    location_id: Optional[int]  = Query(None),
    severity_band: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    tenant_id = _resolve_tenant(user)
    if as_of_date is None: as_of_date = date.today()
    rows = db.execute(text("""
        SELECT risk_type, severity_band, severity_score, impact_estimate,
               location_id, location_name, as_of_date::text AS day
        FROM ml.v_dashboard_top_risks
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
          AND (CAST(:sev AS text) IS NULL OR severity_band = CAST(:sev AS text))
        ORDER BY severity_score DESC NULLS LAST
        LIMIT :lim
    """), {"tid": tenant_id, "day": str(as_of_date), "loc": location_id, "sev": severity_band, "lim": limit}
    ).mappings().all()
    return {"ok": True, "count": len(rows), "risks": [dict(r) for r in rows]}

@router.get("/briefs", summary="Get AI insight briefs only")
def get_briefs(
    as_of_date:  Optional[date] = Query(None),
    location_id: Optional[int]  = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    tenant_id = _resolve_tenant(user)
    if as_of_date is None: as_of_date = date.today()
    rows = db.execute(text("""
        SELECT location_id, location_name, headline, summary_text,
               recommended_actions_json, as_of_date::text AS as_of_date
        FROM ml.v_dashboard_insight_briefs
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
        ORDER BY as_of_date DESC
        LIMIT :lim
    """), {"tid": tenant_id, "day": str(as_of_date), "loc": location_id, "lim": limit}
    ).mappings().all()
    return {"ok": True, "count": len(rows), "briefs": [dict(b) for b in rows]}

@router.get("/actions", summary="Get recommended actions only")
def get_actions(
    as_of_date:  Optional[date] = Query(None),
    location_id: Optional[int]  = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    tenant_id = _resolve_tenant(user)
    if as_of_date is None: as_of_date = date.today()
    rows = db.execute(text("""
        SELECT action_code, priority_rank, expected_roi,
               difficulty_score, time_to_impact_days,
               rationale_json, location_id, location_name,
               as_of_date::text AS day
        FROM ml.v_dashboard_top_actions
        WHERE tenant_id = CAST(:tid AS uuid)
          AND as_of_date <= CAST(:day AS date)
          AND as_of_date >= (CAST(:day AS date) - interval '30 days')
          AND (CAST(:loc AS bigint) IS NULL OR location_id = CAST(:loc AS bigint))
        ORDER BY priority_rank ASC NULLS LAST
        LIMIT :lim
    """), {"tid": tenant_id, "day": str(as_of_date), "loc": location_id, "lim": limit}
    ).mappings().all()
    return {"ok": True, "count": len(rows), "actions": [dict(a) for a in rows]}
