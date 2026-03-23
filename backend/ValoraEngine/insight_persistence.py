from __future__ import annotations

import json
from datetime import date
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


def _to_jsonb(value: Any) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, default=str)


def create_generation_run(
    db: Session,
    run_type: str,
    run_scope: str,
    trigger_source: str,
    tenant_id: Optional[UUID] = None,
    location_id: Optional[int] = None,
    as_of_date: Optional[date] = None,
    upstream_snapshot_name: Optional[str] = None,
    upstream_snapshot_ts: Optional[str] = None,
    prompt_template_version: Optional[str] = None,
    llm_provider: Optional[str] = None,
    llm_model_name: Optional[str] = None,
    llm_model_version: Optional[str] = None,
    metadata_json: Optional[dict[str, Any]] = None,
) -> int:
    sql = text("""
        INSERT INTO ai.generation_run (
            run_type,
            run_scope,
            tenant_id,
            location_id,
            as_of_date,
            trigger_source,
            upstream_snapshot_name,
            upstream_snapshot_ts,
            prompt_template_version,
            llm_provider,
            llm_model_name,
            llm_model_version,
            status,
            metadata_json
        )
        VALUES (
            :run_type,
            :run_scope,
            :tenant_id,
            :location_id,
            :as_of_date,
            :trigger_source,
            :upstream_snapshot_name,
            :upstream_snapshot_ts,
            :prompt_template_version,
            :llm_provider,
            :llm_model_name,
            :llm_model_version,
            'running',
            CAST(:metadata_json AS JSONB)
        )
        RETURNING generation_run_id
    """)

    generation_run_id = db.execute(
        sql,
        {
            "run_type": run_type,
            "run_scope": run_scope,
            "tenant_id": str(tenant_id) if tenant_id else None,
            "location_id": location_id,
            "as_of_date": as_of_date,
            "trigger_source": trigger_source,
            "upstream_snapshot_name": upstream_snapshot_name,
            "upstream_snapshot_ts": upstream_snapshot_ts,
            "prompt_template_version": prompt_template_version,
            "llm_provider": llm_provider,
            "llm_model_name": llm_model_name,
            "llm_model_version": llm_model_version,
            "metadata_json": _to_jsonb(metadata_json),
        },
    ).scalar()

    db.commit()
    return int(generation_run_id)


def finalize_generation_run(
    db: Session,
    generation_run_id: int,
    status: str,
    generated_count: int = 0,
    failed_count: int = 0,
    error_message: Optional[str] = None,
) -> None:
    sql = text("""
        UPDATE ai.generation_run
        SET
            status = :status,
            completed_at = now(),
            generated_count = :generated_count,
            failed_count = :failed_count,
            error_message = :error_message
        WHERE generation_run_id = :generation_run_id
    """)

    db.execute(
        sql,
        {
            "generation_run_id": generation_run_id,
            "status": status,
            "generated_count": generated_count,
            "failed_count": failed_count,
            "error_message": error_message,
        },
    )
    db.commit()


