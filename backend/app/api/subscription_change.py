from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.db import get_db
from app.services.subscription_change_service import SubscriptionChangeService

router = APIRouter(prefix="/api/subscription", tags=["Subscription Change"])


class SubscriptionChangeRequest(BaseModel):
    tenant_id: str
    requested_by_user_id: str | None = None
    requested_plan_code: str
    requested_billing_interval: str


def _normalize_plan_code(plan_code: str) -> str:
    return str(plan_code or "").strip().lower()


def _normalize_interval(interval: str) -> str:
    return str(interval or "").strip().lower()


def _plan_rank(plan_code: str) -> int:
    ranks = {
        "starter": 1,
        "growth": 2,
        "enterprise": 3,
    }
    return ranks.get(plan_code, 0)


@router.post("/change")
def request_subscription_change(payload: SubscriptionChangeRequest):
    db = next(get_db())

    try:
        tenant_id = str(payload.tenant_id).strip()
        requested_by_user_id = (
            str(payload.requested_by_user_id).strip()
            if payload.requested_by_user_id
            else None
        )
        requested_plan_code = _normalize_plan_code(payload.requested_plan_code)
        requested_billing_interval = _normalize_interval(payload.requested_billing_interval)

        if requested_plan_code not in {"starter", "growth", "enterprise"}:
            raise HTTPException(status_code=400, detail="Invalid requested_plan_code")

        if requested_billing_interval not in {"monthly", "annual"}:
            raise HTTPException(status_code=400, detail="Invalid requested_billing_interval")

        sub = db.execute(
            text(
                """
                select
                    tenant_id,
                    plan_code,
                    billing_interval,
                    subscription_status,
                    stripe_subscription_id,
                    current_period_end
                from app.tenant_subscription
                where tenant_id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        ).mappings().first()

        if not sub:
            raise HTTPException(status_code=404, detail="Active subscription record not found")

        current_plan_code = _normalize_plan_code(sub["plan_code"])
        current_billing_interval = _normalize_interval(sub["billing_interval"])
        subscription_status = str(sub["subscription_status"] or "").strip().lower()

        if subscription_status not in {"trial", "active"}:
            raise HTTPException(
                status_code=403,
                detail="Only active or trial subscriptions can request plan changes",
            )

        if (
            current_plan_code == requested_plan_code
            and current_billing_interval == requested_billing_interval
        ):
            raise HTTPException(status_code=400, detail="Requested plan is already active")

        existing_open_change = db.execute(
            text(
                """
                select subscription_change_id, change_status
                from app.tenant_subscription_change
                where tenant_id = cast(:tenant_id as uuid)
                  and change_status in ('pending', 'scheduled')
                order by created_at desc
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        ).mappings().first()

        if existing_open_change:
            raise HTTPException(
                status_code=409,
                detail="A pending or scheduled subscription change already exists for this tenant",
            )

        current_rank = _plan_rank(current_plan_code)
        requested_rank = _plan_rank(requested_plan_code)

        same_plan_different_interval = (
            current_plan_code == requested_plan_code
            and current_billing_interval != requested_billing_interval
        )

        if same_plan_different_interval:
            change_type = "interval_change"
            effective_mode = "next_billing_cycle"
        elif requested_rank > current_rank:
            change_type = "upgrade"
            effective_mode = "immediate"
        elif requested_rank < current_rank:
            change_type = "downgrade"
            effective_mode = "next_billing_cycle"
        else:
            change_type = "interval_change"
            effective_mode = "next_billing_cycle"

        effective_at = None
        change_status = "pending"

        if effective_mode == "next_billing_cycle":
            effective_at = sub["current_period_end"]
            change_status = "scheduled" if effective_at is not None else "pending"

        inserted = db.execute(
            text(
                """
                insert into app.tenant_subscription_change (
                    tenant_id,
                    requested_by_user_id,
                    change_type,
                    change_status,
                    current_plan_code,
                    current_billing_interval,
                    requested_plan_code,
                    requested_billing_interval,
                    effective_mode,
                    effective_at,
                    stripe_subscription_id,
                    created_at,
                    updated_at
                )
                values (
                    cast(:tenant_id as uuid),
                    cast(:requested_by_user_id as uuid),
                    :change_type,
                    :change_status,
                    :current_plan_code,
                    :current_billing_interval,
                    :requested_plan_code,
                    :requested_billing_interval,
                    :effective_mode,
                    :effective_at,
                    :stripe_subscription_id,
                    now(),
                    now()
                )
                returning
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
                    created_at
                """
            ),
            {
                "tenant_id": tenant_id,
                "requested_by_user_id": requested_by_user_id,
                "change_type": change_type,
                "change_status": change_status,
                "current_plan_code": current_plan_code,
                "current_billing_interval": current_billing_interval,
                "requested_plan_code": requested_plan_code,
                "requested_billing_interval": requested_billing_interval,
                "effective_mode": effective_mode,
                "effective_at": effective_at,
                "stripe_subscription_id": sub["stripe_subscription_id"],
            },
        ).mappings().first()

        db.commit()

        response = {
            "ok": True,
            "subscription_change": {
                "subscription_change_id": str(inserted["subscription_change_id"]),
                "tenant_id": str(inserted["tenant_id"]),
                "change_type": inserted["change_type"],
                "change_status": inserted["change_status"],
                "current_plan_code": inserted["current_plan_code"],
                "current_billing_interval": inserted["current_billing_interval"],
                "requested_plan_code": inserted["requested_plan_code"],
                "requested_billing_interval": inserted["requested_billing_interval"],
                "effective_mode": inserted["effective_mode"],
                "effective_at": inserted["effective_at"],
                "created_at": inserted["created_at"],
            },
            "rules_applied": {
                "upgrade": "immediate",
                "downgrade": "next_billing_cycle",
                "interval_change": "next_billing_cycle",
            },
        }

        # Apply only immediate upgrades automatically
        if inserted["effective_mode"] == "immediate" and inserted["change_type"] == "upgrade":
            apply_result = SubscriptionChangeService(
                str(inserted["subscription_change_id"])
            ).apply_if_immediate()

            response["applied_result"] = apply_result

        return response

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()