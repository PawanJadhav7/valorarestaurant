import os
import stripe
from fastapi import HTTPException
from sqlalchemy import text

from app.db import get_db

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class SubscriptionChangeService:
    def __init__(self, subscription_change_id: str):
        self.subscription_change_id = str(subscription_change_id).strip()

    def apply_if_immediate(self) -> dict:
        db = next(get_db())

        try:
            change = db.execute(
                text(
                    """
                    select
                        sc.subscription_change_id,
                        sc.tenant_id,
                        sc.change_type,
                        sc.change_status,
                        sc.current_plan_code,
                        sc.current_billing_interval,
                        sc.requested_plan_code,
                        sc.requested_billing_interval,
                        sc.effective_mode,
                        sc.effective_at,
                        sc.stripe_subscription_id,
                        ts.subscription_status as live_subscription_status,
                        ts.stripe_subscription_id as live_stripe_subscription_id
                    from app.tenant_subscription_change sc
                    join app.tenant_subscription ts
                      on ts.tenant_id = sc.tenant_id
                    where sc.subscription_change_id = cast(:subscription_change_id as uuid)
                    limit 1
                    """
                ),
                {"subscription_change_id": self.subscription_change_id},
            ).mappings().first()

            if not change:
                raise HTTPException(status_code=404, detail="Subscription change request not found")

            if change["change_status"] not in {"pending", "scheduled"}:
                return {
                    "ok": True,
                    "applied": False,
                    "reason": f"Change status is already {change['change_status']}",
                }

            if change["effective_mode"] != "immediate":
                return {
                    "ok": True,
                    "applied": False,
                    "reason": "Change is not immediate; no Stripe action taken",
                }

            if change["change_type"] != "upgrade":
                return {
                    "ok": True,
                    "applied": False,
                    "reason": "Only immediate upgrades are applied automatically",
                }

            if str(change["live_subscription_status"] or "").lower() not in {"trial", "active"}:
                raise HTTPException(
                    status_code=403,
                    detail="Live subscription is not eligible for immediate upgrade",
                )

            stripe_subscription_id = (
                change["live_stripe_subscription_id"] or change["stripe_subscription_id"]
            )
            if not stripe_subscription_id:
                raise HTTPException(
                    status_code=400,
                    detail="Stripe subscription ID is missing on live subscription",
                )

            target_plan = db.execute(
                text(
                    """
                    select
                        plan_code,
                        billing_interval,
                        stripe_price_id,
                        stripe_product_id,
                        is_active
                    from stripe.plan_catalog
                    where plan_code = :requested_plan_code
                      and billing_interval = :requested_billing_interval
                      and is_active = true
                    limit 1
                    """
                ),
                {
                    "requested_plan_code": change["requested_plan_code"],
                    "requested_billing_interval": change["requested_billing_interval"],
                },
            ).mappings().first()

            if not target_plan:
                raise HTTPException(status_code=404, detail="Requested target plan not found in plan_catalog")

            target_price_id = target_plan["stripe_price_id"]
            if not target_price_id or str(target_price_id).startswith("price_placeholder_"):
                raise HTTPException(
                    status_code=400,
                    detail="Requested target plan is not connected to a real Stripe price",
                )

            try:
                stripe_sub = stripe.Subscription.retrieve(stripe_subscription_id)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to retrieve Stripe subscription: {str(e)}")

            items = stripe_sub.get("items", {}).get("data") or []
            if not items:
                raise HTTPException(status_code=400, detail="Stripe subscription has no items")

            subscription_item_id = items[0].get("id")
            quantity = items[0].get("quantity", 1) or 1

            try:
                updated_sub = stripe.Subscription.modify(
                    stripe_subscription_id,
                    items=[
                        {
                            "id": subscription_item_id,
                            "price": target_price_id,
                            "quantity": quantity,
                        }
                    ],
                    proration_behavior="create_prorations",
                    metadata={
                        "tenant_id": str(change["tenant_id"]),
                        "plan_code": str(change["requested_plan_code"]),
                        "billing_interval": str(change["requested_billing_interval"]),
                        "change_request_id": str(change["subscription_change_id"]),
                    },
                )
            except Exception as e:
                db.execute(
                    text(
                        """
                        update app.tenant_subscription_change
                        set
                            change_status = 'failed',
                            notes = coalesce(notes, '') || :failure_note,
                            updated_at = now()
                        where subscription_change_id = cast(:subscription_change_id as uuid)
                        """
                    ),
                    {
                        "subscription_change_id": self.subscription_change_id,
                        "failure_note": f"\nStripe apply failed: {str(e)}",
                    },
                )
                db.commit()
                raise HTTPException(status_code=400, detail=f"Failed to update Stripe subscription: {str(e)}")

            item = (updated_sub.get("items", {}).get("data") or [{}])[0]
            stripe_price_id = item.get("price", {}).get("id")
            stripe_product_id = item.get("price", {}).get("product")
            stripe_status = str(updated_sub.get("status") or "").lower()
            cancel_at_period_end = bool(updated_sub.get("cancel_at_period_end", False))
            canceled_at = updated_sub.get("canceled_at")
            current_period_start = updated_sub.get("current_period_start")
            current_period_end = updated_sub.get("current_period_end")
            app_status = "trial" if stripe_status == "trialing" else "active" if stripe_status == "active" else "past_due"

            db.execute(
                text(
                    """
                    update app.tenant_subscription
                    set
                        plan_code = :requested_plan_code,
                        billing_interval = :requested_billing_interval,
                        stripe_price_id = :stripe_price_id,
                        stripe_product_id = :stripe_product_id,
                        stripe_status = :stripe_status,
                        subscription_status = :subscription_status,
                        current_period_start = case
                            when :current_period_start is not null then to_timestamp(:current_period_start)
                            else current_period_start
                        end,
                        current_period_end = case
                            when :current_period_end is not null then to_timestamp(:current_period_end)
                            else current_period_end
                        end,
                        trial_ends_at = case
                            when :stripe_status = 'trialing' and :current_period_end is not null
                            then to_timestamp(:current_period_end)
                            else trial_ends_at
                        end,
                        access_expires_at = case
                            when :current_period_end is not null then to_timestamp(:current_period_end)
                            else access_expires_at
                        end,
                        cancel_at_period_end = :cancel_at_period_end,
                        canceled_at = case
                            when :canceled_at is not null then to_timestamp(:canceled_at)
                            else canceled_at
                        end,
                        updated_at = now()
                    where tenant_id = cast(:tenant_id as uuid)
                    """
                ),
                {
                    "tenant_id": str(change["tenant_id"]),
                    "requested_plan_code": str(change["requested_plan_code"]),
                    "requested_billing_interval": str(change["requested_billing_interval"]),
                    "stripe_price_id": stripe_price_id,
                    "stripe_product_id": stripe_product_id,
                    "stripe_status": stripe_status,
                    "subscription_status": app_status,
                    "current_period_start": current_period_start,
                    "current_period_end": current_period_end,
                    "cancel_at_period_end": cancel_at_period_end,
                    "canceled_at": canceled_at,
                },
            )

            db.execute(
                text(
                    """
                    update app.tenant_subscription_change
                    set
                        change_status = 'applied',
                        applied_at = now(),
                        updated_at = now(),
                        notes = coalesce(notes, '') || :success_note
                    where subscription_change_id = cast(:subscription_change_id as uuid)
                    """
                ),
                {
                    "subscription_change_id": self.subscription_change_id,
                    "success_note": "\nApplied as immediate upgrade.",
                },
            )

            db.commit()

            return {
                "ok": True,
                "applied": True,
                "subscription_change_id": str(change["subscription_change_id"]),
                "tenant_id": str(change["tenant_id"]),
                "requested_plan_code": str(change["requested_plan_code"]),
                "requested_billing_interval": str(change["requested_billing_interval"]),
                "stripe_status": stripe_status,
                "subscription_status": app_status,
            }

        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()