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

def create_action_execution(
    db: Session,
    *,
    tenant_id: UUID,
    location_id: int,
    as_of_date: Optional[date] = None,
    location_insight_id: Optional[int] = None,
    generation_run_id: Optional[int] = None,
    action_code: str,
    action_title: str,
    action_description: Optional[str] = None,
    source_type: str = "ai_recommendation",
    source_risk_type: Optional[str] = None,
    source_opportunity_type: Optional[str] = None,
    status: str = "open",
    priority: str = "medium",
    assigned_user_id: Optional[UUID] = None,
    assigned_to_name: Optional[str] = None,
    expected_roi: Optional[float] = None,
    expected_profit_uplift: Optional[float] = None,
    expected_impact_json: Optional[dict[str, Any] | list[Any]] = None,
    due_date: Optional[date] = None,
    execution_notes: Optional[str] = None,
    created_by_user_id: Optional[UUID] = None,
    updated_by_user_id: Optional[UUID] = None,
    metadata_json: Optional[dict[str, Any] | list[Any]] = None,
) -> int:
    sql = text("""
        INSERT INTO ai.action_execution (
            tenant_id,
            location_id,
            as_of_date,
            location_insight_id,
            generation_run_id,
            action_code,
            action_title,
            action_description,
            source_type,
            source_risk_type,
            source_opportunity_type,
            status,
            priority,
            assigned_user_id,
            assigned_to_name,
            expected_roi,
            expected_profit_uplift,
            expected_impact_json,
            due_date,
            execution_notes,
            created_by_user_id,
            updated_by_user_id,
            metadata_json
        )
        VALUES (
            :tenant_id,
            :location_id,
            :as_of_date,
            :location_insight_id,
            :generation_run_id,
            :action_code,
            :action_title,
            :action_description,
            :source_type,
            :source_risk_type,
            :source_opportunity_type,
            :status,
            :priority,
            :assigned_user_id,
            :assigned_to_name,
            :expected_roi,
            :expected_profit_uplift,
            CAST(:expected_impact_json AS JSONB),
            :due_date,
            :execution_notes,
            :created_by_user_id,
            :updated_by_user_id,
            CAST(:metadata_json AS JSONB)
        )
        RETURNING action_execution_id
    """)

    action_execution_id = db.execute(
        sql,
        {
            "tenant_id": str(tenant_id),
            "location_id": location_id,
            "as_of_date": as_of_date,
            "location_insight_id": location_insight_id,
            "generation_run_id": generation_run_id,
            "action_code": action_code,
            "action_title": action_title,
            "action_description": action_description,
            "source_type": source_type,
            "source_risk_type": source_risk_type,
            "source_opportunity_type": source_opportunity_type,
            "status": status,
            "priority": priority,
            "assigned_user_id": str(assigned_user_id) if assigned_user_id else None,
            "assigned_to_name": assigned_to_name,
            "expected_roi": expected_roi,
            "expected_profit_uplift": expected_profit_uplift,
            "expected_impact_json": _to_jsonb(expected_impact_json),
            "due_date": due_date,
            "execution_notes": execution_notes,
            "created_by_user_id": str(created_by_user_id) if created_by_user_id else None,
            "updated_by_user_id": str(updated_by_user_id) if updated_by_user_id else None,
            "metadata_json": _to_jsonb(metadata_json),
        },
    ).scalar()

    db.commit()
    return int(action_execution_id)


def insert_action_status_history(
    db: Session,
    *,
    action_execution_id: int,
    old_status: Optional[str],
    new_status: str,
    changed_by_user_id: Optional[UUID] = None,
    changed_by_name: Optional[str] = None,
    change_reason: Optional[str] = None,
    notes: Optional[str] = None,
) -> int:
    sql = text("""
        INSERT INTO ai.action_status_history (
            action_execution_id,
            old_status,
            new_status,
            changed_by_user_id,
            changed_by_name,
            change_reason,
            notes
        )
        VALUES (
            :action_execution_id,
            :old_status,
            :new_status,
            :changed_by_user_id,
            :changed_by_name,
            :change_reason,
            :notes
        )
        RETURNING action_status_history_id
    """)

    action_status_history_id = db.execute(
        sql,
        {
            "action_execution_id": action_execution_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by_user_id": str(changed_by_user_id) if changed_by_user_id else None,
            "changed_by_name": changed_by_name,
            "change_reason": change_reason,
            "notes": notes,
        },
    ).scalar()

    db.commit()
    return int(action_status_history_id)


def get_action_by_id(
    db: Session,
    *,
    action_execution_id: int,
) -> dict[str, Any] | None:
    sql = text("""
        SELECT
            action_execution_id,
            tenant_id,
            location_id,
            as_of_date,
            location_insight_id,
            generation_run_id,
            action_code,
            action_title,
            action_description,
            source_type,
            source_risk_type,
            source_opportunity_type,
            status,
            priority,
            assigned_user_id,
            assigned_to_name,
            expected_roi,
            expected_profit_uplift,
            expected_impact_json,
            due_date,
            started_at,
            completed_at,
            execution_notes,
            outcome_summary,
            actual_impact_json,
            actual_roi,
            effectiveness_score,
            created_by_user_id,
            updated_by_user_id,
            metadata_json,
            created_at,
            updated_at
        FROM ai.action_execution
        WHERE action_execution_id = :action_execution_id
        LIMIT 1
    """)

    row = db.execute(
        sql,
        {"action_execution_id": action_execution_id},
    ).mappings().first()

    return dict(row) if row else None


