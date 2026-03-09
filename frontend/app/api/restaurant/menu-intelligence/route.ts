// app/api/restaurant/menu-intelligence/route.ts
import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationId = parseLocationId(url.searchParams);

    const result = await withTenant(async ({ client, tenantId }) => {
      const allowedRes = await client.query(
        `
        select distinct tl.location_id::bigint as location_id
        from app.tenant_location tl
        where tl.tenant_id = $1::uuid
          and tl.is_active = true
        order by 1
        `,
        [tenantId]
      );

      const allowedIds = allowedRes.rows
        .map((r: any) => Number(r.location_id))
        .filter(Number.isFinite);

      if (allowedIds.length === 0) {
        return {
          status: 403,
          body: { ok: false, error: "No locations assigned to this tenant yet" },
        };
      }

      if (locationId !== null && !allowedIds.includes(locationId)) {
        return {
          status: 403,
          body: { ok: false, error: "Forbidden location" },
        };
      }

   const whereSql =
   locationId === null
    ? `tenant_id = $1::uuid`
    : `tenant_id = $1::uuid and location_id = $2::bigint`;

    const params =
    locationId === null
        ? [tenantId]
        : [tenantId, locationId];
    
    const sourceView =
    locationId === null
        ? "restaurant.v_menu_item_performance_30d_all_locations"
        : "restaurant.v_menu_item_performance_30d";

      const summaryRes = await client.query(
        `
        select
          engineering_bucket,
          count(*)::int as item_count,
          round(sum(revenue)::numeric, 2) as revenue,
          round(sum(gross_profit)::numeric, 2) as gross_profit
        from restaurant.v_menu_item_performance_30d
        where ${whereSql}
        group by engineering_bucket
        order by engineering_bucket
        `,
        params
      );

      const topItemsRes = await client.query(
        `
        select
          item_name,
          category,
          quantity_sold,
          revenue,
          gross_profit,
          margin_per_unit,
          engineering_bucket
        from restaurant.v_menu_item_performance_30d
        where ${whereSql}
        order by revenue desc
        limit 12
        `,
        params
      );

      const marginItemsRes = await client.query(
        `
        select
          item_name,
          category,
          quantity_sold,
          revenue,
          gross_profit,
          margin_per_unit,
          engineering_bucket
        from restaurant.v_menu_item_performance_30d
        where ${whereSql}
        order by margin_per_unit desc, gross_profit desc
        limit 12
        `,
        params
      );

      const categoryRes = await client.query(
        `
        select
          category,
          round(sum(quantity_sold)::numeric, 0) as quantity_sold,
          round(sum(revenue)::numeric, 2) as revenue,
          round(sum(gross_profit)::numeric, 2) as gross_profit
        from restaurant.v_menu_item_performance_30d
        where ${whereSql}
        group by category
        order by revenue desc
        `,
        params
      );

    const matrixPointsRes = await client.query(
    `
        with base as (
        select
            item_name,
            category,
            quantity_sold,
            revenue,
            gross_profit,
            margin_per_unit,
            engineering_bucket
        from ${sourceView}
        where ${whereSql}
        ),
        bm as (
        select
            avg(quantity_sold)::numeric as avg_qty,
            avg(margin_per_unit)::numeric as avg_margin
        from base
        )
        select
        b.item_name,
        b.category,
        b.quantity_sold,
        b.revenue,
        b.gross_profit,
        b.margin_per_unit,
        b.engineering_bucket,
        bm.avg_qty,
        bm.avg_margin
        from base b
        cross join bm
        order by b.quantity_sold desc
        `,
        params
        );

      return {
        status: 200,
        body: {
            ok: true,
            location: { id: locationId ?? "all" },
            matrix_summary: summaryRes.rows ?? [],
            top_items: topItemsRes.rows ?? [],
            top_margin_items: marginItemsRes.rows ?? [],
            category_performance: categoryRes.rows ?? [],
            matrix_points: matrixPointsRes.rows ?? []
        },
        };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "menu intelligence route error" },
      { status: 500 }
    );
  }
}