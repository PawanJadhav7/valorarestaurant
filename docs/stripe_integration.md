[Frontend]                                         [Backend / FastAPI]                                [Database]

1. User clicks "Subscribe" / selects plan
    │
    │ POST /api/stripe/checkout-session
    │ Payload: tenant_id, plan_code, billing_interval, quantity
    ▼
2. stripe_checkout.py → create_checkout_session()
    │
    │ - Check plan_catalog for plan → get stripe_price_id & stripe_product_id
    │ - Check tenant_subscription → insert or update
    │ - Create Stripe checkout session via stripe.checkout.Session.create()
    │
    │ Returns: checkout_session_id & checkout_url
    ▼
3. Frontend redirects user to Stripe Checkout
    │
    │ User completes payment
    ▼
4. Stripe sends webhook → POST /api/stripe/webhook
    │
    │ stripe_webhook.py → stripe_webhook()
    │ - Validate signature (STRIPE_WEBHOOK_SECRET)
    │ - Log event in stripe.subscription_event_log
    │ - Route to proper handler based on event type:
    │
    ├─ checkout.session.completed  → handle_checkout_completed()
    │      - Update tenant_subscription:
    │          stripe_customer_id
    │          stripe_subscription_id
    │          subscription_status (trial/active)
    │          stripe_status (active/incomplete)
    │      - Call sync_feature_entitlements_for_tenant()
    │          → Enable features based on plan_code & subscription_status
    │
    ├─ customer.subscription.created / updated / deleted → handle_subscription_update()
    │      - Update tenant_subscription fields:
    │          stripe_customer_id, stripe_subscription_id, price_id, product_id
    │          stripe_status, subscription_status
    │          cancel_at_period_end, canceled_at, current_period_start/end
    │      - Call sync_feature_entitlements_for_tenant()
    │
    ├─ invoice.paid / invoice.payment_succeeded → handle_invoice_paid()
    │      - Update tenant_subscription:
    │          last_invoice_id, last_payment_status
    │          subscription_status = 'active'
    │          current_period_start/end
    │      - Call sync_feature_entitlements_for_tenant()
    │
    └─ invoice.payment_failed → handle_payment_failed()
           - Update tenant_subscription:
               stripe_status = 'past_due'
               subscription_status = 'past_due'
               last_invoice_id, last_payment_status = 'failed'
           - Call sync_feature_entitlements_for_tenant()
    ▼
5. sync_feature_entitlements_for_tenant()
    │
    │ Determines features enabled based on plan_code & subscription_status
    │ Updates stripe.feature_entitlement for tenant_id
    ▼
6. Database now reflects:
    - app.tenant_subscription updated with latest Stripe info
    - stripe.feature_entitlement updated based on plan
    - stripe.subscription_event_log shows processed event
    ▼
7. Frontend / Dashboard reads tenant_subscription & feature_entitlement
    → Display features, billing info, subscription status to the user


    1. Login / Authentication
	•	Users log in via your existing auth system.
	•	After login, check if a tenant exists:
	•	No tenant: redirect to Client Setup.
	•	Tenant exists: check subscription status:
	•	Active → redirect to Dashboard.
	•	Trial or unpaid → redirect to Billing / Stripe Checkout.

⸻

2. Client Setup (/onboarding?step=client)
	•	Collect essential client info (name, email, organization).
	•	Create a client record in app.tenant_user / app.tenant.
	•	After completion → redirect to Tenant Setup.

⸻

3. Tenant Setup (/onboarding?step=tenant)
	•	Set up tenant workspace:
	•	Name, timezone, locations (optional initially).
	•	Create a record in app.tenant_subscription (status: incomplete / trial).
	•	Redirect to Billing / Stripe Checkout.

⸻

4. Stripe Billing (/onboarding?step=billing)
	•	Display plan options.
	•	Trigger Stripe Checkout Session:
	•	Backend (stripe_checkout.py) creates session, handles:
	•	New subscription creation.
	•	Existing subscription updates.
	•	Pass metadata: tenant_id, plan_code, billing_interval.
	•	After payment → Stripe redirects to:
	•	Success: /onboarding?step=pos (POS setup).
	•	Cancel: stay on billing page or retry.

⸻

5. Stripe Webhook (stripe_webhook.py)
	•	Receive events: checkout.session.completed, invoice.paid, payment_failed, subscription.updated.
	•	Update app.tenant_subscription:
	•	stripe_status, subscription_status
	•	Feature entitlements (core_dashboard, alerts, forecasting etc.)
	•	Ensure idempotent: log events in stripe.subscription_event_log.
	•	After successful subscription → tenant is ready for POS setup.

⸻

6. POS Integration (/onboarding?step=pos)
	•	Collect POS info or connect via API.
	•	Update app.tenant_pos table.
	•	On completion → redirect to Dashboard.

⸻

7. Dashboard (/dashboard)
	•	Check tenant subscription:
	•	Active → full access.
	•	Trial / past_due → restricted features, prompt for billing.
	•	Display entitlements based on feature_entitlement.