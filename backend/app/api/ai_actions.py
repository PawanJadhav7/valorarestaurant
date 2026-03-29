from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from ValoraEngine.action_persistence import (
    complete_action_execution,
    create_action_execution,
    get_action_by_id,
    get_action_status_history,
    list_actions,
    update_action_status,
)

router = APIRouter(prefix="/api/ai/actions", tags=["AI Actions"])


class CreateActionRequest(BaseModel):
    tenant_id: UUID
    location_id: int = Field(..., gt=0)
    as_of_date: Optional[date] = None

    location_insight_id: Optional[int] = None
    generation_run_id: Optional[int] = None

    action_code: str
    action_title: str
    action_description: Optional[str] = None

    source_type: str = "ai_recommendation"
    source_risk_type: Optional[str] = None
    source_opportunity_type: Optional[str] = None

    status: str = "open"
    priority: str = "medium"

    assigned_user_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None

    expected_roi: Optional[float] = None
    expected_profit_uplift: Optional[float] = None
    expected_impact_json: Optional[dict] = None

    due_date: Optional[date] = None
    execution_notes: Optional[str] = None

    created_by_user_id: Optional[UUID] = None
    updated_by_user_id: Optional[UUID] = None

    metadata_json: Optional[dict] = None


class CreateActionFromInsightRequest(BaseModel):
    tenant_id: UUID
    location_id: int = Field(..., gt=0)
    location_insight_id: int = Field(..., gt=0)

    as_of_date: Optional[date] = None
    generation_run_id: Optional[int] = None

    action_code: str
    action_title: str
    action_description: Optional[str] = None

    source_risk_type: Optional[str] = None
    source_opportunity_type: Optional[str] = None

    priority: str = "medium"
    assigned_user_id: Optional[UUID] = None
    assigned_to_name: Optional[str] = None

    expected_roi: Optional[float] = None
    expected_profit_uplift: Optional[float] = None
    expected_impact_json: Optional[dict] = None

    due_date: Optional[date] = None
    execution_notes: Optional[str] = None

    created_by_user_id: Optional[UUID] = None
    updated_by_user_id: Optional[UUID] = None

    metadata_json: Optional[dict] = None


class ActionStatusUpdateRequest(BaseModel):
    changed_by_user_id: Optional[UUID] = None
    changed_by_name: Optional[str] = None
    change_reason: Optional[str] = None
    notes: Optional[str] = None


class CompleteActionRequest(BaseModel):
    changed_by_user_id: Optional[UUID] = None
    changed_by_name: Optional[str] = None
    change_reason: Optional[str] = None
    notes: Optional[str] = None

    outcome_summary: Optional[str] = None
    actual_impact_json: Optional[dict] = None
    actual_roi: Optional[float] = None
    effectiveness_score: Optional[float] = None


