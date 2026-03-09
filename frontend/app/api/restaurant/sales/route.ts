//app/api/restaurant/sales/route.ts
import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
}

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function severityFromMargin(marginPct: number | null): Severity {
  if (marginPct === null) return "good";
  if (marginPct < 50) return "risk";
  if (marginPct < 60) return "warn";
  return "good";
}

function severityFromDiscount(ratePct: number | null): Severity {
  if (ratePct === null) return "good";
  if (ratePct > 12) return "risk";
  if (ratePct > 8) return "warn";
  return "good";
}

function severityFromDelta(deltaPct: number | null): Severity {
  if (deltaPct === null) return "good";
  if (deltaPct < -5) return "risk";
  if (deltaPct < 0) return "warn";
  return "good";
}

function windowStartSql(windowCode: "7d" | "30d" | "90d" | "ytd") {
  if (windowCode === "7d") return `(current_date - interval '6 days')::date`;
  if (windowCode === "30d") return `(current_date - interval '29 days')::date`;
  if (windowCode === "90d") return `(current_date - interval '89 days')::date`;
  return `date_trunc('year', current_date)::date`;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const windowCode = parseWindow(url.searchParams);
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

      const startSql = windowStartSql(windowCode);

      // KPI summary from feature table
      const aggRes = await client.query(
        `
        with filtered as (
          select *
          from restaurant.f_location_daily_features
          where tenant_id = $1::uuid
            and day >= ${startSql}
            and location_id = any($2::bigint[])
            and ($3::bigint is null or location_id = $3::bigint)
        ),
        curr as (
          select
            coalesce(sum(revenue), 0)::numeric as revenue,
            coalesce(sum(orders), 0)::numeric as orders,
            coalesce(sum(customers), 0)::numeric as customers,
            coalesce(sum(gross_profit), 0)::numeric as gross_profit,
            coalesce(sum(cogs), 0)::numeric as cogs,
            coalesce(sum(labor), 0)::numeric as labor
          from filtered
        )
        select
          revenue,
          orders,
          customers,
          case when orders = 0 then 0 else round((revenue / orders)::numeric, 2) end as aov,
          case when revenue = 0 then 0 else round((gross_profit / revenue * 100)::numeric, 2) end as gross_margin_pct
        from curr
        `,
        [tenantId, allowedIds, locationId]
      );

      const prevRes = await client.query(
        `
        with bounds as (
          select
            ${startSql} as curr_start,
            current_date::date as curr_end
        ),
        prev_range as (
          select
            (curr_start - ((curr_end - curr_start) + 1))::date as prev_start,
            (curr_start - 1)::date as prev_end
          from bounds
        ),
        filtered as (
          select f.*
          from restaurant.f_location_daily_features f
          cross join prev_range p
          where f.tenant_id = $1::uuid
            and f.day between p.prev_start and p.prev_end
            and f.location_id = any($2::bigint[])
            and ($3::bigint is null or f.location_id = $3::bigint)
        ),
        prev as (
          select
            coalesce(sum(revenue), 0)::numeric as revenue,
            coalesce(sum(orders), 0)::numeric as orders,
            coalesce(sum(customers), 0)::numeric as customers,
            coalesce(sum(gross_profit), 0)::numeric as gross_profit
          from filtered
        )
        select
          revenue,
          orders,
          customers,
          case when orders = 0 then 0 else round((revenue / orders)::numeric, 2) end as aov,
          case when revenue = 0 then 0 else round((gross_profit / revenue * 100)::numeric, 2) end as gross_margin_pct
        from prev
        `,
        [tenantId, allowedIds, locationId]
      );

      const curr = aggRes.rows?.[0] ?? {};
      const prev = prevRes.rows?.[0] ?? {};

      // Discount rate from fact_order
      const discountRes = await client.query(
        `
        with curr_orders as (
          select
            coalesce(sum(discount_amount), 0)::numeric as discount_amount,
            coalesce(sum(gross_sales), 0)::numeric as gross_sales
          from restaurant.fact_order
          where tenant_id = $1::uuid
            and order_date >= ${startSql}
            and location_id = any($2::bigint[])
            and ($3::bigint is null or location_id = $3::bigint)
            and order_status = 'completed'
        ),
        prev_bounds as (
          select
            ${startSql} as curr_start,
            current_date::date as curr_end
        ),
        prev_range as (
          select
            (curr_start - ((curr_end - curr_start) + 1))::date as prev_start,
            (curr_start - 1)::date as prev_end
          from prev_bounds
        ),
        prev_orders as (
          select
            coalesce(sum(o.discount_amount), 0)::numeric as discount_amount,
            coalesce(sum(o.gross_sales), 0)::numeric as gross_sales
          from restaurant.fact_order o
          cross join prev_range p
          where o.tenant_id = $1::uuid
            and o.order_date between p.prev_start and p.prev_end
            and o.location_id = any($2::bigint[])
            and ($3::bigint is null or o.location_id = $3::bigint)
            and o.order_status = 'completed'
        )
        select
          case
            when c.gross_sales = 0 then 0
            else round((c.discount_amount / c.gross_sales * 100)::numeric, 2)
          end as discount_rate_pct,
          case
            when p.gross_sales = 0 then 0
            else round((p.discount_amount / p.gross_sales * 100)::numeric, 2)
          end as prev_discount_rate_pct
        from curr_orders c
        cross join prev_orders p
        `,
        [tenantId, allowedIds, locationId]
      );

      const disc = discountRes.rows?.[0] ?? {};

      function deltaPct(prevVal: any, currVal: any) {
        const p = Number(prevVal ?? 0);
        const c = Number(currVal ?? 0);
        if (!Number.isFinite(p) || p === 0 || !Number.isFinite(c)) return null;
        return Number((((c - p) / p) * 100).toFixed(2));
      }

      function deltaPp(prevVal: any, currVal: any) {
        const p = Number(prevVal ?? 0);
        const c = Number(currVal ?? 0);
        if (!Number.isFinite(p) || !Number.isFinite(c)) return null;
        return Number((c - p).toFixed(2));
      }

      const revenue = toNum(curr.revenue);
      const revenueDeltaPct = deltaPct(prev.revenue, curr.revenue);

      const orders = toNum(curr.orders);
      const ordersDeltaPct = deltaPct(prev.orders, curr.orders);

      const aov = toNum(curr.aov);
      const aovDeltaPct = deltaPct(prev.aov, curr.aov);

      const grossMarginPct = toNum(curr.gross_margin_pct);
      const grossMarginDeltaPp = deltaPp(prev.gross_margin_pct, curr.gross_margin_pct);

      const discountRatePct = toNum(disc.discount_rate_pct);
      const discountRateDeltaPp = deltaPp(disc.prev_discount_rate_pct, disc.discount_rate_pct);

      const kpis: Kpi[] = [
        {
          code: "SALES_REVENUE",
          label: `Revenue (${windowCode.toUpperCase()})`,
          value: revenue,
          unit: "usd",
          delta: revenueDeltaPct,
          severity: severityFromDelta(revenueDeltaPct),
          hint: "Total sales for selected window vs previous window.",
        },
        {
          code: "SALES_ORDERS",
          label: `Orders (${windowCode.toUpperCase()})`,
          value: orders,
          unit: "count",
          delta: ordersDeltaPct,
          severity: severityFromDelta(ordersDeltaPct),
          hint: "Orders for selected window vs previous window.",
        },
        {
          code: "SALES_AOV",
          label: "Average Order Value",
          value: aov,
          unit: "usd",
          delta: aovDeltaPct,
          severity: severityFromDelta(aovDeltaPct),
          hint: "AOV vs previous window.",
        },
        {
          code: "SALES_GROSS_MARGIN",
          label: "Gross Margin",
          value: grossMarginPct,
          unit: "pct",
          delta: grossMarginDeltaPp,
          severity: severityFromMargin(grossMarginPct),
          hint: "Gross margin % and change (pp) vs previous window.",
        },
        {
          code: "SALES_DISCOUNT_RATE",
          label: "Discount Rate",
          value: discountRatePct,
          unit: "pct",
          delta: discountRateDeltaPp,
          severity: severityFromDiscount(discountRatePct),
          hint: "Discount rate % and change (pp) vs previous window.",
        },
      ];

      // Daily series from feature table
      const seriesRes = await client.query(
        `
        select
          day,
          coalesce(sum(revenue), 0)::numeric as revenue,
          coalesce(sum(orders), 0)::numeric as orders,
          case
            when coalesce(sum(orders), 0) = 0 then 0
            else round((sum(revenue) / sum(orders))::numeric, 2)
          end as aov,
          case
            when coalesce(sum(revenue), 0) = 0 then 0
            else round((sum(gross_profit) / sum(revenue) * 100)::numeric, 2)
          end as gross_margin_pct
        from restaurant.f_location_daily_features
        where tenant_id = $1::uuid
          and day >= ${startSql}
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
        group by day
        order by day
        `,
        [tenantId, allowedIds, locationId]
      );

      // Daily discount series from fact_order
      const discSeriesRes = await client.query(
        `
        select
          order_date as day,
          case
            when coalesce(sum(gross_sales), 0) = 0 then 0
            else round((sum(discount_amount) / sum(gross_sales) * 100)::numeric, 2)
          end as discount_rate_pct
        from restaurant.fact_order
        where tenant_id = $1::uuid
          and order_date >= ${startSql}
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
          and order_status = 'completed'
        group by order_date
        order by order_date
        `,
        [tenantId, allowedIds, locationId]
      );

      const seriesRows = seriesRes.rows ?? [];
      const discMap = new Map<string, number>();
      for (const r of discSeriesRes.rows ?? []) {
        discMap.set(String(r.day), Number(r.discount_rate_pct ?? 0));
      }

      const series = {
        day: seriesRows.map((r: any) => String(r.day)),
        revenue: seriesRows.map((r: any) => Number(r.revenue ?? 0)),
        orders: seriesRows.map((r: any) => Number(r.orders ?? 0)),
        aov: seriesRows.map((r: any) => toNum(r.aov)),
        gross_margin_pct: seriesRows.map((r: any) => toNum(r.gross_margin_pct)),
        discount_rate_pct: seriesRows.map((r: any) => discMap.get(String(r.day)) ?? 0),
      };

      // Top items
      const topItemsRes = await client.query(
        `
        select
          m.item_name,
          sum(oi.quantity)::int as quantity,
          round(sum(oi.line_revenue)::numeric, 2) as revenue,
          round(
            (
              sum(oi.line_revenue)
              / nullif(
                  sum(sum(oi.line_revenue)) over (),
                  0
                )
            * 100
            )::numeric,
            2
          ) as share_pct
        from restaurant.fact_order_item oi
        join restaurant.fact_order o
          on o.order_id = oi.order_id
        join restaurant.dim_menu_item m
          on m.menu_item_id = oi.menu_item_id
        where oi.tenant_id = $1::uuid
          and o.order_date >= ${startSql}
          and oi.location_id = any($2::bigint[])
          and ($3::bigint is null or oi.location_id = $3::bigint)
          and o.order_status = 'completed'
        group by m.item_name
        order by revenue desc
        limit 10
        `,
        [tenantId, allowedIds, locationId]
      );

      // Category mix
      const categoryMixRes = await client.query(
        `
        select
          m.category,
          round(sum(oi.line_revenue)::numeric, 2) as revenue,
          round(
            (
              sum(oi.line_revenue)
              / nullif(
                  sum(sum(oi.line_revenue)) over (),
                  0
                )
            * 100
            )::numeric,
            2
          ) as share_pct
        from restaurant.fact_order_item oi
        join restaurant.fact_order o
          on o.order_id = oi.order_id
        join restaurant.dim_menu_item m
          on m.menu_item_id = oi.menu_item_id
        where oi.tenant_id = $1::uuid
          and o.order_date >= ${startSql}
          and oi.location_id = any($2::bigint[])
          and ($3::bigint is null or oi.location_id = $3::bigint)
          and o.order_status = 'completed'
        group by m.category
        order by revenue desc
        `,
        [tenantId, allowedIds, locationId]
      );

      // Channel mix
      const channelMixRes = await client.query(
        `
        select
          o.order_channel,
          round(sum(o.net_sales)::numeric, 2) as revenue,
          round(
            (
              sum(o.net_sales)
              / nullif(
                  sum(sum(o.net_sales)) over (),
                  0
                )
            * 100
            )::numeric,
            2
          ) as share_pct
        from restaurant.fact_order o
        where o.tenant_id = $1::uuid
          and o.order_date >= ${startSql}
          and o.location_id = any($2::bigint[])
          and ($3::bigint is null or o.location_id = $3::bigint)
          and o.order_status = 'completed'
        group by o.order_channel
        order by revenue desc
        `,
        [tenantId, allowedIds, locationId]
      );

      return {
        status: 200,
        body: {
          ok: true,
          as_of: refreshedAt,
          refreshed_at: refreshedAt,
          window: windowCode,
          location: {
            id: locationId ?? "all",
            name: locationId ? String(locationId) : "All Locations",
          },
          kpis,
          series,
          top_items: (topItemsRes.rows ?? []).map((r: any) => ({
            item_name: String(r.item_name),
            quantity: String(r.quantity),
            revenue: String(r.revenue),
            share_pct: String(r.share_pct),
          })),
          category_mix: (categoryMixRes.rows ?? []).map((r: any) => ({
            category: String(r.category),
            revenue: String(r.revenue),
            share_pct: String(r.share_pct),
          })),
          channel_mix: (channelMixRes.rows ?? []).map((r: any) => ({
            order_channel: String(r.order_channel),
            revenue: String(r.revenue),
            share_pct: String(r.share_pct),
          })),
          raw: {
            current_window: curr,
            previous_window: prev,
            series_rows: seriesRows.length,
            top_items_rows: topItemsRes.rows?.length ?? 0,
            category_rows: categoryMixRes.rows?.length ?? 0,
            channel_rows: channelMixRes.rows?.length ?? 0,
          },
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "sales route error",
      },
      { status: 500 }
    );
  }
}

  