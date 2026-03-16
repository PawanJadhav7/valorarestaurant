# backend/app/api/stripe_webhook.py
import json
import os
import stripe
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import text

from app.db import get_db

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")


def map_stripe_status_to_app_status(stripe_status: str | None) -> str:
    mapping = {
        "trialing": "trial",
        "active": "active",
        "past_due": "past_due",
        "unpaid": "past_due",
        "canceled": "canceled",
        "incomplete": "trial",
        "incomplete_expired": "canceled",
        "paused": "past_due",
    }
    return mapping.get((stripe_status or "").lower(), "trial")


def sync_feature_entitlements_for_tenant(tenant_id: str, db) -> None:
    row = db.execute(
        text("""
            SELECT plan_code, subscription_status
            FROM app.tenant_subscription
            WHERE tenant_id = CAST(:tenant_id AS uuid)
            LIMIT 1
        """),
        {"tenant_id": tenant_id},
    ).mappings().first()

    if not row:
        return

    plan_code = row["plan_code"]
    subscription_status = row["subscription_status"]

    starter_features = {
        "core_dashboard",
        "cost_analytics",
        "alerts",
    }

    growth_features = {
        "core_dashboard",
        "cost_analytics",
        "alerts",
        "forecasting",
        "benchmarking",
        "executive_reports",
    }

    if subscription_status not in ("trial", "active"):
        enabled_features = set()
    elif plan_code == "starter":
        enabled_features = starter_features
    elif plan_code == "growth":
        enabled_features = growth_features
    else:
        enabled_features = set()

    all_features = starter_features | growth_features

    for feature_code in all_features:
        is_enabled = feature_code in enabled_features

        db.execute(
            text("""
                INSERT INTO stripe.feature_entitlement (
                    tenant_id,
                    feature_code,
                    is_enabled,
                    source,
                    valid_from,
                    updated_at
                )
                VALUES (
                    CAST(:tenant_id AS uuid),
                    :feature_code,
                    :is_enabled,
                    'subscription',
                    now(),
                    now()
                )
                ON CONFLICT (tenant_id, feature_code)
                DO UPDATE SET
                    is_enabled = EXCLUDED.is_enabled,
                    source = EXCLUDED.source,
                    updated_at = now()
            """),
            {
                "tenant_id": tenant_id,
                "feature_code": feature_code,
                "is_enabled": is_enabled,
            },
        )


def handle_checkout_completed(event: dict, db) -> None:
    session = event["data"]["object"]

    tenant_id = session.get("client_reference_id") or session.get("metadata", {}).get("tenant_id")
    stripe_customer_id = session.get("customer")
    stripe_subscription_id = session.get("subscription")

    if not tenant_id:
        return

    db.execute(
        text("""
            UPDATE app.tenant_subscription
            SET
                stripe_customer_id = COALESCE(:stripe_customer_id, stripe_customer_id),
                stripe_subscription_id = COALESCE(:stripe_subscription_id, stripe_subscription_id),
                billing_provider = 'stripe',
                stripe_status = COALESCE(stripe_status, 'active'),
                subscription_status = CASE
                    WHEN subscription_status IS NULL OR subscription_status IN ('pending', 'trial', 'past_due')
                    THEN 'active'
                    ELSE subscription_status
                END,
                updated_at = now()
            WHERE tenant_id = CAST(:tenant_id AS uuid)
        """),
        {
            "tenant_id": tenant_id,
            "stripe_customer_id": stripe_customer_id,
            "stripe_subscription_id": stripe_subscription_id,
        },
    )

    sync_feature_entitlements_for_tenant(tenant_id, db)


