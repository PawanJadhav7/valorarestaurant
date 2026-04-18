"""
Valora AI — KPI Query API
Handles KPI tile clicks → fetches domain group KPIs →
calls Gemini → stores in ai.kpi_query_log → returns response.
"""
from __future__ import annotations
import logging
import os
import time
from typing import Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/kpi", tags=["KPI Query"])

# ── Domain group mappings ──────────────────────────────────────────────────────
DOMAIN_GROUPS = {
    "sales": {
        "label": "Sales & Revenue",
        "kpi_codes": ["REVENUE", "NET_SALES", "GROSS_SALES", "AOV", "ORDERS",
                      "CUSTOMERS", "REVENUE_PER_CUSTOMER"],
        "db_columns": ["revenue", "orders", "customers", "aov",
                       "revenue_per_customer", "sales_last_7d_avg",
                       "sales_last_14d_avg", "discount_pct", "void_pct",
                       "refund_pct"],
    },
    "cost": {
        "label": "Cost & Margin",
        "kpi_codes": ["GROSS_MARGIN", "FOOD_COST_PCT", "LABOR_COST_PCT",
                      "PRIME_COST_PCT", "COGS", "EBIT"],
        "db_columns": ["gross_margin", "gross_profit", "food_cost_pct",
                       "labor_cost_pct", "prime_cost_pct", "cogs", "ebit",
                       "contribution_margin_pct", "gross_margin_last_7d_avg",
                       "food_cost_last_7d_avg", "labor_cost_last_7d_avg"],
    },
    "inventory": {
        "label": "Inventory & Waste",
        "kpi_codes": ["WASTE_PCT", "WASTE_AMOUNT", "STOCKOUT_COUNT",
                      "AVG_INVENTORY", "DIOH", "INVENTORY_TURNS"],
        "db_columns": ["waste_pct", "waste_amount", "stockout_count",
                       "avg_inventory", "dio"],
    },
    "workforce": {
        "label": "Workforce",
        "kpi_codes": ["LABOR_HOURS", "OVERTIME_HOURS", "SALES_PER_LABOR_HOUR",
                      "LABOR_COST_PCT"],
        "db_columns": ["labor_hours", "overtime_hours", "sales_per_labor_hour",
                       "labor_cost_pct", "labor"],
    },
    "operations": {
        "label": "Operations",
        "kpi_codes": ["VOID_PCT", "DISCOUNT_PCT", "REFUND_PCT", "AOV",
                      "ORDERS", "CUSTOMERS"],
        "db_columns": ["void_pct", "discount_pct", "refund_pct",
                       "orders", "customers", "aov"],
    },
}

# Map individual KPI codes to domain groups
KPI_TO_DOMAIN = {}
for domain, config in DOMAIN_GROUPS.items():
    for code in config["kpi_codes"]:
        KPI_TO_DOMAIN[code.upper()] = domain


def get_domain_for_kpi(kpi_code: str) -> str:
    """Map a KPI code to its domain group."""
    return KPI_TO_DOMAIN.get(kpi_code.upper(), "sales")


class KpiQueryRequest(BaseModel):
    kpi_code: str
    location_id: int
    day: str
    query_type: str = "attention"   # "attention" | "action"


def _fetch_kpi_context(
    cur, tenant_id: str, location_id: int, day: str, domain: str
) -> dict:
    """Fetch KPI values for the domain group."""
    cols = DOMAIN_GROUPS[domain]["db_columns"]
    col_list = ", ".join(cols)

    cur.execute(f"""
        SELECT {col_list}, location_name
        FROM restaurant.f_location_daily_features
        WHERE tenant_id = %(tenant_id)s::uuid
          AND location_id = %(location_id)s
          AND day <= %(day)s::date
        ORDER BY day DESC
        LIMIT 1
    """, {"tenant_id": tenant_id, "location_id": location_id, "day": day})

    row = cur.fetchone()
    if not row:
        return {}

    result = {}
    for i, col in enumerate(cols):
        val = row[i]
        if val is not None:
            result[col] = float(val) if hasattr(val, '__float__') else val
    result["location_name"] = row[-1]
    return result


def _fetch_risk_context(
    cur, tenant_id: str, location_id: int, day: str
) -> list:
    """Fetch current risk signals."""
    cur.execute("""
        SELECT risk_type, severity_band, severity_score, impact_estimate
        FROM ml.location_risk_daily
        WHERE tenant_id = %(tenant_id)s::uuid
          AND location_id = %(location_id)s
          AND day <= %(day)s::date
        ORDER BY day DESC, severity_score DESC
        LIMIT 5
    """, {"tenant_id": tenant_id, "location_id": location_id, "day": day})

    return [
        {"risk_type": r[0], "severity": r[1],
         "score": float(r[2] or 0), "impact": float(r[3] or 0)}
        for r in cur.fetchall()
    ]


