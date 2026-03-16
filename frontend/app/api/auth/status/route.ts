// frontend/app/api/auth/status/route.ts

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NextStep = "signin" | "tenant" | "billing" | "onboarding" | "dashboard";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          user_id: null,
          email: null,
          tenant_id: null,
          has_tenant: false,
          subscription_active: false,
          onboarding_done: false,
          onboarding_status: null,
          next_step: "signin" as NextStep,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const tenantId = user.tenant_id ?? null;
    const has_tenant = Boolean(tenantId);

    let subscription_active = false;
    let onboarding_done =
      user.onboarding_status === "completed" ||
      user.onboarding_status === "tenant_done" ||
      user.onboarding_status === "complete";

    if (has_tenant) {
      try {
        const sub = await pool.query(
          `
          select subscription_status
          from app.tenant_subscription
          where tenant_id = $1::uuid
          order by updated_at desc nulls last, created_at desc
          limit 1
          `,
          [tenantId]
        );

        const status = String(sub.rows?.[0]?.subscription_status ?? "").toLowerCase();

        subscription_active =
          status === "active" ||
          status === "trial";
      } catch (subErr) {
        console.error("auth status subscription lookup error", subErr);
        subscription_active = false;
      }
    }

    let next_step: NextStep = "dashboard";

    if (!has_tenant) {
      next_step = "tenant";
    } else if (!subscription_active) {
      next_step = "billing";
    } else if (!onboarding_done) {
      next_step = "onboarding";
    }

    return NextResponse.json(
      {
        ok: true,
        user_id: user.user_id,
        email: user.email,
        tenant_id: tenantId,
        has_tenant,
        subscription_active,
        onboarding_done,
        onboarding_status: user.onboarding_status ?? null,
        next_step,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("auth status error", err);

    return NextResponse.json(
      {
        ok: false,
        user_id: null,
        email: null,
        tenant_id: null,
        has_tenant: false,
        subscription_active: false,
        onboarding_done: false,
        onboarding_status: null,
        next_step: "signin" as NextStep,
        error: err?.message ?? "auth status failed",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}