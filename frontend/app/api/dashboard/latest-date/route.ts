// frontend/app/api/dashboard/latest-date/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant_id for user
    const tenantRes = await pool.query(
      `
      SELECT tenant_id
      FROM app.tenant_user
      WHERE user_id = $1::uuid
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [user.user_id]
    );

    const tenantId = tenantRes.rows?.[0]?.tenant_id ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
    }

    // Get allowed location IDs for tenant
    const locRes = await pool.query(
      `
      SELECT location_id
      FROM app.tenant_location
      WHERE tenant_id = $1::uuid
        AND is_active = true
      `,
      [tenantId]
    );

    const locationIds = locRes.rows.map((r: any) => Number(r.location_id)).filter(Number.isFinite);

    if (locationIds.length === 0) {
      return NextResponse.json({ latest_date: null, has_data: false });
    }

    // Get latest date from Silver layer
    const dateRes = await pool.query(
      `
      SELECT LEAST(MAX(day), CURRENT_DATE)::text AS latest_date
      FROM restaurant.f_location_daily_features
      WHERE tenant_id = $1::uuid
        AND location_id = ANY($2::bigint[])
      `,
      [tenantId, locationIds]
    );

    const latest_date = dateRes.rows?.[0]?.latest_date ?? null;

    return NextResponse.json(
      { latest_date, has_data: !!latest_date },
      { headers: { "Cache-Control": "no-store" } }
    );

  } catch (e: any) {
    console.error("latest-date error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch latest date" },
      { status: 500 }
    );
  }
}
