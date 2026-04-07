// frontend/app/api/onboarding/summary/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        u.full_name,
        u.email,
        t.tenant_name,
        ts.plan_code,
        ts.billing_interval,
        ts.subscription_status,
        ts.trial_ends_at,
        pc.provider,
        dl.location_name,
        dl.external_location_id
      FROM auth.app_user u
      JOIN app.tenant_user tu ON tu.user_id = u.user_id
      JOIN app.tenant t ON t.tenant_id = tu.tenant_id
      LEFT JOIN app.tenant_subscription ts ON ts.tenant_id = t.tenant_id
      LEFT JOIN restaurant.pos_connection pc ON pc.tenant_id = t.tenant_id AND pc.status = 'active'
      LEFT JOIN restaurant.dim_location dl ON dl.location_id = pc.location_id
      WHERE u.user_id = $1::uuid
      ORDER BY pc.created_at DESC
      LIMIT 1
      `,
      [user.user_id]
    );

    const row = result.rows?.[0];
    if (!row) {
      return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        full_name:           row.full_name,
        email:               row.email,
        tenant_name:         row.tenant_name,
        plan_code:           row.plan_code,
        billing_interval:    row.billing_interval,
        subscription_status: row.subscription_status,
        trial_ends_at:       row.trial_ends_at,
        provider:            row.provider,
        location_name:       row.location_name,
        external_location_id: row.external_location_id,
      },
    });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load summary" },
      { status: 500 }
    );
  }
}
