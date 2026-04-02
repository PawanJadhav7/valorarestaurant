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
    const limitRaw = searchParams.get("limit") ?? "20";
    const limit = Math.max(1, Math.min(parseInt(limitRaw, 10) || 20, 100));

    if (!day) {
      return NextResponse.json(
        { error: "Missing required query param: day" },
        { status: 400 }
      );
    }

    const alertsRes = await pool.query(
      `
      with base as (
        select
          tenant_id,
          location_id,
          location_name,
          day,
          revenue,
          orders,
          gross_margin,
          food_cost_pct,
          labor_cost_pct,
          prime_cost_pct,
          aov,
          ebit,
          sales_last_7d_avg,
          gross_margin_last_7d_avg,
          food_cost_last_7d_avg,
          labor_cost_last_7d_avg
        from restaurant.f_location_daily_features
        where tenant_id = $1::uuid
          and day = $2::date
      )
      select *
      from (
        select
          'revenue_below_7d_avg'::text as alert_key,
          'medium'::text as severity,
          location_id,
          location_name,
          day,
          format(
            'Revenue %s is below 7-day average %s',
            to_char(revenue, 'FM999999990.00'),
            to_char(coalesce(sales_last_7d_avg, 0), 'FM999999990.00')
          ) as message,
          revenue as metric_value,
          sales_last_7d_avg as threshold_value
        from base
        where sales_last_7d_avg is not null
          and revenue < sales_last_7d_avg * 0.90

        union all

        select
          'food_cost_pct_high'::text as alert_key,
          'high'::text as severity,
          location_id,
          location_name,
          day,
          format(
            'Food cost %% %s is above trailing 7-day %s',
            to_char(food_cost_pct, 'FM999999990.0000'),
            to_char(coalesce(food_cost_last_7d_avg, 0), 'FM999999990.0000')
          ) as message,
          food_cost_pct as metric_value,
          food_cost_last_7d_avg as threshold_value
        from base
        where food_cost_last_7d_avg is not null
          and food_cost_pct > food_cost_last_7d_avg * 1.10

        union all

        select
          'labor_cost_pct_high'::text as alert_key,
          'high'::text as severity,
          location_id,
          location_name,
          day,
          format(
            'Labor cost %% %s is above trailing 7-day %s',
            to_char(labor_cost_pct, 'FM999999990.0000'),
            to_char(coalesce(labor_cost_last_7d_avg, 0), 'FM999999990.0000')
          ) as message,
          labor_cost_pct as metric_value,
          labor_cost_last_7d_avg as threshold_value
        from base
        where labor_cost_last_7d_avg is not null
          and labor_cost_pct > labor_cost_last_7d_avg * 1.10

        union all

        select
          'gross_margin_drop'::text as alert_key,
          'medium'::text as severity,
          location_id,
          location_name,
          day,
          format(
            'Gross margin %s is below trailing 7-day %s',
            to_char(gross_margin, 'FM999999990.0000'),
            to_char(coalesce(gross_margin_last_7d_avg, 0), 'FM999999990.0000')
          ) as message,
          gross_margin as metric_value,
          gross_margin_last_7d_avg as threshold_value
        from base
        where gross_margin_last_7d_avg is not null
          and gross_margin < gross_margin_last_7d_avg * 0.90

        union all

        select
          'negative_ebit'::text as alert_key,
          'high'::text as severity,
          location_id,
          location_name,
          day,
          format(
            'EBIT is negative at %s',
            to_char(ebit, 'FM999999990.00')
          ) as message,
          ebit as metric_value,
          0::numeric as threshold_value
        from base
        where ebit < 0
      ) a
      order by
        case severity
          when 'high' then 1
          when 'medium' then 2
          else 3
        end,
        location_name,
        alert_key
      limit $3
      `,
      [tenantId, day, limit]
    );

    return NextResponse.json(
      {
        ok: true,
        tenant_id: tenantId,
        day,
        count: alertsRes.rowCount,
        alerts: alertsRes.rows,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}