@router.post("")
def create_action(
    payload: CreateActionRequest,
    db: Session = Depends(get_db),
):
    try:
        action_execution_id = create_action_execution(
            db=db,
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            location_insight_id=payload.location_insight_id,
            generation_run_id=payload.generation_run_id,
            action_code=payload.action_code,
            action_title=payload.action_title,
            action_description=payload.action_description,
            source_type=payload.source_type,
            source_risk_type=payload.source_risk_type,
            source_opportunity_type=payload.source_opportunity_type,
            status=payload.status,
            priority=payload.priority,
            assigned_user_id=payload.assigned_user_id,
            assigned_to_name=payload.assigned_to_name,
            expected_roi=payload.expected_roi,
            expected_profit_uplift=payload.expected_profit_uplift,
            expected_impact_json=payload.expected_impact_json,
            due_date=payload.due_date,
            execution_notes=payload.execution_notes,
            created_by_user_id=payload.created_by_user_id,
            updated_by_user_id=payload.updated_by_user_id,
            metadata_json=payload.metadata_json,
        )

        action = get_action_by_id(db, action_execution_id=action_execution_id)

        return {
            "ok": True,
            "action_execution_id": action_execution_id,
            "item": action,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create action: {str(e)}")


@router.post("/create-from-insight")
def create_action_from_insight(
    payload: CreateActionFromInsightRequest,
    db: Session = Depends(get_db),
):
    try:
        action_execution_id = create_action_execution(
            db=db,
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            location_insight_id=payload.location_insight_id,
            generation_run_id=payload.generation_run_id,
            action_code=payload.action_code,
            action_title=payload.action_title,
            action_description=payload.action_description,
            source_type="ai_recommendation",
            source_risk_type=payload.source_risk_type,
            source_opportunity_type=payload.source_opportunity_type,
            status="open",
            priority=payload.priority,
            assigned_user_id=payload.assigned_user_id,
            assigned_to_name=payload.assigned_to_name,
            expected_roi=payload.expected_roi,
            expected_profit_uplift=payload.expected_profit_uplift,
            expected_impact_json=payload.expected_impact_json,
            due_date=payload.due_date,
            execution_notes=payload.execution_notes,
            created_by_user_id=payload.created_by_user_id,
            updated_by_user_id=payload.updated_by_user_id,
            metadata_json=payload.metadata_json,
        )

        action = get_action_by_id(db, action_execution_id=action_execution_id)

        return {
            "ok": True,
            "action_execution_id": action_execution_id,
            "item": action,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create action from insight: {str(e)}",
        )


@router.get("")
def get_actions(
    tenant_id: UUID,
    location_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    as_of_date: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    try:
        items = list_actions(
            db=db,
            tenant_id=tenant_id,
            location_id=location_id,
            status=status,
            as_of_date=as_of_date,
            limit=limit,
        )

        return {
            "tenant_id": str(tenant_id),
            "location_id": location_id,
            "status": status,
            "as_of_date": str(as_of_date) if as_of_date else None,
            "items": items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list actions: {str(e)}")


@router.get("/{action_execution_id}")
def get_action_detail(
    action_execution_id: int,
    db: Session = Depends(get_db),
):
    try:
        action = get_action_by_id(db, action_execution_id=action_execution_id)
        if not action:
            raise HTTPException(status_code=404, detail="Action not found")

        history = get_action_status_history(
            db,
            action_execution_id=action_execution_id,
        )

        return {
            "item": action,
            "history": history,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load action: {str(e)}")


@router.post("/{action_execution_id}/acknowledge")
def acknowledge_action(
    action_execution_id: int,
    payload: ActionStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    try:
        item = update_action_status(
            db=db,
            action_execution_id=action_execution_id,
            new_status="acknowledged",
            changed_by_user_id=payload.changed_by_user_id,
            changed_by_name=payload.changed_by_name,
            change_reason=payload.change_reason,
            notes=payload.notes,
        )

        return {"ok": True, "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge action: {str(e)}")


@router.post("/{action_execution_id}/start")
def start_action(
    action_execution_id: int,
    payload: ActionStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    try:
        item = update_action_status(
            db=db,
            action_execution_id=action_execution_id,
            new_status="in_progress",
            changed_by_user_id=payload.changed_by_user_id,
            changed_by_name=payload.changed_by_name,
            change_reason=payload.change_reason,
            notes=payload.notes,
        )

        return {"ok": True, "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start action: {str(e)}")


@router.post("/{action_execution_id}/block")
def block_action(
    action_execution_id: int,
    payload: ActionStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    try:
        item = update_action_status(
            db=db,
            action_execution_id=action_execution_id,
            new_status="blocked",
            changed_by_user_id=payload.changed_by_user_id,
            changed_by_name=payload.changed_by_name,
            change_reason=payload.change_reason,
            notes=payload.notes,
        )

        return {"ok": True, "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to block action: {str(e)}")


@router.post("/{action_execution_id}/dismiss")
def dismiss_action(
    action_execution_id: int,
    payload: ActionStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    try:
        item = update_action_status(
            db=db,
            action_execution_id=action_execution_id,
            new_status="dismissed",
            changed_by_user_id=payload.changed_by_user_id,
            changed_by_name=payload.changed_by_name,
            change_reason=payload.change_reason,
            notes=payload.notes,
        )

        return {"ok": True, "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dismiss action: {str(e)}")


@router.post("/{action_execution_id}/complete")
def complete_action(
    action_execution_id: int,
    payload: CompleteActionRequest,
    db: Session = Depends(get_db),
):
    try:
        item = complete_action_execution(
            db=db,
            action_execution_id=action_execution_id,
            changed_by_user_id=payload.changed_by_user_id,
            changed_by_name=payload.changed_by_name,
            change_reason=payload.change_reason,
            notes=payload.notes,
            outcome_summary=payload.outcome_summary,
            actual_impact_json=payload.actual_impact_json,
            actual_roi=payload.actual_roi,
            effectiveness_score=payload.effectiveness_score,
        )

        return {"ok": True, "item": item}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete action: {str(e)}")