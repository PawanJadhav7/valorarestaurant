from __future__ import annotations

from datetime import date
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _fetch_control_tower_row(
    db: Session,
    tenant_id: UUID,
    location_id: int,
    as_of_date: date,
) -> dict[str, Any] | None:
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
          AND location_id = :location_id
          AND as_of_date = :as_of_date
        LIMIT 1
    """)

    row = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "location_id": location_id,
            "as_of_date": as_of_date,
        },
    ).mappings().first()

    return dict(row) if row else None


def _fetch_latest_control_tower_row(
    db: Session,
    tenant_id: UUID,
    location_id: int,
) -> dict[str, Any] | None:
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
          AND location_id = :location_id
        ORDER BY as_of_date DESC
        LIMIT 1
    """)

    row = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "location_id": location_id,
        },
    ).mappings().first()

    return dict(row) if row else None


def _fetch_latest_tenant_summary(
    db: Session,
    tenant_id: UUID,
    as_of_date: Optional[date] = None,
) -> list[dict[str, Any]]:
    if as_of_date:
        sql = text("""
            SELECT
                as_of_date,
                tenant_id,
                location_id,
                location_name,
                region,
                revenue,
                gross_margin,
                prime_cost_pct,
                top_risk_type,
                top_risk_band,
                estimated_profit_uplift,
                headline
            FROM ml.mv_valora_control_tower
            WHERE tenant_id = :tenant_id
              AND as_of_date = :as_of_date
            ORDER BY estimated_profit_uplift DESC NULLS LAST, revenue DESC NULLS LAST
        """)
        rows = db.execute(
            sql,
            {"tenant_id": str(tenant_id), "as_of_date": as_of_date},
        ).mappings().all()
    else:
        sql = text("""
            WITH latest_day AS (
                SELECT MAX(as_of_date) AS as_of_date
                FROM ml.mv_valora_control_tower
                WHERE tenant_id = :tenant_id
            )
            SELECT
                t.as_of_date,
                t.tenant_id,
                t.location_id,
                t.location_name,
                t.region,
                t.revenue,
                t.gross_margin,
                t.prime_cost_pct,
                t.top_risk_type,
                t.top_risk_band,
                t.estimated_profit_uplift,
                t.headline
            FROM ml.mv_valora_control_tower t
            JOIN latest_day d
              ON t.as_of_date = d.as_of_date
            WHERE t.tenant_id = :tenant_id
            ORDER BY t.estimated_profit_uplift DESC NULLS LAST, t.revenue DESC NULLS LAST
        """)
        rows = db.execute(
            sql,
            {"tenant_id": str(tenant_id)},
        ).mappings().all()

    return [dict(r) for r in rows]


def _render_prompt(
    request_type: str,
    user_message: str,
    context: dict[str, Any],
) -> str:
    location_name = context.get("location_name") or "this location"
    region = context.get("region") or "unknown region"
    as_of_date = context.get("as_of_date") or "latest available date"

    prompt = f"""
You are Valora AI, an operations and profitability decision-support assistant for restaurant operators.

Your job:
- explain operational risks and opportunities using only the supplied business context
- be concise, specific, and practical
- do not invent facts
- if data is missing, say that clearly
- prioritize operational actionability

Request type: {request_type}
User question: {user_message}

Context:
- Location: {location_name}
- Region: {region}
- As of date: {as_of_date}

Structured operating context (JSON-like):
{context}

Instructions:
1. Answer in plain business language.
2. Start with the direct answer.
3. Explain the likely cause using the provided metrics.
4. Recommend the next best actions.
5. Do not mention internal table names, schemas, SQL, or model internals.
6. Keep the answer readable for an operator or manager.
""".strip()

    return prompt


