# backend/app/api/stripe_checkout.py
import os
import stripe
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from app.db import get_db

router = APIRouter(prefix="/api/stripe", tags=["Stripe Checkout"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

APP_BASE_URL = os.getenv("FRONTEND_URL") or os.getenv("NEXT_PUBLIC_VALORA_API_BASE_URL") or os.getenv("APP_BASE_URL")



class CreateCheckoutSessionRequest(BaseModel):
    tenant_id: str
    plan_code: str
    billing_interval: str
    quantity: int = 1


@router.post("/checkout-session")
def create_checkout_session(payload: CreateCheckoutSessionRequest):
    db = next(get_db())

    try:
        plan = db.execute(
            text("""
                SELECT
                    plan_code,
                    billing_interval,
                    stripe_price_id,
                    stripe_product_id,
                    amount_cents,
                    is_active
                FROM stripe.plan_catalog
                WHERE plan_code = :plan_code
                  AND billing_interval = :billing_interval
                  AND is_active = true
                LIMIT 1
            """),
            {
                "plan_code": payload.plan_code,
                "billing_interval": payload.billing_interval,
            },
        ).mappings().first()

        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        stripe_price_id = plan["stripe_price_id"]
        stripe_product_id = plan["stripe_product_id"]

        if not stripe_price_id or str(stripe_price_id).startswith("price_placeholder_"):
            raise HTTPException(
                status_code=400,
                detail="Plan is not connected to a real Stripe price yet"
            )

        tenant = db.execute(
            text("""
                SELECT t.tenant_id, t.tenant_name, u.email
                FROM app.tenant t
                LEFT JOIN app.tenant_user tu
                  ON tu.tenant_id = t.tenant_id
                LEFT JOIN auth.app_user u
                  ON u.user_id = tu.user_id
                 AND tu.role = 'owner'
                WHERE t.tenant_id = CAST(:tenant_id AS uuid)
                LIMIT 1
            """),
            {"tenant_id": payload.tenant_id},
        ).mappings().first()

        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        existing_sub = db.execute(
            text("""
                SELECT
                    tenant_id,
                    stripe_customer_id,
                    billing_email,
                    stripe_subscription_id,
                    plan_code,
                    subscription_status
                FROM app.tenant_subscription
                WHERE tenant_id = CAST(:tenant_id AS uuid)
                LIMIT 1
            """),
            {"tenant_id": payload.tenant_id},
        ).mappings().first()

        billing_email = None
        stripe_customer_id = None

        if existing_sub:
            billing_email = existing_sub["billing_email"]
            stripe_customer_id = existing_sub["stripe_customer_id"]
        else:
            billing_email = tenant["email"]

            db.execute(
                text("""
                    INSERT INTO app.tenant_subscription (
                        tenant_id,
                        billing_provider,
                        billing_email,
                        plan_code,
                        stripe_price_id,
                        stripe_product_id,
                        stripe_status,
                        subscription_status,
                        quantity,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        CAST(:tenant_id AS uuid),
                        'stripe',
                        :billing_email,
                        :plan_code,
                        :stripe_price_id,
                        :stripe_product_id,
                        'incomplete',
                        'past_due',
                        :quantity,
                        now(),
                        now()
                    )
                    ON CONFLICT (tenant_id) DO UPDATE SET
                        billing_email = COALESCE(EXCLUDED.billing_email, app.tenant_subscription.billing_email),
                        plan_code = EXCLUDED.plan_code,
                        stripe_price_id = EXCLUDED.stripe_price_id,
                        stripe_product_id = EXCLUDED.stripe_product_id,
                        quantity = EXCLUDED.quantity,
                        updated_at = now()
                """),
                {
                    "tenant_id": payload.tenant_id,
                    "billing_email": billing_email,
                    "plan_code": payload.plan_code,
                    "stripe_price_id": stripe_price_id,
                    "stripe_product_id": stripe_product_id,
                    "quantity": payload.quantity,
                },
            )
            db.commit()

        session_params = {
            "mode": "subscription",
            "line_items": [
                {
                    "price": stripe_price_id,
                    "quantity": payload.quantity,
                }
            ],
            "client_reference_id": payload.tenant_id,
            "success_url": f"{APP_BASE_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{APP_BASE_URL}/billing?checkout=cancel",
            "metadata": {
                "tenant_id": payload.tenant_id,
                "plan_code": payload.plan_code,
                "billing_interval": payload.billing_interval,
            },
            "subscription_data": {
                "metadata": {
                    "tenant_id": payload.tenant_id,
                    "plan_code": payload.plan_code,
                    "billing_interval": payload.billing_interval,
                }
            },
        }

        if stripe_customer_id:
            session_params["customer"] = stripe_customer_id
        elif billing_email:
            session_params["customer_email"] = billing_email
        print("STRIPE ACCOUNT:", stripe.Account.retrieve()["id"])
        print("SESSION PARAMS:", session_params)
        session = stripe.checkout.Session.create(**session_params)
        print("STRIPE ACCOUNT:", stripe.Account.retrieve()["id"])

        db.execute(
            text("""
                UPDATE app.tenant_subscription
                SET
                    plan_code = :plan_code,
                    stripe_price_id = :stripe_price_id,
                    stripe_product_id = :stripe_product_id,
                    quantity = :quantity,
                    updated_at = now()
                WHERE tenant_id = CAST(:tenant_id AS uuid)
            """),
            {
                "tenant_id": payload.tenant_id,
                "plan_code": payload.plan_code,
                "stripe_price_id": stripe_price_id,
                "stripe_product_id": stripe_product_id,
                "quantity": payload.quantity,
            },
        )
        db.commit()

        return {
            "checkout_session_id": session.id,
            "checkout_url": session.url,
        }

    except stripe.error.StripeError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()