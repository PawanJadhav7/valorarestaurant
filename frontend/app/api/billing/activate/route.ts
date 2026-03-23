// frontend/app/api/billing/activate/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_API_BASE =
  process.env.VALORA_API_BASE_URL ||
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL ||
  "http://127.0.0.1:8000";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const rawPlanCode = String(body?.plan_code ?? "growth_monthly")
      .trim()
      .toLowerCase();

    const billingInterval = String(body?.billing_interval ?? "monthly")
      .trim()
      .toLowerCase();

    const quantity = Number(body?.quantity ?? 1);

    // ✅ FIX: extract base plan correctly
    const [basePlanRaw] = rawPlanCode.split("_");

    const allowedPlans = new Set(["starter", "growth", "enterprise"]);
    const basePlan = allowedPlans.has(basePlanRaw) ? basePlanRaw : "growth";

    const finalPlanCode = `${basePlan}_${billingInterval}`;

    // ✅ get tenant
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

    if (!tenant?.tenant_id) {
      return NextResponse.json(
        { ok: false, error: "Tenant not found" },
        { status: 404 }
      );
    }

    // ✅ call backend
    const backendRes = await fetch(
      `${BACKEND_API_BASE}/api/stripe/checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": String(tenant.tenant_id),
        },
        body: JSON.stringify({
          tenant_id: String(tenant.tenant_id),
          plan_code: finalPlanCode,
          billing_interval: billingInterval,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        }),
        cache: "no-store",
      }
    );

    const raw = await backendRes.text();
    let backendJson: any = null;

    try {
      backendJson = JSON.parse(raw);
    } catch {
      backendJson = null;
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            backendJson?.detail ||
            backendJson?.error ||
            raw ||
            "Failed to create Stripe checkout session",
        },
        { status: backendRes.status }
      );
    }

    return NextResponse.json({
      ok: true,
      checkout_url: backendJson?.checkout_url ?? null,
      checkout_session_id: backendJson?.checkout_session_id ?? null,
      tenant_id: String(tenant.tenant_id),
      plan_code: finalPlanCode,
    });
  } catch (e: any) {
    console.error("BILLING ACTIVATE ERROR:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Billing activation failed" },
      { status: 500 }
    );
  }
}