def build_chat_context(
    db: Session,
    tenant_id: UUID,
    user_message: str,
    request_type: str,
    location_id: Optional[int] = None,
    as_of_date: Optional[date] = None,
) -> dict[str, Any]:
    if location_id is not None:
        if as_of_date is not None:
            row = _fetch_control_tower_row(
                db=db,
                tenant_id=tenant_id,
                location_id=location_id,
                as_of_date=as_of_date,
            )
        else:
            row = _fetch_latest_control_tower_row(
                db=db,
                tenant_id=tenant_id,
                location_id=location_id,
            )

        if not row:
            context = {
                "tenant_id": str(tenant_id),
                "location_id": location_id,
                "as_of_date": str(as_of_date) if as_of_date else None,
                "data_available": False,
                "message": "No control tower context found for the requested tenant/location/date.",
            }
            context["prompt"] = _render_prompt(
                request_type=request_type,
                user_message=user_message,
                context=context,
            )
            return context

        context = {
            "tenant_id": str(tenant_id),
            "location_id": row.get("location_id"),
            "location_name": row.get("location_name"),
            "region": row.get("region"),
            "country_code": row.get("country_code"),
            "as_of_date": str(row.get("as_of_date")) if row.get("as_of_date") else None,
            "metrics": {
                "revenue": row.get("revenue"),
                "gross_profit": row.get("gross_profit"),
                "gross_margin": row.get("gross_margin"),
                "food_cost_pct": row.get("food_cost_pct"),
                "labor_cost_pct": row.get("labor_cost_pct"),
                "prime_cost_pct": row.get("prime_cost_pct"),
                "aov": row.get("aov"),
                "orders": row.get("orders"),
                "customers": row.get("customers"),
                "labor_hours": row.get("labor_hours"),
                "sales_per_labor_hour": row.get("sales_per_labor_hour"),
                "avg_inventory": row.get("avg_inventory"),
                "stockout_count": row.get("stockout_count"),
                "waste_amount": row.get("waste_amount"),
                "waste_pct": row.get("waste_pct"),
            },
            "top_risk": {
                "risk_type": row.get("top_risk_type"),
                "risk_score": row.get("top_risk_score"),
                "risk_band": row.get("top_risk_band"),
                "impact_estimate": row.get("top_risk_impact_estimate"),
            },
            "top_action": {
                "action_code": row.get("top_action_code"),
                "priority_rank": row.get("top_action_priority_rank"),
                "expected_roi": row.get("top_action_expected_roi"),
                "confidence_score": row.get("top_action_confidence_score"),
                "rationale_json": row.get("top_action_rationale_json"),
            },
            "opportunity": {
                "opportunity_type": row.get("opportunity_type"),
                "action_code": row.get("top_opportunity_action_code"),
                "estimated_profit_uplift": row.get("estimated_profit_uplift"),
                "uplift_horizon_days": row.get("uplift_horizon_days"),
                "confidence_score": row.get("opportunity_confidence_score"),
                "driver_metrics_json": row.get("opportunity_driver_metrics_json"),
                "rationale_json": row.get("opportunity_rationale_json"),
            },
            "existing_brief": {
                "headline": row.get("headline"),
                "summary_text": row.get("summary_text"),
                "risk_summary_json": row.get("risk_summary_json"),
                "recommended_actions_json": row.get("recommended_actions_json"),
            },
            "forecast": {
                "next_forecast_date": row.get("next_forecast_date"),
                "forecast_revenue_next_day": row.get("forecast_revenue_next_day"),
                "forecast_revenue_lower_bound": row.get("forecast_revenue_lower_bound"),
                "forecast_revenue_upper_bound": row.get("forecast_revenue_upper_bound"),
            },
            "data_available": True,
        }
    else:
        tenant_rows = _fetch_latest_tenant_summary(
            db=db,
            tenant_id=tenant_id,
            as_of_date=as_of_date,
        )

        context = {
            "tenant_id": str(tenant_id),
            "location_id": None,
            "location_name": "tenant-wide view",
            "region": None,
            "as_of_date": str(as_of_date) if as_of_date else None,
            "data_available": len(tenant_rows) > 0,
            "tenant_summary": tenant_rows,
        }

    context["prompt"] = _render_prompt(
        request_type=request_type,
        user_message=user_message,
        context=context,
    )

    return context