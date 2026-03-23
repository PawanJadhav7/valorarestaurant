from __future__ import annotations

import hashlib
import json
from datetime import date
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from ValoraEngine.context_assembler import build_chat_context
from ValoraEngine.insight_persistence import (
    create_generation_run,
    finalize_generation_run,
    insert_prompt_audit,
    upsert_location_insight_daily,
)
from ValoraEngine.llm_provider import generate_llm_text


DEFAULT_PROMPT_TEMPLATE_VERSION = "v1.0"
DEFAULT_LLM_PROVIDER = "gemini"
DEFAULT_LLM_MODEL_NAME = "gemini-2.5-flash-lite"


def _hash_context(payload: dict[str, Any]) -> str:
    normalized = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _get_latest_as_of_date_for_tenant(
    db: Session,
    tenant_id: UUID,
) -> Optional[date]:
    sql = text("""
        SELECT MAX(as_of_date)
        FROM ml.mv_valora_control_tower
        WHERE tenant_id = :tenant_id
    """)
    return db.execute(sql, {"tenant_id": str(tenant_id)}).scalar()


def _fetch_control_tower_scope(
    db: Session,
    as_of_date: date,
    tenant_id: Optional[UUID] = None,
) -> list[dict[str, Any]]:
    if tenant_id:
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
            WHERE as_of_date = :as_of_date
              AND tenant_id = :tenant_id
            ORDER BY tenant_id, location_id
        """)
        rows = db.execute(
            sql,
            {"as_of_date": as_of_date, "tenant_id": str(tenant_id)},
        ).mappings().all()
    else:
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
            WHERE as_of_date = :as_of_date
            ORDER BY tenant_id, location_id
        """)
        rows = db.execute(
            sql,
            {"as_of_date": as_of_date},
        ).mappings().all()

    return [dict(r) for r in rows]


def _existing_source_hash(
    db: Session,
    *,
    tenant_id: UUID,
    location_id: int,
    as_of_date: date,
    insight_type: str,
    audience_type: str,
) -> Optional[str]:
    sql = text("""
        SELECT source_hash
        FROM ai.location_insight_daily
        WHERE tenant_id = :tenant_id
          AND location_id = :location_id
          AND as_of_date = :as_of_date
          AND insight_type = :insight_type
          AND audience_type = :audience_type
          AND generation_status = 'active'
        LIMIT 1
    """)

    return db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "location_id": location_id,
            "as_of_date": as_of_date,
            "insight_type": insight_type,
            "audience_type": audience_type,
        },
    ).scalar()


def _build_generation_prompt(context: dict[str, Any]) -> str:
    structured_context = {k: v for k, v in context.items() if k != "prompt"}

    prompt = f"""
You are Valora AI, a restaurant decision-intelligence assistant.

Create a concise, high-value daily control tower insight for this location.

Rules:
- Use only the provided facts.
- Do not invent data.
- Keep the tone practical and executive-readable.
- Focus on risk, opportunity, and the most important next action.
- Return plain text only.

Output format:
Headline: <one short headline>
Summary: <2-4 sentence summary>
Recommendation: <1-3 concrete recommended actions>

Structured context:
{json.dumps(structured_context, default=str, ensure_ascii=False)}
""".strip()

    return prompt


def _parse_generated_text(text_value: str) -> dict[str, str]:
    headline = ""
    summary = ""
    recommendation = ""

    for raw_line in text_value.splitlines():
        line = raw_line.strip()
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
        headline = text_value.strip().splitlines()[0][:200] if text_value.strip() else "Operational update generated"
    if not summary:
        summary = text_value.strip()
    if not recommendation:
        recommendation = "Review the top risk and execute the highest-priority recommended action."

    return {
        "headline": headline,
        "summary_text": summary,
        "recommendation_text": recommendation,
    }


