#!/usr/bin/env python3
"""
Valora AI — ML Insight Generation Pipeline
==========================================
Reads Silver layer (f_location_daily_features)
Detects risks + opportunities using rule-based ML
Calls LLM (Gemini/Claude/Grok/Llama) for narratives
Populates:
  ml.location_risk_daily
  ml.recommended_action_daily
  ml.profit_opportunity_daily
  ml.insight_brief_daily

Usage:
  python scripts/generate_insights.py \
    --tenant-id <uuid> \
    --location-id <int> \
    --as-of-date 2025-12-31 \
    --provider gemini

  # Run for all locations of a tenant:
  python scripts/generate_insights.py \
    --tenant-id <uuid> \
    --as-of-date 2025-12-31
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# DB Connection
# ─────────────────────────────────────────────

def get_conn():
    db_url = os.getenv("DATABASE_URL", "").replace(
        "postgresql+psycopg2://", "postgresql://"
    )
    return psycopg2.connect(db_url)


# ─────────────────────────────────────────────
# Gold Data Fetcher
# ─────────────────────────────────────────────

def fetch_silver_window(
    conn,
    tenant_id: str,
    location_id: int,
    as_of_date: date,
    days: int = 30,
) -> list[dict]:
    """Fetch last N days from Gold analytics view for ML/AI analysis."""
    start_date = as_of_date - timedelta(days=days - 1)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT
            day,
            revenue,
            cogs,
            labor,
            fixed_costs,
            -- Computed in Gold view
            COALESCE(revenue - cogs, 0)                         AS gross_profit,
            COALESCE(gross_margin, 0)                           AS gross_margin,
            COALESCE(food_cost_pct, 0)                         AS food_cost_pct,
            COALESCE(labor_cost_pct, 0)                        AS labor_cost_pct,
            COALESCE(cogs + labor, 0)                          AS prime_cost,
            COALESCE(prime_cost_pct, 0)                        AS prime_cost_pct,
            ebit,
            orders,
            customers,
            COALESCE(aov, 0)                                    AS aov,
            -- Not available in Gold — defaulting to 0
            0                                                   AS waste_amount,
            0                                                   AS waste_pct,
            COALESCE(avg_inventory, 0)                         AS avg_inventory,
            0                                                   AS stockout_count,
            0                                                   AS labor_hours,
            0                                                   AS sales_per_labor_hour,
            0                                                   AS discount_pct,
            0                                                   AS sales_last_7d_avg,
            0                                                   AS sales_last_14d_avg
        FROM analytics.v_gold_daily
        WHERE tenant_id = %s::uuid
          AND location_id = %s
          AND day BETWEEN %s AND %s
        ORDER BY day ASC
        """,
        [tenant_id, location_id, start_date, as_of_date],
    )
    rows = cur.fetchall()
    cur.close()
    return [dict(r) for r in rows]


def fetch_location_info(conn, tenant_id: str, location_id: int) -> dict:
    """Fetch location metadata."""
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(
        """
        SELECT location_name, city, region, country_code, timezone
        FROM restaurant.dim_location
        WHERE tenant_id = %s::uuid AND location_id = %s
        LIMIT 1
        """,
        [tenant_id, location_id],
    )
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else {}


def fetch_all_locations(conn, tenant_id: str) -> list[int]:
    """Fetch all active location IDs for a tenant from Gold layer."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT DISTINCT location_id
        FROM analytics.v_gold_daily
        WHERE tenant_id = %s::uuid
        ORDER BY location_id
        """,
        [tenant_id],
    )
    rows = cur.fetchall()
    cur.close()
    return [r[0] for r in rows]


# ─────────────────────────────────────────────
# Trend & Risk Detection (Rule-Based ML)
# ─────────────────────────────────────────────

def _safe_float(v) -> float:
    try:
        return float(v) if v is not None else 0.0
    except Exception:
        return 0.0


def _linear_slope(values: list[float]) -> float:
    """Simple linear regression slope."""
    n = len(values)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den != 0 else 0.0


