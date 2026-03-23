# backend/app/api/onboarding_subscription.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


class StartTrialRequest(BaseModel):
    user_id: str
    plan_code: str
    billing_interval: str

from sqlalchemy import text
from app.db import get_db


@router.post("/subscription/trial")
def start_trial(payload: StartTrialRequest):
    db = next(get_db())

    try:
        plan_code = payload.plan_code.strip().lower()
        billing_interval = payload.billing_interval.strip().lower()

        if plan_code not in {"starter", "growth"}:
            raise HTTPException(status_code=400, detail="Invalid plan_code")

        if billing_interval not in {"monthly", "annual"}:
            raise HTTPException(status_code=400, detail="Invalid billing_interval")

        owner_row = db.execute(
            text("""
                SELECT tenant_id
                FROM app.tenant_user
                WHERE user_id = CAST(:user_id AS uuid)
                  AND role = 'owner'
                ORDER BY created_at DESC
                LIMIT 1
            """),
            {"user_id": payload.user_id},
        ).mappings().first()

        if not owner_row:
            raise HTTPException(status_code=404, detail="No tenant found for this user")

        tenant_id = str(owner_row["tenant_id"])

        user_row = db.execute(
            text("""
                SELECT email
                FROM auth.app_user
                WHERE user_id = CAST(:user_id AS uuid)
                LIMIT 1
            """),
            {"user_id": payload.user_id},
        ).mappings().first()

        billing_email = user_row["email"] if user_row and user_row.get("email") else None

        db.execute(
            text("""
                INSERT INTO app.tenant_subscription (
                    tenant_id,
                    plan_code,
                    subscription_status,
                    billing_provider,
                    billing_email,
                    trial_ends_at,
                    access_expires_at,
                    quantity,
                    created_at,
                    updated_at
                )
                VALUES (
                    CAST(:tenant_id AS uuid),
                    :plan_code,
                    'trial',
                    'internal_trial',
                    :billing_email,
                    now() + interval '7 days',
                    now() + interval '7 days',
                    1,
                    now(),
                    now()
                )
                ON CONFLICT (tenant_id) DO UPDATE SET
                    plan_code = EXCLUDED.plan_code,
                    subscription_status = 'trial',
                    billing_provider = 'internal_trial',
                    billing_email = COALESCE(EXCLUDED.billing_email, app.tenant_subscription.billing_email),
                    trial_ends_at = now() + interval '7 days',
                    access_expires_at = now() + interval '7 days',
                    updated_at = now()
            """),
            {
                "tenant_id": tenant_id,
                "plan_code": plan_code,
                "billing_email": billing_email,
            },
        )

        db.execute(
            text("""
                UPDATE auth.app_user
                SET onboarding_status = 'complete'
                WHERE user_id = CAST(:user_id AS uuid)
            """),
            {"user_id": payload.user_id},
        )

        db.commit()

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "plan_code": plan_code,
            "billing_interval": billing_interval,
            "subscription_status": "trial",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()