def _build_prompt(
    query_type: str,
    kpi_code: str,
    domain: str,
    location_name: str,
    kpi_context: dict,
    risk_context: list,
    day: str,
) -> str:
    domain_label = DOMAIN_GROUPS[domain]["label"]

    kpi_lines = "\n".join(
        f"  {k}: {v}" for k, v in kpi_context.items()
        if k != "location_name" and v is not None
    )

    risk_lines = "\n".join(
        f"  {r['risk_type']} — {r['severity']} severity, impact ${r['impact']:,.0f}"
        for r in risk_context
    ) if risk_context else "  No active risks detected"

    if query_type == "attention":
        question = (
            f"The owner clicked on the {kpi_code} metric in the {domain_label} section. "
            f"What are the top 2-3 issues requiring immediate attention based on these metrics? "
            f"Be specific, data-driven, and actionable. Max 150 words."
        )
    else:
        question = (
            f"The owner clicked on the {kpi_code} metric in the {domain_label} section. "
            f"What are the top 2-3 recommended actions to improve these metrics? "
            f"For each action include: what to do, expected impact, and timeframe. Max 200 words."
        )

    return f"""You are Valora AI, a restaurant intelligence system.
Restaurant: {location_name}
Date: {day}
Domain: {domain_label}

Current KPI Values:
{kpi_lines}

Active Risk Signals:
{risk_lines}

{question}"""


def _call_gemini(prompt: str) -> tuple[str, int, int]:
    """Call Gemini API and return (response_text, input_tokens, output_tokens)."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(prompt)
        text = response.text or "No response generated."
        # Estimate tokens (Gemini doesn't always return token counts)
        input_tokens = len(prompt.split()) * 4 // 3
        output_tokens = len(text.split()) * 4 // 3
        return text, input_tokens, output_tokens
    except Exception as e:
        logger.error("Gemini call failed: %s", str(e))
        return f"Unable to generate AI response: {str(e)}", 0, 0


@router.post("/query")
def kpi_query(
    payload: KpiQueryRequest,
    user=Depends(get_current_user),
):
    """
    Handle KPI tile click → fetch domain KPIs → call Gemini →
    store in ai.kpi_query_log → return AI response.
    """
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    db_url = os.environ.get("DATABASE_URL", "").replace(
        "postgresql+psycopg2", "postgresql"
    )
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    try:
        domain = get_domain_for_kpi(payload.kpi_code)
        start_ms = int(time.time() * 1000)

        # Fetch KPI context
        kpi_context = _fetch_kpi_context(
            cur, tenant_id, payload.location_id, payload.day, domain
        )
        if not kpi_context:
            raise HTTPException(
                status_code=404,
                detail=f"No KPI data found for location {payload.location_id} on {payload.day}"
            )

        location_name = kpi_context.get("location_name", "Unknown")

        # Fetch risk context
        risk_context = _fetch_risk_context(
            cur, tenant_id, payload.location_id, payload.day
        )

        # Build prompt
        prompt = _build_prompt(
            query_type=payload.query_type,
            kpi_code=payload.kpi_code,
            domain=domain,
            location_name=location_name,
            kpi_context=kpi_context,
            risk_context=risk_context,
            day=payload.day,
        )

        # Call Gemini
        response_text, input_tokens, output_tokens = _call_gemini(prompt)
        duration_ms = int(time.time() * 1000) - start_ms

        # Estimate cost (Gemini 2.5 Flash Lite)
        cost_usd = (input_tokens * 0.000075 + output_tokens * 0.000300) / 1000

        # Get Gemini engine_id from registry
        cur.execute("""
            SELECT engine_id FROM ai.engine_registry
            WHERE engine_code = 'gemini-2.5-flash-lite' LIMIT 1
        """)
        engine_row = cur.fetchone()
        engine_id = str(engine_row[0]) if engine_row else None

        # Store in ai.kpi_query_log
        cur.execute("""
            INSERT INTO ai.kpi_query_log (
                tenant_id, location_id, as_of_date,
                kpi_code, domain_group, query_type,
                engine_id, prompt_text, kpi_context_json,
                risk_context_json, response_text,
                input_tokens, output_tokens, cost_usd, duration_ms
            ) VALUES (
                %(tenant_id)s::uuid, %(location_id)s, %(day)s::date,
                %(kpi_code)s, %(domain)s, %(query_type)s,
                %(engine_id)s::uuid, %(prompt)s, %(kpi_context)s::jsonb,
                %(risk_context)s::jsonb, %(response)s,
                %(input_tokens)s, %(output_tokens)s,
                %(cost_usd)s, %(duration_ms)s
            ) RETURNING query_id
        """, {
            "tenant_id":    tenant_id,
            "location_id":  payload.location_id,
            "day":          payload.day,
            "kpi_code":     payload.kpi_code,
            "domain":       domain,
            "query_type":   payload.query_type,
            "engine_id":    engine_id,
            "prompt":       prompt,
            "kpi_context":  __import__("json").dumps(kpi_context),
            "risk_context": __import__("json").dumps(risk_context),
            "response":     response_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd":     cost_usd,
            "duration_ms":  duration_ms,
        })
        query_id = str(cur.fetchone()[0])
        conn.commit()

        logger.info(
            "KPI query logged — tenant=%s loc=%s kpi=%s domain=%s tokens=%d cost=$%.6f",
            tenant_id[:8], payload.location_id, payload.kpi_code,
            domain, input_tokens + output_tokens, cost_usd
        )

        return {
            "ok": True,
            "query_id": query_id,
            "domain": domain,
            "domain_label": DOMAIN_GROUPS[domain]["label"],
            "location_name": location_name,
            "kpi_context": kpi_context,
            "risk_context": risk_context,
            "response": response_text,
            "query_type": payload.query_type,
            "duration_ms": duration_ms,
            "cost_usd": round(cost_usd, 6),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error("KPI query failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