def detect_risks(rows: list[dict], as_of_date: date) -> list[dict]:
    """
    Rule-based risk detection from Silver data.
    Returns list of risks ordered by severity.
    """
    if not rows:
        return []

    risks = []

    revenues = [_safe_float(r["revenue"]) for r in rows]
    food_costs = [_safe_float(r["food_cost_pct"]) for r in rows]
    labor_costs = [_safe_float(r["labor_cost_pct"]) for r in rows]
    prime_costs = [_safe_float(r["prime_cost_pct"]) for r in rows]
    waste_pcts = [_safe_float(r["waste_pct"]) for r in rows]
    ebits = [_safe_float(r["ebit"]) for r in rows]
    margins = [_safe_float(r["gross_margin"]) for r in rows]

    last_7 = rows[-7:] if len(rows) >= 7 else rows
    last_30 = rows

    # Avg metrics
    avg_revenue_30 = sum(revenues) / len(revenues) if revenues else 0
    avg_revenue_7 = sum(_safe_float(r["revenue"]) for r in last_7) / len(last_7)
    avg_food_cost = sum(food_costs) / len(food_costs) if food_costs else 0
    avg_labor_cost = sum(labor_costs) / len(labor_costs) if labor_costs else 0
    avg_prime_cost = sum(prime_costs) / len(prime_costs) if prime_costs else 0
    avg_margin = sum(margins) / len(margins) if margins else 0
    avg_waste = sum(waste_pcts) / len(waste_pcts) if waste_pcts else 0

    # Revenue slope (trend direction)
    rev_slope = _linear_slope(revenues)
    rev_slope_pct = (rev_slope / avg_revenue_30 * 100) if avg_revenue_30 > 0 else 0

    # ── Revenue Decline Risk ──────────────────────────────────
    if rev_slope_pct < -2.0:
        severity = "critical" if rev_slope_pct < -5.0 else "high"
        score = min(1.0, abs(rev_slope_pct) / 10.0)
        impact = abs(rev_slope) * 7  # 7-day projected impact
        risks.append({
            "risk_type": "revenue_decline",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round(impact, 2),
            "metrics": {
                "revenue_slope_pct_per_day": round(rev_slope_pct, 2),
                "avg_revenue_30d": round(avg_revenue_30, 2),
                "avg_revenue_7d": round(avg_revenue_7, 2),
                "projected_weekly_impact": round(impact, 2),
            },
        })

    # ── Food Cost Risk ────────────────────────────────────────
    if avg_food_cost > 0.33:
        severity = "critical" if avg_food_cost > 0.38 else "high"
        score = min(1.0, (avg_food_cost - 0.28) / 0.15)
        food_slope = _linear_slope(food_costs)
        risks.append({
            "risk_type": "food_cost_high",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round((avg_food_cost - 0.30) * avg_revenue_30, 2),
            "metrics": {
                "avg_food_cost_pct": round(avg_food_cost * 100, 2),
                "benchmark_pct": 30.0,
                "excess_pct": round((avg_food_cost - 0.30) * 100, 2),
                "trend_slope": round(food_slope * 100, 4),
            },
        })

    # ── Labor Cost Risk ───────────────────────────────────────
    if avg_labor_cost > 0.33:
        severity = "critical" if avg_labor_cost > 0.38 else "high"
        score = min(1.0, (avg_labor_cost - 0.28) / 0.15)
        risks.append({
            "risk_type": "labor_cost_high",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round((avg_labor_cost - 0.30) * avg_revenue_30, 2),
            "metrics": {
                "avg_labor_cost_pct": round(avg_labor_cost * 100, 2),
                "benchmark_pct": 30.0,
                "excess_pct": round((avg_labor_cost - 0.30) * 100, 2),
            },
        })

    # ── Prime Cost Risk ───────────────────────────────────────
    if avg_prime_cost > 0.65:
        severity = "critical" if avg_prime_cost > 0.72 else "high"
        score = min(1.0, (avg_prime_cost - 0.60) / 0.20)
        risks.append({
            "risk_type": "prime_cost_high",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round((avg_prime_cost - 0.60) * avg_revenue_30, 2),
            "metrics": {
                "avg_prime_cost_pct": round(avg_prime_cost * 100, 2),
                "benchmark_pct": 60.0,
            },
        })

    # ── Margin Compression Risk ───────────────────────────────
    margin_slope = _linear_slope(margins)
    if margin_slope < -0.002:
        severity = "high" if margin_slope < -0.005 else "medium"
        score = min(1.0, abs(margin_slope) / 0.01)
        risks.append({
            "risk_type": "margin_compression",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round(abs(margin_slope) * 7 * avg_revenue_30, 2),
            "metrics": {
                "margin_slope_per_day": round(margin_slope * 100, 4),
                "avg_margin_pct": round(avg_margin * 100, 2),
                "projected_margin_7d": round((avg_margin + margin_slope * 7) * 100, 2),
            },
        })

    # ── Negative EBIT Risk ────────────────────────────────────
    negative_ebit_days = sum(1 for e in ebits if e < 0)
    if negative_ebit_days > 0:
        severity = "critical" if negative_ebit_days > 5 else "high"
        score = min(1.0, negative_ebit_days / len(ebits))
        risks.append({
            "risk_type": "negative_ebit",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round(abs(sum(e for e in ebits if e < 0)), 2),
            "metrics": {
                "negative_ebit_days": negative_ebit_days,
                "total_days": len(ebits),
                "total_negative_ebit": round(sum(e for e in ebits if e < 0), 2),
            },
        })

    # ── Waste Risk ────────────────────────────────────────────
    if avg_waste > 0.03:
        severity = "high" if avg_waste > 0.05 else "medium"
        score = min(1.0, avg_waste / 0.08)
        risks.append({
            "risk_type": "waste_spike",
            "severity_band": severity,
            "severity_score": round(score, 4),
            "impact_estimate": round(avg_waste * avg_revenue_30, 2),
            "metrics": {
                "avg_waste_pct": round(avg_waste * 100, 2),
                "benchmark_pct": 2.0,
                "excess_pct": round((avg_waste - 0.02) * 100, 2),
            },
        })

    # Sort by severity score descending
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    risks.sort(
        key=lambda r: (
            severity_order.get(r["severity_band"], 9),
            -r["severity_score"],
        )
    )

    return risks


