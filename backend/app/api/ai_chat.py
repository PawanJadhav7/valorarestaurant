from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from ValoraEngine.context_assembler import build_chat_context
from ValoraEngine.llm_provider import generate_llm_text
from ValoraEngine.insight_persistence import log_chat_explanation

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])


class ExplainRequest(BaseModel):
    tenant_id: UUID
    user_id: Optional[UUID] = None
    location_id: Optional[int] = Field(default=None, gt=0)
    as_of_date: Optional[date] = None
    request_type: str
    user_message: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "tenant_id": "00000000-0000-0000-0000-000000000000",
                    "location_id": 101,
                    "as_of_date": "2026-03-08",
                    "request_type": "explain_alert",
                    "user_message": "Explain why this location has stockout risk."
                }
            ]
        }
    }


class ChatRequest(BaseModel):
    tenant_id: UUID
    user_id: Optional[UUID] = None
    location_id: Optional[int] = Field(default=None, gt=0)
    as_of_date: Optional[date] = None
    user_message: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "tenant_id": "00000000-0000-0000-0000-000000000000",
                    "location_id": 101,
                    "as_of_date": "2026-03-08",
                    "user_message": "What should I focus on first today?"
                }
            ]
        }
    }


_ALLOWED_EXPLAIN_TYPES = {
    "explain_metric",
    "explain_alert",
    "what_if",
    "freeform_chat",
}


@router.post("/explain")
def explain_ai_signal(
    payload: ExplainRequest,
    db: Session = Depends(get_db),
):
    if payload.request_type not in _ALLOWED_EXPLAIN_TYPES:
        raise HTTPException(status_code=400, detail="Invalid request_type")

    try:
        context = build_chat_context(
            db=db,
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            user_message=payload.user_message,
            request_type=payload.request_type,
        )

        result = generate_llm_text(
            prompt=context["prompt"],
            provider="gemini",
            model_name="gemini-2.5-flash-lite",
            temperature=0.2,
        )

        log_chat_explanation(
            db=db,
            tenant_id=payload.tenant_id,
            user_id=payload.user_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            request_type=payload.request_type,
            user_message=payload.user_message,
            resolved_context_json=context,
            response_text=result["text"],
            llm_provider=result["provider"],
            llm_model_name=result["model_name"],
            llm_model_version=result.get("model_version"),
            latency_ms=result.get("latency_ms"),
            status="succeeded",
            error_message=None,
        )

        return {
            "ok": True,
            "request_type": payload.request_type,
            "response_text": result["text"],
            "provider": result["provider"],
            "model_name": result["model_name"],
            "model_version": result.get("model_version"),
        }

    except Exception as e:
        try:
            log_chat_explanation(
                db=db,
                tenant_id=payload.tenant_id,
                user_id=payload.user_id,
                location_id=payload.location_id,
                as_of_date=payload.as_of_date,
                request_type=payload.request_type,
                user_message=payload.user_message,
                resolved_context_json=None,
                response_text=None,
                llm_provider=None,
                llm_model_name=None,
                llm_model_version=None,
                latency_ms=None,
                status="failed",
                error_message=str(e),
            )
        except Exception:
            pass

        raise HTTPException(status_code=500, detail=f"AI explain request failed: {str(e)}")


@router.post("/chat")
def ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    try:
        context = build_chat_context(
            db=db,
            tenant_id=payload.tenant_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            user_message=payload.user_message,
            request_type="freeform_chat",
        )

        result = generate_llm_text(
            prompt=context["prompt"],
            provider="gemini",
            model_name="gemini-2.5-flash-lite",
            temperature=0.3,
        )

        log_chat_explanation(
            db=db,
            tenant_id=payload.tenant_id,
            user_id=payload.user_id,
            location_id=payload.location_id,
            as_of_date=payload.as_of_date,
            request_type="freeform_chat",
            user_message=payload.user_message,
            resolved_context_json=context,
            response_text=result["text"],
            llm_provider=result["provider"],
            llm_model_name=result["model_name"],
            llm_model_version=result.get("model_version"),
            latency_ms=result.get("latency_ms"),
            status="succeeded",
            error_message=None,
        )

        return {
            "ok": True,
            "response_text": result["text"],
            "provider": result["provider"],
            "model_name": result["model_name"],
            "model_version": result.get("model_version"),
        }

    except Exception as e:
        try:
            log_chat_explanation(
                db=db,
                tenant_id=payload.tenant_id,
                user_id=payload.user_id,
                location_id=payload.location_id,
                as_of_date=payload.as_of_date,
                request_type="freeform_chat",
                user_message=payload.user_message,
                resolved_context_json=None,
                response_text=None,
                llm_provider=None,
                llm_model_name=None,
                llm_model_version=None,
                latency_ms=None,
                status="failed",
                error_message=str(e),
            )
        except Exception:
            pass

        raise HTTPException(status_code=500, detail=f"AI chat request failed: {str(e)}")