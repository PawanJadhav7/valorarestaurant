//frontend/app/api/auth/status/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NextStep =
  | "signin"
  | "onboarding"
  | "tenant"
  | "subscription"
  | "pos"
  | "dashboard";

export async function GET() {
  try {
    const user = await getSessionUser();
    console.log("auth status: session user", {
      user_id: user?.user_id ?? null,
      tenant_id: user?.tenant_id ?? null,
      onboarding_status: user?.onboarding_status ?? null,
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          user_id: null,
          email: null,
          tenant_id: null,
          has_tenant: false,
          subscription_active: false,
          data_ready: false,
          onboarding_done: false,
          onboarding_status: null,
          next_step: "signin" as NextStep,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const onboarding_status = String(user.onboarding_status ?? "").toLowerCase();
    const profile_complete =
      onboarding_status === "profile_done" ||
      onboarding_status === "tenant_done" ||
      onboarding_status === "complete" ||
      onboarding_status === "completed";

    const tenantId = user.tenant_id ?? null;
    const has_tenant = Boolean(tenantId);

    let subscription_active = false;
    let data_ready = false;

    if (has_tenant) {
      try {
        console.log("auth status: checking subscription", { tenantId });
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
        subscription_active = ["active", "trial", "trialing"].includes(status);
      } catch (subErr) {
        console.error("auth status subscription lookup error", subErr);
        subscription_active = false;
      }

      try {
        console.log("auth status: checking tenant data_ready", { tenantId });
        const tenant = await pool.query(
          `
          select data_ready
          from app.tenant
          where tenant_id = $1::uuid
          limit 1
          `,
          [tenantId]
        );

        data_ready = Boolean(tenant.rows?.[0]?.data_ready ?? false);
      } catch (tenantErr) {
        console.error("auth status data_ready lookup error", tenantErr);
        data_ready = false;
      }
    }

    const onboarding_done = profile_complete && has_tenant && subscription_active && data_ready;

    let next_step: NextStep = "dashboard";

    // 1. First mandatory step after signup/login = profile onboarding
    if (!profile_complete) {
      next_step = "onboarding";
    }
    // 2. Then tenant creation
    else if (!has_tenant) {
      next_step = "tenant";
    }
    // 3. Then subscription
    else if (!subscription_active) {
      next_step = "subscription";
    }
    // 4. Then POS / CSV onboarding
    else if (!data_ready) {
      next_step = "pos";
    }
    // 5. Otherwise user is done
    else {
      next_step = "dashboard";
    }

    return NextResponse.json(
      {
        ok: true,
        user_id: user.user_id,
        email: user.email,
        tenant_id: tenantId,
        has_tenant,
        subscription_active,
        data_ready,
        onboarding_done,
        onboarding_status: user.onboarding_status ?? null,
        next_step,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("auth status error", err);

    return new NextResponse(
      JSON.stringify({
        ok: false,
        user_id: null,
        email: null,
        tenant_id: null,
        has_tenant: false,
        subscription_active: false,
        data_ready: false,
        onboarding_done: false,
        onboarding_status: null,
        next_step: "signin" as NextStep,
        error: err?.message ?? String(err),
        detail: {
          message: err?.message ?? null,
          code: err?.code ?? null,
          severity: err?.severity ?? null,
          detail: err?.detail ?? null,
          hint: err?.hint ?? null,
          schema: err?.schema ?? null,
          table: err?.table ?? null,
          constraint: err?.constraint ?? null,
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}