"""
Valora AI — What-If Preview API
Phase 1: Mathematical projection engine.
Owner clicks "Preview Impact" → computes projected KPI deltas →
stores in ml.whatif_run → returns speedometer + delta card data.
"""
from __future__ import annotations
import json
import logging
import os
from typing import Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/whatif", tags=["What-If Preview"])


# ── Action definitions ────────────────────────────────────────────────────────
ACTION_CODE_MAP = {
    "investigate_revenue_decline":  "increase_revenue",
    "accelerate_growth_momentum":   "increase_revenue",
    "boost_revenue":                "increase_revenue",
    "improve_revenue":              "increase_revenue",
    "reduce_labor":                 "reduce_labor_cost",
    "optimize_labor":               "reduce_labor_cost",
    "labor_optimization":           "reduce_labor_cost",
    "reduce_food_costs":            "reduce_food_cost",
    "optimize_food_cost":           "reduce_food_cost",
    "food_cost_reduction":          "reduce_food_cost",
    "reduce_waste_spoilage":        "reduce_waste",
    "waste_reduction":              "reduce_waste",
    "reduce_discount_abuse":        "reduce_discounts",
    "optimize_discounts":           "reduce_discounts",
    "improve_margins":              "improve_prime_cost",
    "prime_cost_optimization":      "improve_prime_cost",
}

ACTION_CATALOGUE = {
    "reduce_labor_cost": {
        "label":       "Reduce Labor Cost",
        "description": "Optimize staffing levels to reduce labor spend",
        "default_pct": 0.05,
        "affects":     ["labor", "labor_cost_pct", "prime_cost_pct"],
        "speedometer": {"metric": "labor_cost_pct", "good_range": [0.15, 0.25]},
    },
    "reduce_food_cost": {
        "label":       "Reduce Food Cost",
        "description": "Negotiate supplier pricing or reduce waste",
        "default_pct": 0.04,
        "affects":     ["cogs", "food_cost_pct", "gross_margin"],
        "speedometer": {"metric": "food_cost_pct", "good_range": [0.25, 0.32]},
    },
    "increase_revenue": {
        "label":       "Increase Revenue",
        "description": "Drive additional covers through promotions or upselling",
        "default_pct": 0.03,
        "affects":     ["revenue", "gross_margin", "gross_profit"],
        "speedometer": {"metric": "gross_margin", "good_range": [0.65, 0.80]},
    },
    "improve_prime_cost": {
        "label":       "Improve Prime Cost",
        "description": "Reduce combined food + labor cost percentage",
        "default_pct": 0.06,
        "affects":     ["cogs", "labor", "prime_cost_pct"],
        "speedometer": {"metric": "prime_cost_pct", "good_range": [0.55, 0.65]},
    },
    "reduce_waste": {
        "label":       "Reduce Waste",
        "description": "Optimize prep quantities to cut waste",
        "default_pct": 0.30,
        "affects":     ["waste_pct", "waste_amount", "food_cost_pct"],
        "speedometer": {"metric": "waste_pct", "good_range": [0.01, 0.05]},
    },
    "reduce_discounts": {
        "label":       "Reduce Discounts",
        "description": "Tighten discount policies to protect margin",
        "default_pct": 0.50,
        "affects":     ["discount_pct", "revenue", "gross_margin"],
        "speedometer": {"metric": "discount_pct", "good_range": [0.0, 0.05]},
    },
}