def upsert_location_insight_daily(
    db: Session,
    *,
    as_of_date: date,
    tenant_id: UUID,
    location_id: int,
    insight_type: str,
    audience_type: str,
    headline: str,
    summary_text: str,
    recommendation_text: Optional[str] = None,
    risk_summary_json: Optional[dict[str, Any] | list[Any]] = None,
    recommended_actions_json: Optional[dict[str, Any] | list[Any]] = None,
    supporting_facts_json: Optional[dict[str, Any] | list[Any]] = None,
    explanation_json: Optional[dict[str, Any] | list[Any]] = None,
    top_risk_type: Optional[str] = None,
    top_action_code: Optional[str] = None,
    opportunity_type: Optional[str] = None,
    confidence_score: Optional[float] = None,
    priority_rank: Optional[int] = None,
    source_hash: Optional[str] = None,
    source_snapshot_json: Optional[dict[str, Any] | list[Any]] = None,
    generation_run_id: Optional[int] = None,
    prompt_template_version: Optional[str] = None,
    llm_provider: Optional[str] = None,
    llm_model_name: Optional[str] = None,
    llm_model_version: Optional[str] = None,
    generation_mode: str = "persisted",
    generation_status: str = "active",
) -> int:
    sql = text("""
        INSERT INTO ai.location_insight_daily (
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
            generation_status
        )
        VALUES (
            :as_of_date,
            :tenant_id,
            :location_id,
            :insight_type,
            :audience_type,
            :headline,
            :summary_text,
            :recommendation_text,
            CAST(:risk_summary_json AS JSONB),
            CAST(:recommended_actions_json AS JSONB),
            CAST(:supporting_facts_json AS JSONB),
            CAST(:explanation_json AS JSONB),
            :top_risk_type,
            :top_action_code,
            :opportunity_type,
            :confidence_score,
            :priority_rank,
            :source_hash,
            CAST(:source_snapshot_json AS JSONB),
            :generation_run_id,
            :prompt_template_version,
            :llm_provider,
            :llm_model_name,
            :llm_model_version,
            :generation_mode,
            :generation_status
        )
        ON CONFLICT (as_of_date, tenant_id, location_id, insight_type, audience_type)
        DO UPDATE SET
            headline = EXCLUDED.headline,
            summary_text = EXCLUDED.summary_text,
            recommendation_text = EXCLUDED.recommendation_text,
            risk_summary_json = EXCLUDED.risk_summary_json,
            recommended_actions_json = EXCLUDED.recommended_actions_json,
            supporting_facts_json = EXCLUDED.supporting_facts_json,
            explanation_json = EXCLUDED.explanation_json,
            top_risk_type = EXCLUDED.top_risk_type,
            top_action_code = EXCLUDED.top_action_code,
            opportunity_type = EXCLUDED.opportunity_type,
            confidence_score = EXCLUDED.confidence_score,
            priority_rank = EXCLUDED.priority_rank,
            source_hash = EXCLUDED.source_hash,
            source_snapshot_json = EXCLUDED.source_snapshot_json,
            generation_run_id = EXCLUDED.generation_run_id,
            prompt_template_version = EXCLUDED.prompt_template_version,
            llm_provider = EXCLUDED.llm_provider,
            llm_model_name = EXCLUDED.llm_model_name,
            llm_model_version = EXCLUDED.llm_model_version,
            generation_mode = EXCLUDED.generation_mode,
            generation_status = EXCLUDED.generation_status,
            generated_at = now(),
            updated_at = now()
        RETURNING location_insight_id
    """)

    location_insight_id = db.execute(
        sql,
        {
            "as_of_date": as_of_date,
            "tenant_id": str(tenant_id),
            "location_id": location_id,
            "insight_type": insight_type,
            "audience_type": audience_type,
            "headline": headline,
            "summary_text": summary_text,
            "recommendation_text": recommendation_text,
            "risk_summary_json": _to_jsonb(risk_summary_json),
            "recommended_actions_json": _to_jsonb(recommended_actions_json),
            "supporting_facts_json": _to_jsonb(supporting_facts_json),
            "explanation_json": _to_jsonb(explanation_json),
            "top_risk_type": top_risk_type,
            "top_action_code": top_action_code,
            "opportunity_type": opportunity_type,
            "confidence_score": confidence_score,
            "priority_rank": priority_rank,
            "source_hash": source_hash,
            "source_snapshot_json": _to_jsonb(source_snapshot_json),
            "generation_run_id": generation_run_id,
            "prompt_template_version": prompt_template_version,
            "llm_provider": llm_provider,
            "llm_model_name": llm_model_name,
            "llm_model_version": llm_model_version,
            "generation_mode": generation_mode,
            "generation_status": generation_status,
        },
    ).scalar()

    db.commit()
    return int(location_insight_id)


