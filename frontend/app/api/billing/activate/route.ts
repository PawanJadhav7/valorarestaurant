import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingInterval = "monthly" | "annual";

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const planCode = String(body?.plan_code ?? "growth").trim().toLowerCase();
    const billingInterval = String(body?.billing_interval ?? "monthly")
      .trim()
      .toLowerCase() as BillingInterval;
    const quantity = Math.max(1, Number(body?.quantity ?? 1) || 1);

    const allowedPlans = new Set(["starter", "growth", "enterprise"]);
    const allowedIntervals = new Set(["monthly", "annual"]);

    const finalPlan = allowedPlans.has(planCode) ? planCode : "growth";
    const finalInterval = allowedIntervals.has(billingInterval)
      ? billingInterval
      : "monthly";

    const tenantRes = await client.query(
      `
      select tenant_id
      from app.tenant_user
      where user_id = $1::uuid
      order by created_at asc
      limit 1
      `,
      [user.user_id]
    );

    const tenant = tenantRes.rows?.[0];
    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    await client.query("BEGIN");

    await client.query(
      `
      insert into app.tenant_subscription (
        tenant_id,
        plan_code,
        subscription_status,
        billing_provider,
        billing_email,
        current_period_start,
        current_period_end,
        trial_ends_at,
        cancel_at_period_end,
        created_at,
        updated_at,
        quantity,
        billing_interval
      )
      values (
        $1::uuid,
        $2::text,
        'trial',
        'manual',
        $3::text,
        now(),
        now() + interval '14 days',
        now() + interval '14 days',
        false,
        now(),
        now(),
        $4::int,
        $5::varchar
      )
      on conflict (tenant_id)
      do update set
        plan_code = excluded.plan_code,
        subscription_status = 'trial',
        billing_provider = excluded.billing_provider,
        billing_email = excluded.billing_email,
        current_period_start = now(),
        current_period_end = now() + interval '14 days',
        trial_ends_at = now() + interval '14 days',
        cancel_at_period_end = false,
        quantity = excluded.quantity,
        billing_interval = excluded.billing_interval,
        updated_at = now()
      `,
      [tenant.tenant_id, finalPlan, user.email, quantity, finalInterval]
    );

    await client.query(
      `
      update auth.app_user
      set onboarding_status = case
        when onboarding_status is null or onboarding_status = '' then 'tenant_done'
        when onboarding_status = 'profile_done' then 'tenant_done'
        else onboarding_status
      end
      where user_id = $1::uuid
      `,
      [user.user_id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      plan_code: finalPlan,
      billing_interval: finalInterval,
      subscription_status: "trial",
      redirect: "/onboarding/pos",
    });
  } catch (e: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Billing activation failed" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}