def _generate_for_one_location(
    db: Session,
    *,
    generation_run_id: int,
    tenant_id: UUID,
    location_id: int,
    as_of_date: date,
    force_regenerate: bool,
    audience_type: str = "operator",
    insight_type: str = "control_tower",
) -> dict[str, Any]:
    context = build_chat_context(
        db=db,
        tenant_id=tenant_id,
        location_id=location_id,
        as_of_date=as_of_date,
        user_message="Generate the daily control tower insight for this location.",
        request_type="explain_alert",
    )

    source_hash = _hash_context(context)

    if not force_regenerate:
        existing_hash = _existing_source_hash(
            db=db,
            tenant_id=tenant_id,
            location_id=location_id,
            as_of_date=as_of_date,
            insight_type=insight_type,
            audience_type=audience_type,
        )
        if existing_hash and existing_hash == source_hash:
            return {
                "tenant_id": str(tenant_id),
                "location_id": location_id,
                "as_of_date": str(as_of_date),
                "status": "skipped_unchanged",
            }

    prompt_text = _build_generation_prompt(context)

    result = generate_llm_text(
        prompt=prompt_text,
        provider=DEFAULT_LLM_PROVIDER,
        model_name=DEFAULT_LLM_MODEL_NAME,
        temperature=0.2,
        max_retries=2,
    )

    parsed = _parse_generated_text(result["text"])

    insert_prompt_audit(
        db=db,
        generation_run_id=generation_run_id,
        tenant_id=tenant_id,
        location_id=location_id,
        as_of_date=as_of_date,
        prompt_type="daily_control_tower",
        prompt_template_version=DEFAULT_PROMPT_TEMPLATE_VERSION,
        input_context_json=context,
        prompt_text=prompt_text,
        llm_provider=result["provider"],
        llm_model_name=result["model_name"],
        llm_model_version=result.get("model_version"),
        raw_response_text=result["text"],
        parsed_response_json=parsed,
        token_input_count=result.get("token_input_count"),
        token_output_count=result.get("token_output_count"),
        latency_ms=result.get("latency_ms"),
        response_status="succeeded",
        error_message=None,
    )

    location_insight_id = upsert_location_insight_daily(
        db=db,
        as_of_date=as_of_date,
        tenant_id=tenant_id,
        location_id=location_id,
        insight_type=insight_type,
        audience_type=audience_type,
        headline=parsed["headline"],
        summary_text=parsed["summary_text"],
        recommendation_text=parsed["recommendation_text"],
        risk_summary_json=context.get("existing_brief", {}).get("risk_summary_json"),
        recommended_actions_json=context.get("existing_brief", {}).get("recommended_actions_json"),
        supporting_facts_json={
            "metrics": context.get("metrics"),
            "top_risk": context.get("top_risk"),
            "top_action": context.get("top_action"),
            "opportunity": context.get("opportunity"),
            "forecast": context.get("forecast"),
        },
        explanation_json={
            "source": "llm_enriched_control_tower",
            "request_type": "daily_control_tower",
        },
        top_risk_type=context.get("top_risk", {}).get("risk_type"),
        top_action_code=context.get("top_action", {}).get("action_code"),
        opportunity_type=context.get("opportunity", {}).get("opportunity_type"),
        confidence_score=context.get("top_action", {}).get("confidence_score"),
        priority_rank=context.get("top_action", {}).get("priority_rank"),
        source_hash=source_hash,
        source_snapshot_json=context,
        generation_run_id=generation_run_id,
        prompt_template_version=DEFAULT_PROMPT_TEMPLATE_VERSION,
        llm_provider=result["provider"],
        llm_model_name=result["model_name"],
        llm_model_version=result.get("model_version"),
        generation_mode="persisted",
        generation_status="active",
    )

    return {
        "tenant_id": str(tenant_id),
        "location_id": location_id,
        "as_of_date": str(as_of_date),
        "status": "generated",
        "location_insight_id": location_insight_id,
    }


