from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text

from app.db import get_db

router = APIRouter(prefix="/api/subscription", tags=["Subscription Summary"])


@router.get("/summary")
def get_subscription_summary(tenant_id: str = Query(...)):
    db = next(get_db())

    try:
        current = db.execute(
            text(
                """
                select
                    tenant_id,
                    plan_code,
                    billing_interval,
                    subscription_status,
                    stripe_status,
                    current_period_start,
                    current_period_end,
                    trial_ends_at,
                    access_expires_at,
                    cancel_at_period_end,
                    canceled_at,
                    updated_at
                from app.tenant_subscription
                where tenant_id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        ).mappings().first()

        if not current:
            raise HTTPException(status_code=404, detail="Subscription not found")

        pending_change = db.execute(
            text(
                """
                select
                    subscription_change_id,
                    tenant_id,
                    change_type,
                    change_status,
                    current_plan_code,
                    current_billing_interval,
                    requested_plan_code,
                    requested_billing_interval,
                    effective_mode,
                    effective_at,
                    created_at,
                    updated_at
                from app.tenant_subscription_change
                where tenant_id = cast(:tenant_id as uuid)
                  and change_status in ('pending', 'scheduled')
                order by created_at desc
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        ).mappings().first()

        history_rows = db.execute(
            text(
                """
                select
                    subscription_change_id,
                    tenant_id,
                    change_type,
                    change_status,
                    current_plan_code,
                    current_billing_interval,
                    requested_plan_code,
                    requested_billing_interval,
                    effective_mode,
                    effective_at,
                    created_at,
                    updated_at,
                    applied_at,
                    canceled_at,
                    notes
                from app.tenant_subscription_change
                where tenant_id = cast(:tenant_id as uuid)
                order by created_at desc
                limit 20
                """
            ),
            {"tenant_id": tenant_id},
        ).mappings().all()

        return {
            "ok": True,
            "current": {
                "tenant_id": str(current["tenant_id"]),
                "plan_code": current["plan_code"],
                "billing_interval": current["billing_interval"],
                "subscription_status": current["subscription_status"],
                "stripe_status": current["stripe_status"],
                "current_period_start": current["current_period_start"],
                "current_period_end": current["current_period_end"],
                "trial_ends_at": current["trial_ends_at"],
                "access_expires_at": current["access_expires_at"],
                "cancel_at_period_end": current["cancel_at_period_end"],
                "canceled_at": current["canceled_at"],
                "updated_at": current["updated_at"],
            },
            "pending_change": None
            if not pending_change
            else {
                "subscription_change_id": str(pending_change["subscription_change_id"]),
                "tenant_id": str(pending_change["tenant_id"]),
                "change_type": pending_change["change_type"],
                "change_status": pending_change["change_status"],
                "current_plan_code": pending_change["current_plan_code"],
                "current_billing_interval": pending_change["current_billing_interval"],
                "requested_plan_code": pending_change["requested_plan_code"],
                "requested_billing_interval": pending_change["requested_billing_interval"],
                "effective_mode": pending_change["effective_mode"],
                "effective_at": pending_change["effective_at"],
                "created_at": pending_change["created_at"],
                "updated_at": pending_change["updated_at"],
            },
            "history": [
                {
                    "subscription_change_id": str(row["subscription_change_id"]),
                    "tenant_id": str(row["tenant_id"]),
                    "change_type": row["change_type"],
                    "change_status": row["change_status"],
                    "current_plan_code": row["current_plan_code"],
                    "current_billing_interval": row["current_billing_interval"],
                    "requested_plan_code": row["requested_plan_code"],
                    "requested_billing_interval": row["requested_billing_interval"],
                    "effective_mode": row["effective_mode"],
                    "effective_at": row["effective_at"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "applied_at": row["applied_at"],
                    "canceled_at": row["canceled_at"],
                    "notes": row["notes"],
                }
                for row in history_rows
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()