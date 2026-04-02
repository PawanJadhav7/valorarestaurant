//frontend/app/api/stripe/checkout-session/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Python API returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const plan_code = String(body?.plan_code ?? "").trim().toLowerCase();
    const billing_interval = String(body?.billing_interval ?? "").trim().toLowerCase();
    const quantity = Math.max(1, Number(body?.quantity ?? 1) || 1);

    if (!plan_code) {
      return NextResponse.json({ ok: false, error: "plan_code is required" }, { status: 400 });
    }

    if (!billing_interval) {
      return NextResponse.json({ ok: false, error: "billing_interval is required" }, { status: 400 });
    }

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
      return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
    }

    const pythonBase = process.env.PYTHON_API_URL;
    if (!pythonBase) {
      return NextResponse.json(
        { ok: false, error: "PYTHON_API_URL is not configured" },
        { status: 500 }
      );
    }
    console.log("PYTHON_API_URL =", pythonBase);
    const res = await fetch(`${pythonBase}/api/stripe/checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenant.tenant_id,
        plan_code,
        billing_interval,
        quantity,
      }),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.detail || data?.error || "Stripe checkout creation failed" },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      checkout_url: data?.checkout_url,
      checkout_session_id: data?.checkout_session_id,
    });
  } catch (e: any) {
    console.error("Checkout proxy failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Checkout proxy failed" },
      { status: 500 }
    );
  }
}