def handle_subscription_update(event: dict, db) -> None:
    subscription = event["data"]["object"]

    tenant_id = subscription.get("metadata", {}).get("tenant_id")
    stripe_subscription_id = subscription.get("id")
    stripe_customer_id = subscription.get("customer")
    stripe_status = subscription.get("status")
    app_status = map_stripe_status_to_app_status(stripe_status)

    cancel_at_period_end = subscription.get("cancel_at_period_end", False)
    canceled_at = subscription.get("canceled_at")
    current_period_start = subscription.get("current_period_start")
    current_period_end = subscription.get("current_period_end")

    item = (subscription.get("items", {}).get("data") or [{}])[0]
    quantity = item.get("quantity", 1)
    price_obj = item.get("price") or {}

    stripe_price_id = price_obj.get("id")
    stripe_product_id = price_obj.get("product")

    if tenant_id:
        db.execute(
            text("""
                UPDATE app.tenant_subscription
                SET
                    stripe_customer_id = COALESCE(:stripe_customer_id, stripe_customer_id),
                    stripe_subscription_id = COALESCE(:stripe_subscription_id, stripe_subscription_id),
                    stripe_price_id = COALESCE(:stripe_price_id, stripe_price_id),
                    stripe_product_id = COALESCE(:stripe_product_id, stripe_product_id),
                    stripe_status = :stripe_status,
                    subscription_status = :subscription_status,
                    cancel_at_period_end = :cancel_at_period_end,
                    canceled_at = CASE
                        WHEN :canceled_at IS NOT NULL THEN to_timestamp(:canceled_at)
                        ELSE canceled_at
                    END,
                    current_period_start = CASE
                        WHEN :current_period_start IS NOT NULL THEN to_timestamp(:current_period_start)
                        ELSE current_period_start
                    END,
                    current_period_end = CASE
                        WHEN :current_period_end IS NOT NULL THEN to_timestamp(:current_period_end)
                        ELSE current_period_end
                    END,
                    access_expires_at = CASE
                        WHEN :current_period_end IS NOT NULL THEN to_timestamp(:current_period_end)
                        ELSE access_expires_at
                    END,
                    quantity = :quantity,
                    updated_at = now()
                WHERE tenant_id = CAST(:tenant_id AS uuid)
            """),
            {
                "tenant_id": tenant_id,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "stripe_price_id": stripe_price_id,
                "stripe_product_id": stripe_product_id,
                "stripe_status": stripe_status,
                "subscription_status": app_status,
                "cancel_at_period_end": cancel_at_period_end,
                "canceled_at": canceled_at,
                "current_period_start": current_period_start,
                "current_period_end": current_period_end,
                "quantity": quantity or 1,
            },
        )

        sync_feature_entitlements_for_tenant(tenant_id, db)
        return

    # Fallback if metadata.tenant_id is missing but subscription is already linked
    db.execute(
        text("""
            UPDATE app.tenant_subscription
            SET
                stripe_customer_id = COALESCE(:stripe_customer_id, stripe_customer_id),
                stripe_price_id = COALESCE(:stripe_price_id, stripe_price_id),
                stripe_product_id = COALESCE(:stripe_product_id, stripe_product_id),
                stripe_status = :stripe_status,
                subscription_status = :subscription_status,
                cancel_at_period_end = :cancel_at_period_end,
                canceled_at = CASE
                    WHEN :canceled_at IS NOT NULL THEN to_timestamp(:canceled_at)
                    ELSE canceled_at
                END,
                current_period_start = CASE
                    WHEN :current_period_start IS NOT NULL THEN to_timestamp(:current_period_start)
                    ELSE current_period_start
                END,
                current_period_end = CASE
                    WHEN :current_period_end IS NOT NULL THEN to_timestamp(:current_period_end)
                    ELSE current_period_end
                END,
                access_expires_at = CASE
                    WHEN :current_period_end IS NOT NULL THEN to_timestamp(:current_period_end)
                    ELSE access_expires_at
                END,
                quantity = :quantity,
                updated_at = now()
            WHERE stripe_subscription_id = :stripe_subscription_id
        """),
        {
            "stripe_customer_id": stripe_customer_id,
            "stripe_price_id": stripe_price_id,
            "stripe_product_id": stripe_product_id,
            "stripe_status": stripe_status,
            "subscription_status": app_status,
            "cancel_at_period_end": cancel_at_period_end,
            "canceled_at": canceled_at,
            "current_period_start": current_period_start,
            "current_period_end": current_period_end,
            "quantity": quantity or 1,
            "stripe_subscription_id": stripe_subscription_id,
        },
    )

    tenant_row = db.execute(
        text("""
            SELECT tenant_id
            FROM app.tenant_subscription
            WHERE stripe_subscription_id = :stripe_subscription_id
            LIMIT 1
        """),
        {"stripe_subscription_id": stripe_subscription_id},
    ).mappings().first()

    if tenant_row:
        sync_feature_entitlements_for_tenant(str(tenant_row["tenant_id"]), db)


