import os
import stripe
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.db import get_db

router = APIRouter(prefix="/api/stripe", tags=["Stripe Verify"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class VerifySessionRequest(BaseModel):
    session_id: str
    user_id: str


def map_subscription_status(stripe_status: str | None) -> str:
    s = (stripe_status or "").lower()
    if s == "trialing":
        return "trial"
    if s == "active":
        return "active"
    if s in {"past_due", "unpaid", "paused"}:
        return "past_due"
    if s in {"canceled", "incomplete_expired"}:
        return "canceled"
    return "trial"


@router.post("/verify-session")
def verify_session(payload: VerifySessionRequest):
    db = next(get_db())

    try:
        session_id = str(payload.session_id).strip()
        user_id = str(payload.user_id).strip()

        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")

        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        try:
            session = stripe.checkout.Session.retrieve(
                session_id,
                expand=["subscription", "customer"],
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Stripe fetch failed: {str(e)}")

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session_status = (session.get("status") or "").lower()
        if session_status != "complete":
            raise HTTPException(status_code=400, detail="Checkout session is not complete")

        tenant_id = (
            session.get("client_reference_id")
            or session.get("metadata", {}).get("tenant_id")
        )

        if not tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id missing in session")

        stripe_customer = session.get("customer")
        stripe_subscription = session.get("subscription")

        stripe_customer_id = (
            stripe_customer.get("id") if isinstance(stripe_customer, dict) else stripe_customer
        )
        stripe_subscription_id = (
            stripe_subscription.get("id") if isinstance(stripe_subscription, dict) else stripe_subscription
        )

        if not stripe_subscription_id:
            raise HTTPException(status_code=400, detail="subscription missing in checkout session")

        subscription_obj = (
            stripe_subscription
            if isinstance(stripe_subscription, dict)
            else stripe.Subscription.retrieve(stripe_subscription_id)
        )

        stripe_status = (subscription_obj.get("status") or "").lower()
        if stripe_status not in {"trialing", "active"}:
            raise HTTPException(
                status_code=400,
                detail=f"Subscription not ready yet (status={stripe_status})",
            )

        current_period_start = subscription_obj.get("current_period_start")
        current_period_end = subscription_obj.get("current_period_end")
        cancel_at_period_end = bool(subscription_obj.get("cancel_at_period_end", False))
        canceled_at = subscription_obj.get("canceled_at")

        app_status = map_subscription_status(stripe_status)

        db.execute(
            text(
                """
                UPDATE app.tenant_subscription
                SET
                    stripe_customer_id = COALESCE(:stripe_customer_id, stripe_customer_id),
                    stripe_subscription_id = COALESCE(:stripe_subscription_id, stripe_subscription_id),
                    stripe_status = :stripe_status,
                    subscription_status = :subscription_status,
                    current_period_start = CASE
                        WHEN :current_period_start IS NOT NULL THEN to_timestamp(:current_period_start)
                        ELSE current_period_start
                    END,
                    current_period_end = CASE
                        WHEN :current_period_end IS NOT NULL THEN to_timestamp(:current_period_end)
                        ELSE current_period_end
                    END,
                    trial_ends_at = CASE
                        WHEN :current_period_end IS NOT NULL AND :stripe_status = 'trialing'
                        THEN to_timestamp(:current_period_end)
                        ELSE trial_ends_at
                    END,
                    access_expires_at = CASE
                        WHEN :current_period_end IS NOT NULL THEN to_timestamp(:current_period_end)
                        ELSE access_expires_at
                    END,
                    cancel_at_period_end = :cancel_at_period_end,
                    canceled_at = CASE
                        WHEN :canceled_at IS NOT NULL THEN to_timestamp(:canceled_at)
                        ELSE canceled_at
                    END,
                    updated_at = now()
                WHERE tenant_id = CAST(:tenant_id AS uuid)
                """
            ),
            {
                "tenant_id": tenant_id,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "stripe_status": stripe_status,
                "subscription_status": app_status,
                "current_period_start": current_period_start,
                "current_period_end": current_period_end,
                "cancel_at_period_end": cancel_at_period_end,
                "canceled_at": canceled_at,
            },
        )

        # keep onboarding before POS completion; do NOT mark complete here
        db.execute(
            text(
                """
                UPDATE auth.app_user
                SET onboarding_status = 'tenant_done'
                WHERE user_id = CAST(:user_id AS uuid)
                """
            ),
            {"user_id": user_id},
        )

        # POS still not done, so tenant is not data-ready yet
        db.execute(
            text(
                """
                UPDATE app.tenant
                SET data_ready = false
                WHERE tenant_id = CAST(:tenant_id AS uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )

        db.commit()

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "subscription_status": app_status,
            "stripe_status": stripe_status,
            "redirect": "/onboarding/pos",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()