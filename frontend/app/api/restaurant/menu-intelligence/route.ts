// app/api/restaurant/menu-intelligence/route.ts
import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw || raw.trim().toLowerCase() === "all") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

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
          status: 200,
          body: {
            ok: true,
            refreshed_at: refreshedAt,
            has_data: false,
            location: { id: locationId ?? "all" },
            matrix_summary: [],
            top_items: [],
            top_margin_items: [],
            category_performance: [],
            matrix_points: [],
            notes: "No locations are assigned to this tenant yet.",
          },
        };
      }

      if (locationId !== null && !allowedIds.includes(locationId)) {
        return {
          status: 403,
          body: { ok: false, error: "Forbidden location" },
        };
      }

      const sourceView =
        locationId === null
          ? "restaurant.v_menu_item_performance_30d_all_locations"
          : "restaurant.v_menu_item_performance_30d";

      const whereSql =
        locationId === null
          ? `tenant_id = $1::uuid`
          : `tenant_id = $1::uuid and location_id = $2::bigint`;

      const params = locationId === null ? [tenantId] : [tenantId, locationId];

      // Fast short-circuit: avoid heavy JSON aggregation if there is no data
      const existsRes = await client.query(
        `
        select exists (
          select 1
          from ${sourceView}
          where ${whereSql}
          limit 1
        ) as has_data
        `,
        params
      );

      const hasData = Boolean(existsRes.rows?.[0]?.has_data);

      if (!hasData) {
        return {
          status: 200,
          body: {
            ok: true,
            refreshed_at: refreshedAt,
            has_data: false,
            location: { id: locationId ?? "all" },
            matrix_summary: [],
            top_items: [],
            top_margin_items: [],
            category_performance: [],
            matrix_points: [],
            notes: "No menu intelligence data available for this selection yet.",
          },
        };
      }

      const baseRes = await client.query(
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
        ),
        matrix_summary as (
          select
            engineering_bucket,
            count(*)::int as item_count,
            round(sum(revenue)::numeric, 2) as revenue,
            round(sum(gross_profit)::numeric, 2) as gross_profit
          from base
          group by engineering_bucket
        ),
        top_items as (
          select
            item_name,
            category,
            quantity_sold,
            revenue,
            gross_profit,
            margin_per_unit,
            engineering_bucket
          from base
          order by revenue desc nulls last
          limit 12
        ),
        top_margin_items as (
          select
            item_name,
            category,
            quantity_sold,
            revenue,
            gross_profit,
            margin_per_unit,
            engineering_bucket
          from base
          order by margin_per_unit desc nulls last, gross_profit desc nulls last
          limit 12
        ),
        category_performance as (
          select
            category,
            round(sum(quantity_sold)::numeric, 0) as quantity_sold,
            round(sum(revenue)::numeric, 2) as revenue,
            round(sum(gross_profit)::numeric, 2) as gross_profit
          from base
          group by category
          order by revenue desc nulls last
        ),
        matrix_points as (
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
          order by b.quantity_sold desc nulls last
        )
        select json_build_object(
          'matrix_summary', coalesce((select json_agg(ms order by ms.engineering_bucket) from matrix_summary ms), '[]'::json),
          'top_items', coalesce((select json_agg(ti order by ti.revenue desc) from top_items ti), '[]'::json),
          'top_margin_items', coalesce((select json_agg(tmi order by tmi.margin_per_unit desc, tmi.gross_profit desc) from top_margin_items tmi), '[]'::json),
          'category_performance', coalesce((select json_agg(cp order by cp.revenue desc) from category_performance cp), '[]'::json),
          'matrix_points', coalesce((select json_agg(mp order by mp.quantity_sold desc) from matrix_points mp), '[]'::json)
        ) as payload
        `,
        params
      );

      const payload = baseRes.rows?.[0]?.payload ?? {
        matrix_summary: [],
        top_items: [],
        top_margin_items: [],
        category_performance: [],
        matrix_points: [],
      };

      return {
        status: 200,
        body: {
          ok: true,
          refreshed_at: refreshedAt,
          has_data: true,
          location: { id: locationId ?? "all" },
          matrix_summary: payload.matrix_summary ?? [],
          top_items: payload.top_items ?? [],
          top_margin_items: payload.top_margin_items ?? [],
          category_performance: payload.category_performance ?? [],
          matrix_points: payload.matrix_points ?? [],
        },
      };
    });

    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "menu intelligence route error",
        has_data: false,
        matrix_summary: [],
        top_items: [],
        top_margin_items: [],
        category_performance: [],
        matrix_points: [],
      },
      { status: 500 }
    );
  }
}