def detect_opportunities(rows: list[dict]) -> list[dict]:
    """
    Rule-based opportunity detection.
    Returns list of profit opportunities.
    """
    if not rows:
        return []

    opportunities = []

    revenues = [_safe_float(r["revenue"]) for r in rows]
    margins = [_safe_float(r["gross_margin"]) for r in rows]
    aovs = [_safe_float(r["aov"]) for r in rows]
    discount_pcts = [_safe_float(r.get("discount_pct", 0)) for r in rows]

    avg_revenue = sum(revenues) / len(revenues) if revenues else 0
    avg_margin = sum(margins) / len(margins) if margins else 0
    avg_aov = sum(aovs) / len(aovs) if aovs else 0
    avg_discount = sum(discount_pcts) / len(discount_pcts) if discount_pcts else 0

    # ── AOV Uplift Opportunity ────────────────────────────────
    if avg_aov < 15.0 and avg_revenue > 0:
        target_aov = avg_aov * 1.15
        avg_orders = sum(_safe_float(r["orders"]) for r in rows) / len(rows)
        uplift = (target_aov - avg_aov) * avg_orders * 30
        opportunities.append({
            "opportunity_type": "aov_uplift",
            "action_code": "upsell_bundle_promotion",
            "estimated_profit_uplift": round(uplift * avg_margin, 2),
            "uplift_horizon_days": 30,
            "confidence_score": 0.72,
            "driver_metrics": {
                "current_aov": round(avg_aov, 2),
                "target_aov": round(target_aov, 2),
                "avg_daily_orders": round(avg_orders, 0),
                "estimated_monthly_uplift": round(uplift, 2),
            },
            "rationale": f"AOV of ${avg_aov:.2f} is below optimal. Bundling or upsell prompts could increase by 15%.",
        })

    # ── Discount Reduction Opportunity ───────────────────────
    if avg_discount > 0.03:
        recover_revenue = avg_discount * avg_revenue * 30
        opportunities.append({
            "opportunity_type": "discount_optimization",
            "action_code": "reduce_discount_rate",
            "estimated_profit_uplift": round(recover_revenue * avg_margin, 2),
            "uplift_horizon_days": 30,
            "confidence_score": 0.80,
            "driver_metrics": {
                "avg_discount_pct": round(avg_discount * 100, 2),
                "monthly_discount_revenue_loss": round(recover_revenue, 2),
            },
            "rationale": f"Discount rate of {avg_discount*100:.1f}% is eroding margins. Reducing by 30% would recover significant profit.",
        })

    # ── Revenue Growth Opportunity ────────────────────────────
    rev_slope = _linear_slope(revenues)
    if rev_slope > 0:
        projected_uplift = rev_slope * 30 * avg_margin
        opportunities.append({
            "opportunity_type": "revenue_momentum",
            "action_code": "accelerate_growth_momentum",
            "estimated_profit_uplift": round(projected_uplift, 2),
            "uplift_horizon_days": 30,
            "confidence_score": 0.65,
            "driver_metrics": {
                "daily_revenue_growth": round(rev_slope, 2),
                "projected_monthly_additional": round(rev_slope * 30, 2),
            },
            "rationale": "Positive revenue trend detected. Capitalize with targeted promotions.",
        })

    # Sort by estimated profit uplift
    opportunities.sort(key=lambda o: -o["estimated_profit_uplift"])

    return opportunities