def _project_metrics(baseline: dict, action_code: str, pct_change: float) -> dict:
    """Phase 1 math projection — apply pct_change to affected metrics."""
    p = dict(baseline)

    if action_code == "reduce_labor_cost":
        p["projected_labor"]          = round(baseline["labor"] * (1 - pct_change), 2)
        p["projected_labor_cost_pct"] = round(p["projected_labor"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["labor_cost_pct"]
        p["projected_prime_cost"]     = round(baseline["cogs"] + p["projected_labor"], 2)
        p["projected_prime_cost_pct"] = round(p["projected_prime_cost"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["prime_cost_pct"]
        p["projected_cogs"]           = baseline["cogs"]
        p["projected_revenue"]        = baseline["revenue"]
        p["projected_gross_profit"]   = baseline["gross_profit"]
        p["projected_gross_margin"]   = baseline["gross_margin"]

    elif action_code == "reduce_food_cost":
        p["projected_cogs"]           = round(baseline["cogs"] * (1 - pct_change), 2)
        p["projected_food_cost_pct"]  = round(p["projected_cogs"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["food_cost_pct"]
        p["projected_gross_profit"]   = round(baseline["revenue"] - p["projected_cogs"], 2)
        p["projected_gross_margin"]   = round(p["projected_gross_profit"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["gross_margin"]
        p["projected_prime_cost"]     = round(p["projected_cogs"] + baseline["labor"], 2)
        p["projected_prime_cost_pct"] = round(p["projected_prime_cost"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["prime_cost_pct"]
        p["projected_labor"]          = baseline["labor"]
        p["projected_revenue"]        = baseline["revenue"]
        p["projected_labor_cost_pct"] = baseline["labor_cost_pct"]

    elif action_code == "increase_revenue":
        p["projected_revenue"]        = round(baseline["revenue"] * (1 + pct_change), 2)
        p["projected_gross_profit"]   = round(p["projected_revenue"] - baseline["cogs"], 2)
        p["projected_gross_margin"]   = round(p["projected_gross_profit"] / p["projected_revenue"], 4)
        p["projected_labor_cost_pct"] = round(baseline["labor"] / p["projected_revenue"], 4)
        p["projected_food_cost_pct"]  = round(baseline["cogs"] / p["projected_revenue"], 4)
        p["projected_prime_cost"]     = round(baseline["cogs"] + baseline["labor"], 2)
        p["projected_prime_cost_pct"] = round(p["projected_prime_cost"] / p["projected_revenue"], 4)
        p["projected_cogs"]           = baseline["cogs"]
        p["projected_labor"]          = baseline["labor"]

    elif action_code == "improve_prime_cost":
        split = pct_change / 2
        p["projected_cogs"]           = round(baseline["cogs"] * (1 - split), 2)
        p["projected_labor"]          = round(baseline["labor"] * (1 - split), 2)
        p["projected_prime_cost"]     = round(p["projected_cogs"] + p["projected_labor"], 2)
        p["projected_prime_cost_pct"] = round(p["projected_prime_cost"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["prime_cost_pct"]
        p["projected_gross_profit"]   = round(baseline["revenue"] - p["projected_cogs"], 2)
        p["projected_gross_margin"]   = round(p["projected_gross_profit"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["gross_margin"]
        p["projected_food_cost_pct"]  = round(p["projected_cogs"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["food_cost_pct"]
        p["projected_labor_cost_pct"] = round(p["projected_labor"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["labor_cost_pct"]
        p["projected_revenue"]        = baseline["revenue"]

    elif action_code == "reduce_waste":
        p["projected_waste_amount"]   = round(float(baseline.get("waste_amount", 0)) * (1 - pct_change), 2)
        p["projected_waste_pct"]      = round(float(baseline.get("waste_pct", 0)) * (1 - pct_change), 4)
        p["projected_cogs"]           = round(baseline["cogs"] - (float(baseline.get("waste_amount", 0)) - p["projected_waste_amount"]), 2)
        p["projected_food_cost_pct"]  = round(p["projected_cogs"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["food_cost_pct"]
        p["projected_gross_profit"]   = round(baseline["revenue"] - p["projected_cogs"], 2)
        p["projected_gross_margin"]   = round(p["projected_gross_profit"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["gross_margin"]
        p["projected_labor"]          = baseline["labor"]
        p["projected_revenue"]        = baseline["revenue"]
        p["projected_labor_cost_pct"] = baseline["labor_cost_pct"]
        p["projected_prime_cost"]     = round(p["projected_cogs"] + baseline["labor"], 2)
        p["projected_prime_cost_pct"] = round(p["projected_prime_cost"] / baseline["revenue"], 4) if baseline.get("revenue") else baseline["prime_cost_pct"]

    elif action_code == "reduce_discounts":
        recovered = float(baseline.get("discount_pct", 0)) * pct_change * baseline.get("revenue", 0)
        p["projected_revenue"]        = round(baseline["revenue"] + recovered, 2)
        p["projected_discount_pct"]   = round(float(baseline.get("discount_pct", 0)) * (1 - pct_change), 4)
        p["projected_gross_profit"]   = round(p["projected_revenue"] - baseline["cogs"], 2)
        p["projected_gross_margin"]   = round(p["projected_gross_profit"] / p["projected_revenue"], 4)
        p["projected_cogs"]           = baseline["cogs"]
        p["projected_labor"]          = baseline["labor"]
        p["projected_labor_cost_pct"] = round(baseline["labor"] / p["projected_revenue"], 4)
        p["projected_food_cost_pct"]  = round(baseline["cogs"] / p["projected_revenue"], 4)
        p["projected_prime_cost"]     = round(baseline["cogs"] + baseline["labor"], 2)
        p["projected_prime_cost_pct"] = round(p["projected_prime_cost"] / p["projected_revenue"], 4)

    # Profit delta = projected_gross_profit - baseline_gross_profit
    p["projected_profit_delta"] = round(
        p.get("projected_gross_profit", baseline["gross_profit"]) - baseline["gross_profit"], 2
    )
    return p


def _speedometer_data(action_code: str, baseline: dict, projected: dict) -> dict:
    """Build speedometer gauge data for the UI."""
    action = ACTION_CATALOGUE.get(action_code, {})
    sp = action.get("speedometer", {})
    metric = sp.get("metric", "gross_margin")
    good_range = sp.get("good_range", [0.60, 0.75])

    current_val  = float(baseline.get(metric, 0))
    proj_key     = f"projected_{metric}"
    projected_val = float(projected.get(proj_key, current_val))

    # Determine if moving in right direction
    # For cost metrics lower is better, for margin/revenue higher is better
    cost_metrics = ["labor_cost_pct", "food_cost_pct", "prime_cost_pct",
                    "waste_pct", "discount_pct"]
    lower_is_better = metric in cost_metrics

    if lower_is_better:
        improved = projected_val < current_val
    else:
        improved = projected_val > current_val

    return {
        "metric":         metric,
        "label":          metric.replace("_", " ").title(),
        "current":        round(current_val, 4),
        "projected":      round(projected_val, 4),
        "good_range_min": good_range[0],
        "good_range_max": good_range[1],
        "lower_is_better": lower_is_better,
        "improved":       improved,
        "delta":          round(projected_val - current_val, 4),
    }


class WhatIfRequest(BaseModel):
    action_code: str
    location_id: int
    day: str
    pct_change: Optional[float] = None


class WhatIfFeedbackRequest(BaseModel):
    run_id: int
    response: str           # 'accepted' | 'dismissed'
    owner_note: Optional[str] = None


@router.post("/preview")
def whatif_preview(
    payload: WhatIfRequest,
    user=Depends(get_current_user),
):
    """
    Compute What-If projection for a recommended action.
    Returns speedometer + delta cards + stores in ml.whatif_run.
    """
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")
    user_id   = user.get("user_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    # Map ML action codes to catalogue codes
    payload.action_code = ACTION_CODE_MAP.get(payload.action_code, payload.action_code)
    if payload.action_code not in ACTION_CATALOGUE:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown action_code. Valid: {list(ACTION_CATALOGUE.keys())}"
        )

    db_url = os.environ.get("DATABASE_URL", "").replace(
        "postgresql+psycopg2", "postgresql"
    )
    conn = psycopg2.connect(db_url)
    cur  = conn.cursor()

    try:
        # Fetch baseline KPIs
        cur.execute("""
            SELECT revenue, cogs, labor, gross_profit, gross_margin,
                   food_cost_pct, labor_cost_pct, prime_cost, prime_cost_pct,
                   waste_pct, waste_amount, discount_pct, location_name
            FROM restaurant.f_location_daily_features
            WHERE tenant_id  = %(tenant_id)s::uuid
              AND location_id = %(location_id)s
              AND day        <= %(day)s::date
            ORDER BY day DESC
            LIMIT 1
        """, {"tenant_id": tenant_id,
              "location_id": payload.location_id,
              "day": payload.day})

        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No KPI data found")

        cols = ["revenue", "cogs", "labor", "gross_profit", "gross_margin",
                "food_cost_pct", "labor_cost_pct", "prime_cost", "prime_cost_pct",
                "waste_pct", "waste_amount", "discount_pct", "location_name"]

        baseline = {c: (float(row[i]) if row[i] is not None and c != "location_name"
                        else row[i])
                    for i, c in enumerate(cols)}
        location_name = baseline.pop("location_name", "Unknown")

        pct_change = payload.pct_change or ACTION_CATALOGUE[payload.action_code]["default_pct"]

        # Project metrics
        projected = _project_metrics(baseline, payload.action_code, pct_change)

        # Build speedometer data
        speedometer = _speedometer_data(payload.action_code, baseline, projected)

        # Build delta cards
        delta_cards = [
            {
                "label":     "Gross Margin",
                "current":   round(baseline["gross_margin"] * 100, 2),
                "projected": round(projected.get("projected_gross_margin", baseline["gross_margin"]) * 100, 2),
                "unit":      "%",
                "delta":     round((projected.get("projected_gross_margin", baseline["gross_margin"]) - baseline["gross_margin"]) * 100, 2),
            },
            {
                "label":     "Gross Profit",
                "current":   round(baseline["gross_profit"], 2),
                "projected": round(projected.get("projected_gross_profit", baseline["gross_profit"]), 2),
                "unit":      "usd",
                "delta":     round(projected.get("projected_profit_delta", 0), 2),
            },
            {
                "label":     "Prime Cost %",
                "current":   round(baseline["prime_cost_pct"] * 100, 2),
                "projected": round(projected.get("projected_prime_cost_pct", baseline["prime_cost_pct"]) * 100, 2),
                "unit":      "%",
                "delta":     round((projected.get("projected_prime_cost_pct", baseline["prime_cost_pct"]) - baseline["prime_cost_pct"]) * 100, 2),
            },
            {
                "label":     "Food Cost %",
                "current":   round(baseline["food_cost_pct"] * 100, 2),
                "projected": round(projected.get("projected_food_cost_pct", baseline["food_cost_pct"]) * 100, 2),
                "unit":      "%",
                "delta":     round((projected.get("projected_food_cost_pct", baseline["food_cost_pct"]) - baseline["food_cost_pct"]) * 100, 2),
            },
        ]

        # Store in ml.whatif_run
        cur.execute("""
            INSERT INTO ml.whatif_run (
                tenant_id, location_id, action_code,
                action_params_json, baseline_metrics_json,
                projected_metrics_json, projected_profit_delta,
                confidence_band_json, created_by_user_id
            ) VALUES (
                %(tenant_id)s::uuid, %(location_id)s, %(action_code)s,
                %(action_params)s::jsonb, %(baseline)s::jsonb,
                %(projected)s::jsonb, %(profit_delta)s,
                %(confidence)s::jsonb, %(user_id)s::uuid
            ) RETURNING run_id
        """, {
            "tenant_id":    tenant_id,
            "location_id":  payload.location_id,
            "action_code":  payload.action_code,
            "action_params": json.dumps({"pct_change": pct_change}),
            "baseline":     json.dumps(baseline),
            "projected":    json.dumps(projected),
            "profit_delta": projected.get("projected_profit_delta", 0),
            "confidence":   json.dumps({
                "confidence_level": "mvp_rules_based",
                "range_note": "Phase 1 math projection. Replace with ML model after 500+ feedback records.",
            }),
            "user_id": user_id,
        })
        run_id = cur.fetchone()[0]
        conn.commit()

        action_meta = ACTION_CATALOGUE[payload.action_code]

        logger.info(
            "What-If preview — tenant=%s loc=%s action=%s profit_delta=%.2f run_id=%d",
            tenant_id[:8], payload.location_id, payload.action_code,
            projected.get("projected_profit_delta", 0), run_id
        )

        return {
            "ok":            True,
            "run_id":        run_id,
            "action_code":   payload.action_code,
            "action_label":  action_meta["label"],
            "description":   action_meta["description"],
            "location_name": location_name,
            "day":           payload.day,
            "pct_change":    pct_change,
            "speedometer":   speedometer,
            "delta_cards":   delta_cards,
            "profit_delta":  projected.get("projected_profit_delta", 0),
            "baseline":      baseline,
            "projected":     projected,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error("What-If preview failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/feedback")
def whatif_feedback(
    payload: WhatIfFeedbackRequest,
    user=Depends(get_current_user),
):
    """
    Record owner's response to a What-If preview.
    Accept → confidence_score boost in ai.alert_feedback.
    """
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")
    user_id   = user.get("user_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    if payload.response not in ("accepted", "dismissed"):
        raise HTTPException(status_code=400, detail="response must be 'accepted' or 'dismissed'")

    db_url = os.environ.get("DATABASE_URL", "").replace(
        "postgresql+psycopg2", "postgresql"
    )
    conn = psycopg2.connect(db_url)
    cur  = conn.cursor()

    try:
        # Verify run belongs to this tenant
        cur.execute("""
            SELECT run_id, action_code, projected_profit_delta, location_id
            FROM ml.whatif_run
            WHERE run_id = %s AND tenant_id = %s::uuid
        """, (payload.run_id, tenant_id))

        run = cur.fetchone()
        if not run:
            raise HTTPException(status_code=404, detail="What-If run not found")

        run_id, action_code, profit_delta, location_id = run

        # Insert feedback into ai.alert_feedback
        # confidence boost: accepted = +0.15, dismissed = 0
        confidence_boost = 0.15 if payload.response == "accepted" else 0.0

        cur.execute("""
            INSERT INTO ai.alert_feedback (
                tenant_id, location_id, as_of_date,
                risk_type, response_status, response_channel,
                responded_at, owner_note, outcome_status,
                was_relevant, relevance_score
            ) VALUES (
                %(tenant_id)s::uuid, %(location_id)s, CURRENT_DATE,
                %(action_code)s, %(response_status)s, 'dashboard',
                NOW(), %(owner_note)s,
                CASE WHEN %(response)s = 'accepted' THEN 'projected_positive' ELSE 'dismissed' END,
                %(was_relevant)s, %(relevance_score)s
            ) RETURNING feedback_id
        """, {
            "tenant_id":       tenant_id,
            "location_id":     location_id,
            "action_code":     action_code,
            "response_status": "actioned" if payload.response == "accepted" else "dismissed",
            "response":        payload.response,
            "owner_note":      payload.owner_note,
            "was_relevant":    payload.response == "accepted",
            "relevance_score": confidence_boost,
        })
        feedback_id = str(cur.fetchone()[0])

        # Update whatif_run with user who responded
        cur.execute("""
            UPDATE ml.whatif_run
            SET created_by_user_id = %(user_id)s::uuid
            WHERE run_id = %(run_id)s
              AND created_by_user_id IS NULL
        """, {"user_id": user_id, "run_id": run_id})

        conn.commit()

        logger.info(
            "What-If feedback — run_id=%d response=%s confidence_boost=%.2f",
            run_id, payload.response, confidence_boost
        )

        return {
            "ok":              True,
            "run_id":          run_id,
            "feedback_id":     feedback_id,
            "response":        payload.response,
            "confidence_boost": confidence_boost,
            "message": (
                "Action accepted — projected improvement logged. "
                "Outcome will be measured in 7 days."
            ) if payload.response == "accepted" else (
                "Action dismissed — noted for model improvement."
            ),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error("What-If feedback failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/actions")
def get_available_actions():
    """Return list of available What-If action codes."""
    return {
        "ok": True,
        "actions": [
            {"code": code, "label": meta["label"], "description": meta["description"]}
            for code, meta in ACTION_CATALOGUE.items()
        ]
    }