def list_actions(
    db: Session,
    *,
    tenant_id: UUID,
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    as_of_date: Optional[date] = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    sql = """
        SELECT
            action_execution_id,
            tenant_id,
            location_id,
            as_of_date,
            location_insight_id,
            generation_run_id,
            action_code,
            action_title,
            action_description,
            source_type,
            source_risk_type,
            source_opportunity_type,
            status,
            priority,
            assigned_user_id,
            assigned_to_name,
            expected_roi,
            expected_profit_uplift,
            expected_impact_json,
            due_date,
            started_at,
            completed_at,
            execution_notes,
            outcome_summary,
            actual_impact_json,
            actual_roi,
            effectiveness_score,
            created_by_user_id,
            updated_by_user_id,
            metadata_json,
            created_at,
            updated_at
        FROM ai.action_execution
        WHERE tenant_id = :tenant_id
    """

    params: dict[str, Any] = {
        "tenant_id": str(tenant_id),
        "limit": limit,
    }

    if location_id is not None:
        sql += " AND location_id = :location_id"
        params["location_id"] = location_id

    if status is not None:
        sql += " AND status = :status"
        params["status"] = status

    if as_of_date is not None:
        sql += " AND as_of_date = :as_of_date"
        params["as_of_date"] = as_of_date

    sql += " ORDER BY created_at DESC LIMIT :limit"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]


def get_action_status_history(
    db: Session,
    *,
    action_execution_id: int,
) -> list[dict[str, Any]]:
    sql = text("""
        SELECT
            action_status_history_id,
            action_execution_id,
            old_status,
            new_status,
            changed_by_user_id,
            changed_by_name,
            change_reason,
            notes,
            created_at
        FROM ai.action_status_history
        WHERE action_execution_id = :action_execution_id
        ORDER BY created_at DESC
    """)

    rows = db.execute(
        sql,
        {"action_execution_id": action_execution_id},
    ).mappings().all()

    return [dict(r) for r in rows]


def update_action_status(
    db: Session,
    *,
    action_execution_id: int,
    new_status: str,
    changed_by_user_id: Optional[UUID] = None,
    changed_by_name: Optional[str] = None,
    change_reason: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    current = get_action_by_id(db, action_execution_id=action_execution_id)
    if not current:
         raise ValueError("Action not found")

    old_status = current.get("status")

    started_at_sql = "started_at"
    completed_at_sql = "completed_at"

    if new_status == "in_progress" and not current.get("started_at"):
        started_at_sql = "COALESCE(started_at, now())"

    if new_status == "completed":
        completed_at_sql = "COALESCE(completed_at, now())"

    sql = text(f"""
        UPDATE ai.action_execution
        SET
            status = :new_status,
            updated_by_user_id = :changed_by_user_id,
            updated_at = now(),
            started_at = {started_at_sql},
            completed_at = {completed_at_sql}
        WHERE action_execution_id = :action_execution_id
    """)

    db.execute(
        sql,
        {
            "action_execution_id": action_execution_id,
            "new_status": new_status,
            "changed_by_user_id": str(changed_by_user_id) if changed_by_user_id else None,
        },
    )
    db.commit()

    insert_action_status_history(
        db=db,
        action_execution_id=action_execution_id,
        old_status=old_status,
        new_status=new_status,
        changed_by_user_id=changed_by_user_id,
        changed_by_name=changed_by_name,
        change_reason=change_reason,
        notes=notes,
    )

    updated = get_action_by_id(db, action_execution_id=action_execution_id)
    if not updated:
        raise ValueError("Failed to reload updated action")

    return updated


def complete_action_execution(
    db: Session,
    *,
    action_execution_id: int,
    changed_by_user_id: Optional[UUID] = None,
    changed_by_name: Optional[str] = None,
    change_reason: Optional[str] = None,
    notes: Optional[str] = None,
    outcome_summary: Optional[str] = None,
    actual_impact_json: Optional[dict[str, Any] | list[Any]] = None,
    actual_roi: Optional[float] = None,
    effectiveness_score: Optional[float] = None,
) -> dict[str, Any]:
    current = get_action_by_id(db, action_execution_id=action_execution_id)
    if not current:
      raise ValueError("Action not found")

    sql = text("""
        UPDATE ai.action_execution
        SET
            status = 'completed',
            completed_at = COALESCE(completed_at, now()),
            updated_by_user_id = :changed_by_user_id,
            updated_at = now(),
            outcome_summary = :outcome_summary,
            actual_impact_json = CAST(:actual_impact_json AS JSONB),
            actual_roi = :actual_roi,
            effectiveness_score = :effectiveness_score
        WHERE action_execution_id = :action_execution_id
    """)

    db.execute(
        sql,
        {
            "action_execution_id": action_execution_id,
            "changed_by_user_id": str(changed_by_user_id) if changed_by_user_id else None,
            "outcome_summary": outcome_summary,
            "actual_impact_json": _to_jsonb(actual_impact_json),
            "actual_roi": actual_roi,
            "effectiveness_score": effectiveness_score,
        },
    )
    db.commit()

    insert_action_status_history(
        db=db,
        action_execution_id=action_execution_id,
        old_status=current.get("status"),
        new_status="completed",
        changed_by_user_id=changed_by_user_id,
        changed_by_name=changed_by_name,
        change_reason=change_reason,
        notes=notes,
    )

    updated = get_action_by_id(db, action_execution_id=action_execution_id)
    if not updated:
        raise ValueError("Failed to reload completed action")

    return updated