def generate_recommended_actions(
    risks: list[dict],
    opportunities: list[dict],
    metrics: dict,
) -> list[dict]:
    """Generate recommended actions based on risks and opportunities."""
    actions = []
    rank = 1

    # Actions from risks
    risk_action_map = {
        "revenue_decline": {
            "action_code": "investigate_revenue_decline",
            "title": "Investigate Revenue Decline",
            "description": "Analyze sales channels, menu performance, and customer traffic to identify root cause.",
            "expected_roi": 0.15,
        },
        "food_cost_high": {
            "action_code": "reduce_food_cost",
            "title": "Reduce Food Cost",
            "description": "Review supplier pricing, portion sizes, and waste. Negotiate better rates.",
            "expected_roi": 0.12,
        },
        "labor_cost_high": {
            "action_code": "optimize_labor_schedule",
            "title": "Optimize Labor Schedule",
            "description": "Review shift scheduling, reduce overtime, align staffing with demand patterns.",
            "expected_roi": 0.10,
        },
        "prime_cost_high": {
            "action_code": "reduce_prime_cost",
            "title": "Reduce Prime Cost",
            "description": "Focus on combined food and labor cost reduction. Target below 65%.",
            "expected_roi": 0.18,
        },
        "margin_compression": {
            "action_code": "protect_gross_margin",
            "title": "Protect Gross Margin",
            "description": "Review pricing strategy, menu mix, and cost controls to halt margin erosion.",
            "expected_roi": 0.14,
        },
        "negative_ebit": {
            "action_code": "restore_profitability",
            "title": "Restore Profitability",
            "description": "Urgent: review all cost centers, eliminate waste, and boost revenue immediately.",
            "expected_roi": 0.25,
        },
        "waste_spike": {
            "action_code": "reduce_kitchen_waste",
            "title": "Reduce Kitchen Waste",
            "description": "Implement FIFO, review prep quantities, and track waste daily.",
            "expected_roi": 0.08,
        },
    }

    for risk in risks[:3]:  # Top 3 risks
        risk_type = risk["risk_type"]
        if risk_type in risk_action_map:
            action = risk_action_map[risk_type].copy()
            action["priority_rank"] = rank
            action["confidence_score"] = risk["severity_score"]
            action["rationale_json"] = {
                "risk_type": risk_type,
                "severity": risk["severity_band"],
                "metrics": risk["metrics"],
            }
            actions.append(action)
            rank += 1

    # Actions from opportunities
    opp_action_map = {
        "aov_uplift": {
            "action_code": "upsell_bundle_promotion",
            "title": "Launch Upsell Promotion",
            "description": "Create bundle offers and train staff on upselling to increase average order value.",
            "expected_roi": 0.15,
        },
        "discount_optimization": {
            "action_code": "reduce_discount_rate",
            "title": "Optimize Discount Strategy",
            "description": "Review and reduce unnecessary discounts to protect margin.",
            "expected_roi": 0.10,
        },
        "revenue_momentum": {
            "action_code": "accelerate_growth_momentum",
            "title": "Accelerate Revenue Momentum",
            "description": "Build on positive trend with targeted marketing and promotions.",
            "expected_roi": 0.12,
        },
    }

    for opp in opportunities[:2]:  # Top 2 opportunities
        opp_type = opp["opportunity_type"]
        if opp_type in opp_action_map:
            action = opp_action_map[opp_type].copy()
            action["priority_rank"] = rank
            action["confidence_score"] = opp["confidence_score"]
            action["rationale_json"] = {
                "opportunity_type": opp_type,
                "estimated_uplift": opp["estimated_profit_uplift"],
                "metrics": opp["driver_metrics"],
            }
            actions.append(action)
            rank += 1

    return actions