def generate_daily_insights(
    db: Session,
    *,
    as_of_date: date,
    tenant_id: Optional[UUID] = None,
    force_regenerate: bool = False,
) -> dict[str, Any]:
    generation_run_id = create_generation_run(
        db=db,
        run_type="daily_batch",
        run_scope="tenant" if tenant_id else "global",
        tenant_id=tenant_id,
        location_id=None,
        as_of_date=as_of_date,
        trigger_source="api",
        upstream_snapshot_name="ml.mv_valora_control_tower",
        prompt_template_version=DEFAULT_PROMPT_TEMPLATE_VERSION,
        llm_provider=DEFAULT_LLM_PROVIDER,
        llm_model_name=DEFAULT_LLM_MODEL_NAME,
        llm_model_version=None,
        metadata_json={"force_regenerate": force_regenerate},
    )

    generated_count = 0
    failed_count = 0
    items: list[dict[str, Any]] = []

    try:
        rows = _fetch_control_tower_scope(
            db=db,
            as_of_date=as_of_date,
            tenant_id=tenant_id,
        )

        for row in rows:
            try:
                item_result = _generate_for_one_location(
                    db=db,
                    generation_run_id=generation_run_id,
                    tenant_id=UUID(str(row["tenant_id"])),
                    location_id=int(row["location_id"]),
                    as_of_date=as_of_date,
                    force_regenerate=force_regenerate,
                    audience_type="operator",
                    insight_type="control_tower",
                )
                items.append(item_result)
                if item_result["status"] == "generated":
                    generated_count += 1
            except Exception as location_error:
                failed_count += 1
                items.append(
                    {
                        "tenant_id": str(row["tenant_id"]),
                        "location_id": int(row["location_id"]),
                        "as_of_date": str(as_of_date),
                        "status": "failed",
                        "error": str(location_error),
                    }
                )

        final_status = "succeeded" if failed_count == 0 else ("partial" if generated_count > 0 else "failed")

        finalize_generation_run(
            db=db,
            generation_run_id=generation_run_id,
            status=final_status,
            generated_count=generated_count,
            failed_count=failed_count,
            error_message=None if final_status != "failed" else "All location generations failed",
        )

        return {
            "generation_run_id": generation_run_id,
            "status": final_status,
            "generated_count": generated_count,
            "failed_count": failed_count,
            "items": items,
        }

    except Exception as e:
        finalize_generation_run(
            db=db,
            generation_run_id=generation_run_id,
            status="failed",
            generated_count=generated_count,
            failed_count=failed_count + 1,
            error_message=str(e),
        )
        raise


def generate_tenant_insights(
    db: Session,
    *,
    tenant_id: UUID,
    as_of_date: date,
    force_regenerate: bool = False,
) -> dict[str, Any]:
    return generate_daily_insights(
        db=db,
        as_of_date=as_of_date,
        tenant_id=tenant_id,
        force_regenerate=force_regenerate,
    )


def generate_location_insight(
    db: Session,
    *,
    tenant_id: UUID,
    location_id: int,
    as_of_date: date,
    force_regenerate: bool = True,
) -> dict[str, Any]:
    generation_run_id = create_generation_run(
        db=db,
        run_type="location_regen",
        run_scope="location",
        tenant_id=tenant_id,
        location_id=location_id,
        as_of_date=as_of_date,
        trigger_source="api",
        upstream_snapshot_name="ml.mv_valora_control_tower",
        prompt_template_version=DEFAULT_PROMPT_TEMPLATE_VERSION,
        llm_provider=DEFAULT_LLM_PROVIDER,
        llm_model_name=DEFAULT_LLM_MODEL_NAME,
        llm_model_version=None,
        metadata_json={"force_regenerate": force_regenerate},
    )

    try:
        item_result = _generate_for_one_location(
            db=db,
            generation_run_id=generation_run_id,
            tenant_id=tenant_id,
            location_id=location_id,
            as_of_date=as_of_date,
            force_regenerate=force_regenerate,
            audience_type="operator",
            insight_type="control_tower",
        )

        final_status = "succeeded" if item_result["status"] in {"generated", "skipped_unchanged"} else "failed"

        finalize_generation_run(
            db=db,
            generation_run_id=generation_run_id,
            status=final_status,
            generated_count=1 if item_result["status"] == "generated" else 0,
            failed_count=0 if final_status == "succeeded" else 1,
            error_message=None,
        )

        return {
            "generation_run_id": generation_run_id,
            "status": final_status,
            "item": item_result,
        }

    except Exception as e:
        finalize_generation_run(
            db=db,
            generation_run_id=generation_run_id,
            status="failed",
            generated_count=0,
            failed_count=1,
            error_message=str(e),
        )
        raise