def insert_prompt_audit(
    db: Session,
    *,
    generation_run_id: Optional[int],
    tenant_id: Optional[UUID],
    location_id: Optional[int],
    as_of_date: Optional[date],
    prompt_type: str,
    prompt_template_version: str,
    input_context_json: dict[str, Any],
    prompt_text: str,
    llm_provider: str,
    llm_model_name: str,
    llm_model_version: Optional[str] = None,
    raw_response_text: Optional[str] = None,
    parsed_response_json: Optional[dict[str, Any] | list[Any]] = None,
    token_input_count: Optional[int] = None,
    token_output_count: Optional[int] = None,
    latency_ms: Optional[int] = None,
    response_status: str = "succeeded",
    error_message: Optional[str] = None,
) -> int:
    sql = text("""
        INSERT INTO ai.prompt_audit (
            generation_run_id,
            tenant_id,
            location_id,
            as_of_date,
            prompt_type,
            prompt_template_version,
            input_context_json,
            prompt_text,
            llm_provider,
            llm_model_name,
            llm_model_version,
            raw_response_text,
            parsed_response_json,
            token_input_count,
            token_output_count,
            latency_ms,
            response_status,
            error_message
        )
        VALUES (
            :generation_run_id,
            :tenant_id,
            :location_id,
            :as_of_date,
            :prompt_type,
            :prompt_template_version,
            CAST(:input_context_json AS JSONB),
            :prompt_text,
            :llm_provider,
            :llm_model_name,
            :llm_model_version,
            :raw_response_text,
            CAST(:parsed_response_json AS JSONB),
            :token_input_count,
            :token_output_count,
            :latency_ms,
            :response_status,
            :error_message
        )
        RETURNING prompt_audit_id
    """)

    prompt_audit_id = db.execute(
        sql,
        {
            "generation_run_id": generation_run_id,
            "tenant_id": str(tenant_id) if tenant_id else None,
            "location_id": location_id,
            "as_of_date": as_of_date,
            "prompt_type": prompt_type,
            "prompt_template_version": prompt_template_version,
            "input_context_json": _to_jsonb(input_context_json),
            "prompt_text": prompt_text,
            "llm_provider": llm_provider,
            "llm_model_name": llm_model_name,
            "llm_model_version": llm_model_version,
            "raw_response_text": raw_response_text,
            "parsed_response_json": _to_jsonb(parsed_response_json),
            "token_input_count": token_input_count,
            "token_output_count": token_output_count,
            "latency_ms": latency_ms,
            "response_status": response_status,
            "error_message": error_message,
        },
    ).scalar()

    db.commit()
    return int(prompt_audit_id)


def log_chat_explanation(
    db: Session,
    *,
    tenant_id: UUID,
    user_id: Optional[UUID],
    location_id: Optional[int],
    as_of_date: Optional[date],
    request_type: str,
    user_message: str,
    resolved_context_json: Optional[dict[str, Any]],
    response_text: Optional[str],
    llm_provider: Optional[str],
    llm_model_name: Optional[str],
    llm_model_version: Optional[str],
    latency_ms: Optional[int],
    status: str,
    error_message: Optional[str],
) -> int:
    sql = text("""
        INSERT INTO ai.chat_explanation_log (
            tenant_id,
            user_id,
            location_id,
            as_of_date,
            request_type,
            user_message,
            resolved_context_json,
            response_text,
            llm_provider,
            llm_model_name,
            llm_model_version,
            latency_ms,
            status,
            error_message
        )
        VALUES (
            :tenant_id,
            :user_id,
            :location_id,
            :as_of_date,
            :request_type,
            :user_message,
            CAST(:resolved_context_json AS JSONB),
            :response_text,
            :llm_provider,
            :llm_model_name,
            :llm_model_version,
            :latency_ms,
            :status,
            :error_message
        )
        RETURNING chat_log_id
    """)

    chat_log_id = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "user_id": str(user_id) if user_id else None,
            "location_id": location_id,
            "as_of_date": as_of_date,
            "request_type": request_type,
            "user_message": user_message,
            "resolved_context_json": _to_jsonb(resolved_context_json),
            "response_text": response_text,
            "llm_provider": llm_provider,
            "llm_model_name": llm_model_name,
            "llm_model_version": llm_model_version,
            "latency_ms": latency_ms,
            "status": status,
            "error_message": error_message,
        },
    ).scalar()

    db.commit()
    return int(chat_log_id)


def insert_insight_feedback(
    db: Session,
    *,
    location_insight_id: int,
    tenant_id: UUID,
    user_id: Optional[UUID],
    feedback_type: str,
    feedback_score: Optional[int] = None,
    feedback_note: Optional[str] = None,
) -> int:
    sql = text("""
        INSERT INTO ai.insight_feedback (
            location_insight_id,
            tenant_id,
            user_id,
            feedback_type,
            feedback_score,
            feedback_note
        )
        VALUES (
            :location_insight_id,
            :tenant_id,
            :user_id,
            :feedback_type,
            :feedback_score,
            :feedback_note
        )
        RETURNING insight_feedback_id
    """)

    insight_feedback_id = db.execute(
        sql,
        {
            "location_insight_id": location_insight_id,
            "tenant_id": str(tenant_id),
            "user_id": str(user_id) if user_id else None,
            "feedback_type": feedback_type,
            "feedback_score": feedback_score,
            "feedback_note": feedback_note,
        },
    ).scalar()

    db.commit()
    return int(insight_feedback_id)