# ─────────────────────────────────────────────
# LLM Narrative Generation
# ─────────────────────────────────────────────

def generate_llm_narrative(
    location_info: dict,
    metrics: dict,
    risks: list[dict],
    opportunities: list[dict],
    actions: list[dict],
    as_of_date: date,
    provider: str = "gemini",
) -> dict:
    """
    Call LLM to generate human-readable insight narrative.
    Supports: gemini, claude, grok, llama
    """

    top_risk = risks[0] if risks else None
    top_opp = opportunities[0] if opportunities else None
    top_action = actions[0] if actions else None

    prompt = f"""
You are Valora AI, a restaurant decision-intelligence assistant.

Generate a concise daily business intelligence brief for this restaurant location.

Rules:
- Use ONLY the provided data. Do not invent facts.
- Be practical and executive-readable.
- Focus on what's happening, why it matters, and what to do.
- Return plain text only in the exact format below.

Location: {location_info.get('location_name', 'Unknown')}
Region: {location_info.get('city', '')}, {location_info.get('region', '')}
Date: {as_of_date}

Key Metrics (30-day averages):
- Revenue: ${metrics.get('avg_revenue', 0):,.2f}
- Gross Margin: {metrics.get('avg_margin_pct', 0):.1f}%
- Food Cost: {metrics.get('avg_food_cost_pct', 0):.1f}%
- Labor Cost: {metrics.get('avg_labor_cost_pct', 0):.1f}%
- Prime Cost: {metrics.get('avg_prime_cost_pct', 0):.1f}%
- EBIT: ${metrics.get('total_ebit', 0):,.2f}
- Orders: {metrics.get('total_orders', 0):,}

Top Risk: {top_risk['risk_type'] if top_risk else 'None detected'}
Top Opportunity: {top_opp['opportunity_type'] if top_opp else 'None detected'}
Top Action: {top_action['action_code'] if top_action else 'None'}

Output format (EXACTLY):
Headline: <one short headline under 100 chars>
Summary: <2-3 sentences covering performance, key risk, and opportunity>
Recommendation: <2-3 concrete actions the operator should take>
""".strip()

    try:
        if provider == "gemini":
            return _call_gemini(prompt)
        elif provider == "claude":
            return _call_claude(prompt)
        elif provider == "grok":
            return _call_grok(prompt)
        elif provider == "llama":
            return _call_llama(prompt)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    except Exception as e:
        logger.warning("LLM generation failed (%s): %s — using fallback", provider, e)
        return _fallback_narrative(location_info, metrics, risks, opportunities, as_of_date)


def _call_gemini(prompt: str) -> dict:
    from google import genai
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
        config={"temperature": 0.2},
    )
    text = response.text.strip()
    return _parse_llm_response(text, "gemini", "gemini-2.5-flash-lite")


def _call_claude(prompt: str) -> dict:
    """Claude API via Anthropic SDK."""
    try:
        import anthropic
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        return _parse_llm_response(text, "claude", "claude-sonnet-4-6")
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")


