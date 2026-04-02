import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getCurrentTenantIdForUser(userId: string): Promise<string | null> {
  const tenantRes = await pool.query(
    `
    select tenant_id
    from app.v_user_current_tenant
    where user_id = $1::uuid
    limit 1
    `,
    [userId]
  );

  if (tenantRes.rowCount === 0) return null;
  return tenantRes.rows[0]?.tenant_id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantIdForUser(user.user_id);

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not resolved" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const day = searchParams.get("day");
    const limitRaw = searchParams.get("limit") ?? "100";
    const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 100, 500));

    if (!day) {
      return NextResponse.json(
        { error: "Missing required query param: day" },
        { status: 400 }
      );
    }

    const res = await pool.query(
      `
      select
        tenant_id,
        location_id,
        location_name,
        day,
        revenue,
        orders,
        customers,
        new_customers,
        gross_profit,
        gross_margin,
        food_cost_pct,
        labor_cost_pct,
        prime_cost,
        prime_cost_pct,
        aov,
        revenue_per_customer,
        contribution_margin,
        contribution_margin_pct,
        dio,
        ar_days,
        ap_days,
        cash_conversion_cycle,
        sales_last_7d_avg,
        sales_last_14d_avg,
        gross_margin_last_7d_avg,
        food_cost_last_7d_avg,
        labor_cost_last_7d_avg,
        ebit
      from restaurant.f_location_daily_features
      where tenant_id = $1::uuid
        and day = $2::date
      order by location_name, location_id
      limit $3
      `,
      [tenantId, day, limit]
    );

    return NextResponse.json(
      {
        ok: true,
        tenant_id: tenantId,
        day,
        count: res.rowCount,
        rows: res.rows,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch control tower data" },
      { status: 500 }
    );
  }
}