def handle_invoice_paid(event: dict, db) -> None:
    invoice = event["data"]["object"]

    subscription_id = invoice.get("subscription")
    invoice_id = invoice.get("id")
    payment_status = invoice.get("status", "paid")

    if not subscription_id:
        return

    period_start = None
    period_end = None

    lines = invoice.get("lines", {}).get("data", [])
    if lines:
        line_period = lines[0].get("period", {})
        period_start = line_period.get("start")
        period_end = line_period.get("end")

    db.execute(
        text("""
            UPDATE app.tenant_subscription
            SET
                last_invoice_id = :invoice_id,
                last_payment_status = :payment_status,
                stripe_status = 'active',
                subscription_status = 'active',
                current_period_start = CASE
                    WHEN :period_start IS NOT NULL THEN to_timestamp(:period_start)
                    ELSE current_period_start
                END,
                current_period_end = CASE
                    WHEN :period_end IS NOT NULL THEN to_timestamp(:period_end)
                    ELSE current_period_end
                END,
                access_expires_at = CASE
                    WHEN :period_end IS NOT NULL THEN to_timestamp(:period_end)
                    ELSE access_expires_at
                END,
                updated_at = now()
            WHERE stripe_subscription_id = :subscription_id
        """),
        {
            "invoice_id": invoice_id,
            "payment_status": payment_status,
            "period_start": period_start,
            "period_end": period_end,
            "subscription_id": subscription_id,
        },
    )

    tenant_row = db.execute(
        text("""
            SELECT tenant_id
            FROM app.tenant_subscription
            WHERE stripe_subscription_id = :subscription_id
            LIMIT 1
        """),
        {"subscription_id": subscription_id},
    ).mappings().first()

    if tenant_row:
        sync_feature_entitlements_for_tenant(str(tenant_row["tenant_id"]), db)


def handle_payment_failed(event: dict, db) -> None:
    invoice = event["data"]["object"]
    subscription_id = invoice.get("subscription")
    invoice_id = invoice.get("id")

    if not subscription_id:
        return

    db.execute(
        text("""
            UPDATE app.tenant_subscription
            SET
                stripe_status = 'past_due',
                subscription_status = 'past_due',
                last_invoice_id = :invoice_id,
                last_payment_status = 'failed',
                updated_at = now()
            WHERE stripe_subscription_id = :subscription_id
        """),
        {
            "invoice_id": invoice_id,
            "subscription_id": subscription_id,
        },
    )

    tenant_row = db.execute(
        text("""
            SELECT tenant_id
            FROM app.tenant_subscription
            WHERE stripe_subscription_id = :subscription_id
            LIMIT 1
        """),
        {"subscription_id": subscription_id},
    ).mappings().first()

    if tenant_row:
        sync_feature_entitlements_for_tenant(str(tenant_row["tenant_id"]), db)


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=endpoint_secret,
        )
        event_data = event.to_dict_recursive()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    db = next(get_db())

    try:
        event_id = event_data["id"]
        event_type = event_data["type"]
        stripe_object_id = event_data["data"]["object"].get("id")

        db.execute(
            text("""
                INSERT INTO stripe.subscription_event_log (
                    stripe_event_id,
                    event_type,
                    stripe_object_id,
                    payload,
                    processing_status,
                    received_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    :stripe_event_id,
                    :event_type,
                    :stripe_object_id,
                    CAST(:payload AS jsonb),
                    'processing',
                    now(),
                    now(),
                    now()
                )
                ON CONFLICT (stripe_event_id) DO NOTHING
            """),
            {
                "stripe_event_id": event_id,
                "event_type": event_type,
                "stripe_object_id": stripe_object_id,
                "payload": json.dumps(event_data),
            },
        )
        db.commit()

        if event_type == "checkout.session.completed":
            handle_checkout_completed(event_data, db)
        elif event_type in (
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        ):
            handle_subscription_update(event_data, db)
        elif event_type == "invoice.paid":
            handle_invoice_paid(event_data, db)
        elif event_type == "invoice.payment_failed":
            handle_payment_failed(event_data, db)

        db.commit()

        db.execute(
            text("""
                UPDATE stripe.subscription_event_log
                SET
                    processing_status = 'processed',
                    processed_at = now(),
                    updated_at = now()
                WHERE stripe_event_id = :stripe_event_id
            """),
            {"stripe_event_id": event_id},
        )
        db.commit()

        print(f"Stripe event processed: {event_type} / {event_id}")
        return {"status": "ok"}

    except Exception as e:
        db.rollback()

        try:
            db.execute(
                text("""
                    UPDATE stripe.subscription_event_log
                    SET
                        processing_status = 'failed',
                        error_message = :error_message,
                        updated_at = now()
                    WHERE stripe_event_id = :stripe_event_id
                """),
                {
                    "stripe_event_id": event_data.get("id"),
                    "error_message": str(e),
                },
            )
            db.commit()
        except Exception:
            db.rollback()

        print(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")
    finally:
        db.close()