def _call_grok(prompt: str) -> dict:
    """Grok API via xAI."""
    try:
        from openai import OpenAI
        api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")
        if not api_key:
            raise RuntimeError("GROK_API_KEY not set")
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.x.ai/v1",
        )
        response = client.chat.completions.create(
            model="grok-2-latest",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        text = response.choices[0].message.content.strip()
        return _parse_llm_response(text, "grok", "grok-2-latest")
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")


def _call_llama(prompt: str) -> dict:
    """Llama via Groq API (fast inference)."""
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set")
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        text = response.choices[0].message.content.strip()
        return _parse_llm_response(text, "llama", "llama-3.3-70b-versatile")
    except ImportError:
        raise RuntimeError("groq package not installed. Run: pip install groq")


def _parse_llm_response(text: str, provider: str, model: str) -> dict:
    """Parse LLM response into structured fields."""
    headline = ""
    summary = ""
    recommendation = ""

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        lower = line.lower()
        if lower.startswith("headline:"):
            headline = line.split(":", 1)[1].strip()
        elif lower.startswith("summary:"):
            summary = line.split(":", 1)[1].strip()
        elif lower.startswith("recommendation:"):
            recommendation = line.split(":", 1)[1].strip()

    if not headline:
        headline = text.splitlines()[0][:200] if text else "Daily Intelligence Brief"
    if not summary:
        summary = text[:500]
    if not recommendation:
        recommendation = "Review top risks and execute recommended actions."

    return {
        "headline": headline,
        "summary_text": summary,
        "recommendation_text": recommendation,
        "provider": provider,
        "model": model,
        "raw_text": text,
    }


def _fallback_narrative(
    location_info: dict,
    metrics: dict,
    risks: list[dict],
    opportunities: list[dict],
    as_of_date: date,
) -> dict:
    """Rule-based fallback when LLM is unavailable."""
    name = location_info.get("location_name", "this location")
    avg_rev = metrics.get("avg_revenue", 0)
    avg_margin = metrics.get("avg_margin_pct", 0)

    top_risk_text = f"Top risk: {risks[0]['risk_type']}" if risks else "No critical risks detected"
    top_opp_text = f"Top opportunity: {opportunities[0]['opportunity_type']}" if opportunities else "Monitor current performance"

    headline = f"{name}: ${avg_rev:,.0f} avg daily revenue, {avg_margin:.1f}% margin"
    summary = (
        f"{name} generated an average of ${avg_rev:,.2f} in daily revenue "
        f"with a {avg_margin:.1f}% gross margin over the last 30 days. "
        f"{top_risk_text}."
    )
    recommendation = f"{top_opp_text}. Review cost controls and monitor daily KPIs."

    return {
        "headline": headline,
        "summary_text": summary,
        "recommendation_text": recommendation,
        "provider": "rule_based",
        "model": "fallback_v1",
        "raw_text": f"{headline}\n{summary}\n{recommendation}",
    }


# ─────────────────────────────────────────────
# DB Writers
# ─────────────────────────────────────────────

def upsert_location_risks(
    conn,
    tenant_id: str,
    location_id: int,
    as_of_date: date,
    risks: list[dict],
):
    """Upsert risks into ml.location_risk_daily."""
    cur = conn.cursor()

    # Delete existing for this day
    cur.execute(
        "DELETE FROM ml.location_risk_daily WHERE tenant_id = %s::uuid AND location_id = %s AND day = %s",
        [tenant_id, location_id, as_of_date],
    )

    for risk in risks:
        cur.execute(
            """
            INSERT INTO ml.location_risk_daily (
                day, tenant_id, location_id,
                risk_type, severity_score, severity_band,
                impact_estimate, created_at
            ) VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, now())
            """,
            [
                as_of_date,
                tenant_id,
                location_id,
                risk["risk_type"],
                risk["severity_score"],
                risk["severity_band"],
                risk["impact_estimate"],
            ],
        )

    cur.close()
    logger.info("  ✅ Upserted %d risks", len(risks))


def upsert_recommended_actions(
    conn,
    tenant_id: str,
    location_id: int,
    as_of_date: date,
    actions: list[dict],
):
    """Upsert actions into ml.recommended_action_daily."""
    cur = conn.cursor()

    # Check columns
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'ml' AND table_name = 'recommended_action_daily'
        """,
    )
    cols = {r[0] for r in cur.fetchall()}

    cur.execute(
        "DELETE FROM ml.recommended_action_daily WHERE tenant_id = %s::uuid AND location_id = %s AND as_of_date = %s",
        [tenant_id, location_id, as_of_date],
    )

    for action in actions:
        cur.execute(
            """
            INSERT INTO ml.recommended_action_daily (
                as_of_date, tenant_id, location_id,
                action_code, priority_rank,
                expected_roi, confidence_score,
                rationale_json, created_at
            ) VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, %s, now())
            """,
            [
                as_of_date,
                tenant_id,
                location_id,
                action["action_code"],
                action["priority_rank"],
                action.get("expected_roi", 0),
                action.get("confidence_score", 0),
                json.dumps(action.get("rationale_json", {})),
            ],
        )

    cur.close()
    logger.info("  ✅ Upserted %d recommended actions", len(actions))


def upsert_profit_opportunities(
    conn,
    tenant_id: str,
    location_id: int,
    as_of_date: date,
    opportunities: list[dict],
):
    """Upsert opportunities into ml.profit_opportunity_daily."""
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM ml.profit_opportunity_daily WHERE tenant_id = %s::uuid AND location_id = %s AND as_of_date = %s",
        [tenant_id, location_id, as_of_date],
    )

    for opp in opportunities:
        cur.execute(
            """
            INSERT INTO ml.profit_opportunity_daily (
                as_of_date, tenant_id, location_id,
                opportunity_type, action_code,
                estimated_profit_uplift, uplift_horizon_days,
                confidence_score,
                driver_metrics_json, rationale_json,
                created_at
            ) VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, now())
            """,
            [
                as_of_date,
                tenant_id,
                location_id,
                opp["opportunity_type"],
                opp["action_code"],
                opp["estimated_profit_uplift"],
                opp["uplift_horizon_days"],
                opp["confidence_score"],
                json.dumps(opp.get("driver_metrics", {})),
                json.dumps({"rationale": opp.get("rationale", "")}),
            ],
        )

    cur.close()
    logger.info("  ✅ Upserted %d profit opportunities", len(opportunities))


def upsert_insight_brief(
    conn,
    tenant_id: str,
    location_id: int,
    as_of_date: date,
    narrative: dict,
    risks: list[dict],
    actions: list[dict],
):
    """Upsert insight brief into ml.insight_brief_daily."""
    cur = conn.cursor()

    cur.execute(
        "DELETE FROM ml.insight_brief_daily WHERE tenant_id = %s::uuid AND location_id = %s AND as_of_date = %s",
        [tenant_id, location_id, as_of_date],
    )

    cur.execute(
        """
        INSERT INTO ml.insight_brief_daily (
            as_of_date, tenant_id, location_id,
            headline, summary_text,
            risk_summary_json, recommended_actions_json,
            model_name, model_version,
            created_at
        ) VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, %s, %s, now())
        """,
        [
            as_of_date,
            tenant_id,
            location_id,
            narrative["headline"],
            narrative["summary_text"],
            json.dumps({"risks": risks[:3]}),
            json.dumps({"actions": actions[:3], "recommendation": narrative["recommendation_text"]}),
            narrative.get("model", "rule_based_v1"),
            narrative.get("provider", "rule_based"),
        ],
    )

    cur.close()
    logger.info("  ✅ Upserted insight brief")


def refresh_mv_control_tower(conn):
    """Refresh or create materialized view for control tower."""
    cur = conn.cursor()

    # Check if MV exists
    cur.execute(
        """
        SELECT COUNT(*) FROM pg_matviews
        WHERE schemaname = 'ml' AND matviewname = 'mv_valora_control_tower'
        """
    )
    exists = cur.fetchone()[0] > 0

    if not exists:
        logger.info("Creating ml.mv_valora_control_tower...")
        cur.execute("""
            CREATE MATERIALIZED VIEW ml.mv_valora_control_tower AS
            SELECT * FROM ml.v_valora_control_tower
        """)
        cur.execute("""
            CREATE INDEX idx_mv_ct_tenant_date
            ON ml.mv_valora_control_tower(tenant_id, as_of_date)
        """)
        cur.execute("""
            CREATE INDEX idx_mv_ct_location
            ON ml.mv_valora_control_tower(location_id, as_of_date)
        """)
        logger.info("✅ Created mv_valora_control_tower")
    else:
        cur.execute("REFRESH MATERIALIZED VIEW ml.mv_valora_control_tower")
        logger.info("✅ Refreshed mv_valora_control_tower")

    cur.close()


# ─────────────────────────────────────────────
# Main Pipeline
# ─────────────────────────────────────────────

def run_pipeline(
    tenant_id: str,
    location_id: int,
    as_of_date: date,
    provider: str = "gemini",
    window_days: int = 30,
):
    """Run full insight generation pipeline for one location."""
    logger.info("━" * 60)
    logger.info("Generating insights for:")
    logger.info("  tenant_id:   %s", tenant_id)
    logger.info("  location_id: %s", location_id)
    logger.info("  as_of_date:  %s", as_of_date)
    logger.info("  provider:    %s", provider)
    logger.info("  window:      %d days", window_days)
    logger.info("━" * 60)

    conn = get_conn()

    try:
        # 1. Fetch Silver data
        rows = fetch_silver_window(conn, tenant_id, location_id, as_of_date, window_days)
        if not rows:
            logger.warning("No Silver data found — skipping")
            return

        logger.info("Fetched %d days of Silver data", len(rows))

        # 2. Fetch location info
        location_info = fetch_location_info(conn, tenant_id, location_id)
        logger.info("Location: %s", location_info.get("location_name", "Unknown"))

        # 3. Calculate summary metrics
        revenues = [_safe_float(r["revenue"]) for r in rows]
        margins = [_safe_float(r["gross_margin"]) for r in rows]
        food_costs = [_safe_float(r["food_cost_pct"]) for r in rows]
        labor_costs = [_safe_float(r["labor_cost_pct"]) for r in rows]
        prime_costs = [_safe_float(r["prime_cost_pct"]) for r in rows]
        ebits = [_safe_float(r["ebit"]) for r in rows]
        orders = [_safe_float(r["orders"]) for r in rows]

        metrics = {
            "avg_revenue": sum(revenues) / len(revenues) if revenues else 0,
            "total_revenue": sum(revenues),
            "avg_margin_pct": sum(margins) / len(margins) * 100 if margins else 0,
            "avg_food_cost_pct": sum(food_costs) / len(food_costs) * 100 if food_costs else 0,
            "avg_labor_cost_pct": sum(labor_costs) / len(labor_costs) * 100 if labor_costs else 0,
            "avg_prime_cost_pct": sum(prime_costs) / len(prime_costs) * 100 if prime_costs else 0,
            "total_ebit": sum(ebits),
            "total_orders": int(sum(orders)),
        }

        # 4. Detect risks
        risks = detect_risks(rows, as_of_date)
        logger.info("Detected %d risks", len(risks))
        for r in risks[:3]:
            logger.info("  → %s (%s, score=%.3f)", r["risk_type"], r["severity_band"], r["severity_score"])

        # 5. Detect opportunities
        opportunities = detect_opportunities(rows)
        logger.info("Detected %d opportunities", len(opportunities))

        # 6. Generate recommended actions
        actions = generate_recommended_actions(risks, opportunities, metrics)
        logger.info("Generated %d recommended actions", len(actions))

        # 7. Generate LLM narrative
        logger.info("Calling %s for narrative...", provider)
        narrative = generate_llm_narrative(
            location_info=location_info,
            metrics=metrics,
            risks=risks,
            opportunities=opportunities,
            actions=actions,
            as_of_date=as_of_date,
            provider=provider,
        )
        logger.info("Narrative: %s", narrative["headline"])

        # 8. Write to DB
        upsert_location_risks(conn, tenant_id, location_id, as_of_date, risks)
        upsert_recommended_actions(conn, tenant_id, location_id, as_of_date, actions)
        upsert_profit_opportunities(conn, tenant_id, location_id, as_of_date, opportunities)
        upsert_insight_brief(conn, tenant_id, location_id, as_of_date, narrative, risks, actions)

        conn.commit()

        # 9. Refresh control tower MV
        refresh_mv_control_tower(conn)
        conn.commit()

        logger.info("✅ Pipeline complete for location %d", location_id)

    except Exception as e:
        conn.rollback()
        logger.exception("❌ Pipeline failed: %s", e)
        raise
    finally:
        conn.close()


def run_tenant_pipeline(
    tenant_id: str,
    as_of_date: date,
    provider: str = "gemini",
):
    """Run pipeline for all locations of a tenant."""
    conn = get_conn()
    locations = fetch_all_locations(conn, tenant_id)
    conn.close()

    logger.info("Running pipeline for %d locations", len(locations))

    for location_id in locations:
        try:
            run_pipeline(
                tenant_id=tenant_id,
                location_id=location_id,
                as_of_date=as_of_date,
                provider=provider,
            )
        except Exception as e:
            logger.error("Failed for location %d: %s", location_id, e)
            continue

    logger.info("✅ Tenant pipeline complete")


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora AI Insight Generation")
    parser.add_argument("--tenant-id",   required=True,  help="Tenant UUID")
    parser.add_argument("--location-id", required=False, type=int, help="Location ID (omit for all)")
    parser.add_argument("--as-of-date",  required=True,  help="Date YYYY-MM-DD")
    parser.add_argument("--provider",    default="gemini", choices=["gemini", "claude", "grok", "llama"])
    parser.add_argument("--window-days", default=30, type=int, help="Days of Silver data to analyze")
    args = parser.parse_args()

    as_of = date.fromisoformat(args.as_of_date)

    if args.location_id:
        run_pipeline(
            tenant_id=args.tenant_id,
            location_id=args.location_id,
            as_of_date=as_of,
            provider=args.provider,
            window_days=args.window_days,
        )
    else:
        run_tenant_pipeline(
            tenant_id=args.tenant_id,
            as_of_date=as_of,
            provider=args.provider,
        )
