// frontend/app/api/billing/activate/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planCode = String(body?.plan_code ?? "growth").trim().toLowerCase();

    const allowedPlans = new Set(["starter", "growth", "enterprise"]);
    const finalPlan = allowedPlans.has(planCode) ? planCode : "growth";

    const tenantRes = await pool.query(
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
      return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
    }

    await pool.query(
      `
      insert into app.tenant_subscription (
        tenant_id,
        plan_code,
        subscription_status,
        billing_provider,
        billing_email,
        trial_ends_at,
        created_at,
        updated_at
      )
      values (
        $1::uuid,
        $2::text,
        'trial',
        'manual',
        $3::text,
        now() + interval '7 days',
        now(),
        now()
      )
      on conflict (tenant_id)
      do update set
        plan_code = excluded.plan_code,
        subscription_status = 'trial',
        billing_provider = excluded.billing_provider,
        billing_email = excluded.billing_email,
        trial_ends_at = now() + interval '7 days',
        updated_at = now()
      `,
      [tenant.tenant_id, finalPlan, user.email]
    );

    return NextResponse.json({
      ok: true,
      plan_code: finalPlan,
      subscription_status: "trial",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Billing activation failed" },
      { status: 500 }
    );
  }
}