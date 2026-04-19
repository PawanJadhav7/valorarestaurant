"""
Valora AI — KPI Query API
Handles KPI tile clicks → builds dynamic context via KpiContextEngine →
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
from app.ml.kpi_context_engine import KpiContextEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/kpi", tags=["KPI Query"])


class KpiQueryRequest(BaseModel):
    kpi_code: str
    location_id: Optional[int] = None
    day: str
    query_type: str = "attention"   # "attention" | "action"


def _build_prompt(
    query_type: str,
    kpi_code: str,
    context: dict,
) -> str:
    location_name = context["location_name"]
    day = context["as_of_date"]
    kpi_values = context["kpi_values"]
    active_risks = context["active_risks"]
    portfolio = context.get("portfolio_context", {})
    scope = context["scope"]

    # Format KPI values
    kpi_lines = "\n".join(
        f"  {k.replace('_', ' ').title()}: {round(v, 4) if isinstance(v, float) else v}"
        for k, v in kpi_values.items()
        if v is not None
    )

    # Format risk signals
    risk_lines = "\n".join(
        f"  {r['risk_type'].replace('_', ' ').title()} — "
        f"{r['severity_band']} severity, impact ${r['impact_estimate']:,.2f}"
        for r in active_risks
    ) if active_risks else "  No active risks detected"

    # Format portfolio comparison
    portfolio_lines = ""
    if portfolio:
        portfolio_lines = "\nPortfolio Comparison (this location vs all locations):\n"
        portfolio_lines += "\n".join(
            f"  {k.replace('_', ' ').title()}: "
            f"this={v['location']:.4f} "
            f"avg={v['portfolio_avg']:.4f} "
            f"delta={v['delta_pct']:+.1f}%"
            for k, v in portfolio.items()
            if v['delta_pct'] is not None
        )

    scope_label = "Single Location" if scope == "single_location" else "Portfolio View"

    if query_type == "attention":
        question = (
            f"The owner clicked on the {kpi_code.replace('_', ' ').title()} metric. "
            f"Based on the data below, what are the top 2-3 issues requiring "
            f"immediate attention? Be specific, data-driven, and reference actual "
            f"numbers. Max 150 words."
        )
    else:
        question = (
            f"The owner clicked on the {kpi_code.replace('_', ' ').title()} metric. "
            f"Based on the data below, what are the top 2-3 recommended actions "
            f"to improve performance? For each action include: what to do, "
            f"expected impact with numbers, and timeframe. Max 200 words."
        )

    return f"""You are Valora AI, a restaurant intelligence system.
Restaurant: {location_name}
Date: {day}
Scope: {scope_label}

Current KPI Values:
{kpi_lines}

Active Risk Signals:
{risk_lines}
{portfolio_lines}

{question}"""


def _call_gemini(prompt: str) -> tuple[str, int, int]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(prompt)
        text = response.text or "No response generated."
        input_tokens  = len(prompt.split()) * 4 // 3
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
    tenant_id = user.get("active_tenant_id") or user.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No active tenant")

    db_url = os.environ.get("DATABASE_URL", "").replace(
        "postgresql+psycopg2", "postgresql"
    )

    try:
        start_ms = int(time.time() * 1000)

        # Build dynamic context using KpiContextEngine
        engine = KpiContextEngine(db_url)
        context = engine.build_context(
            kpi_code=payload.kpi_code,
            location_id=payload.location_id,
            day=payload.day,
            tenant_id=tenant_id,
        )

        if not context["kpi_values"]:
            raise HTTPException(
                status_code=404,
                detail=f"No KPI data found for location {payload.location_id} on {payload.day}"
            )

        # Build prompt
        prompt = _build_prompt(
            query_type=payload.query_type,
            kpi_code=payload.kpi_code,
            context=context,
        )

        # Call Gemini
        response_text, input_tokens, output_tokens = _call_gemini(prompt)
        duration_ms = int(time.time() * 1000) - start_ms
        cost_usd = (input_tokens * 0.000075 + output_tokens * 0.000300) / 1000

        # Log to ai.kpi_query_log
        conn = psycopg2.connect(db_url)
        cur  = conn.cursor()
        try:
            cur.execute("""
                SELECT engine_id FROM ai.engine_registry
                WHERE engine_code = 'gemini-2.5-flash-lite' LIMIT 1
            """)
            engine_row = cur.fetchone()
            engine_id  = str(engine_row[0]) if engine_row else None

            import json
            cur.execute("""
                INSERT INTO ai.kpi_query_log (
                    tenant_id, location_id, as_of_date,
                    kpi_code, domain_group, query_type,
                    engine_id, prompt_text, kpi_context_json,
                    risk_context_json, response_text,
                    input_tokens, output_tokens, cost_usd, duration_ms
                ) VALUES (
                    %s::uuid, %s, %s::date,
                    %s, %s, %s,
                    %s::uuid, %s, %s::jsonb,
                    %s::jsonb, %s,
                    %s, %s, %s, %s
                ) RETURNING query_id
            """, (
                tenant_id,
                payload.location_id,
                payload.day,
                payload.kpi_code,
                context["scope"],
                payload.query_type,
                engine_id,
                prompt,
                json.dumps(context["kpi_values"]),
                json.dumps(context["active_risks"]),
                response_text,
                input_tokens,
                output_tokens,
                cost_usd,
                duration_ms,
            ))
            query_id = str(cur.fetchone()[0])
            conn.commit()
        finally:
            cur.close()
            conn.close()

        logger.info(
            "KPI query — tenant=%s loc=%s kpi=%s scope=%s tokens=%d cost=$%.6f",
            tenant_id[:8], payload.location_id, payload.kpi_code,
            context["scope"], input_tokens + output_tokens, cost_usd
        )

        return {
            "ok":           True,
            "query_id":     query_id,
            "scope":        context["scope"],
            "location_name": context["location_name"],
            "kpi_code":     payload.kpi_code,
            "context":      context,
            "response":     response_text,
            "query_type":   payload.query_type,
            "duration_ms":  duration_ms,
            "cost_usd":     round(cost_usd, 6),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("KPI query failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
