// app/api/restaurant/sales/route.ts
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

      const seriesRes = await client.query(
        `
        select
          day,
          coalesce(sum(revenue),0)::numeric as revenue,
          coalesce(sum(orders),0)::numeric as orders,
          case
            when coalesce(sum(orders),0)=0 then 0
            else round((sum(revenue)/sum(orders))::numeric,2)
          end as aov,
          case
            when coalesce(sum(revenue),0)=0 then 0
            else round((sum(gross_profit)/sum(revenue)*100)::numeric,2)
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

      const seriesRows = seriesRes.rows ?? [];
      const hasData = seriesRows.length > 0;

      let revenue = null;
      let orders = null;
      let aov = null;
      let grossMarginPct = null;
      let discountRatePct = null;

      if (hasData) {

        const aggRes = await client.query(
          `
          select
          sum(revenue)::numeric as revenue,
          sum(orders)::numeric as orders,
          case when sum(orders)=0 then 0 else round(sum(revenue)/sum(orders),2) end as aov,
          case when sum(revenue)=0 then 0 else round(sum(gross_profit)/sum(revenue)*100,2) end as gross_margin_pct
          from restaurant.f_location_daily_features
          where tenant_id = $1::uuid
          and day >= ${startSql}
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
          `,
          [tenantId, allowedIds, locationId]
        );

        const curr = aggRes.rows?.[0] ?? {};

        revenue = toNum(curr.revenue);
        orders = toNum(curr.orders);
        aov = toNum(curr.aov);
        grossMarginPct = toNum(curr.gross_margin_pct);

        const discountRes = await client.query(
          `
          select
          case when sum(gross_sales)=0 then 0
          else round(sum(discount_amount)/sum(gross_sales)*100,2)
          end as discount_rate_pct
          from restaurant.fact_order
          where tenant_id = $1::uuid
          and order_date >= ${startSql}
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
          and order_status='completed'
          `,
          [tenantId, allowedIds, locationId]
        );

        discountRatePct = toNum(discountRes.rows?.[0]?.discount_rate_pct);
      }

      const kpis: Kpi[] = [
        {
          code: "SALES_REVENUE",
          label: `Revenue (${windowCode.toUpperCase()})`,
          value: revenue,
          unit: "usd",
          severity: hasData ? severityFromDelta(null) : undefined,
          hint: hasData
            ? "Total sales for selected window."
            : "No data available yet for this tenant.",
        },
        {
          code: "SALES_ORDERS",
          label: `Orders (${windowCode.toUpperCase()})`,
          value: orders,
          unit: "count",
          severity: hasData ? severityFromDelta(null) : undefined,
          hint: hasData
            ? "Orders for selected window."
            : "No data available yet.",
        },
        {
          code: "SALES_AOV",
          label: "Average Order Value",
          value: aov,
          unit: "usd",
          severity: hasData ? severityFromDelta(null) : undefined,
          hint: hasData ? "Average order value." : "No data available yet.",
        },
        {
          code: "SALES_GROSS_MARGIN",
          label: "Gross Margin",
          value: grossMarginPct,
          unit: "pct",
          severity: hasData ? severityFromMargin(grossMarginPct) : undefined,
          hint: hasData ? "Gross margin %." : "No data available yet.",
        },
        {
          code: "SALES_DISCOUNT_RATE",
          label: "Discount Rate",
          value: discountRatePct,
          unit: "pct",
          severity: hasData ? severityFromDiscount(discountRatePct) : undefined,
          hint: hasData ? "Discount rate %." : "No data available yet.",
        },
      ];

      const series = {
        day: seriesRows.map((r: any) => String(r.day)),
        revenue: seriesRows.map((r: any) => Number(r.revenue ?? 0)),
        orders: seriesRows.map((r: any) => Number(r.orders ?? 0)),
        aov: seriesRows.map((r: any) => toNum(r.aov)),
        gross_margin_pct: seriesRows.map((r: any) => toNum(r.gross_margin_pct)),
      };

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
          raw: {
            has_data: hasData,
            series_rows: seriesRows.length,
          },
        },
      };

    });

    return NextResponse.json(result.body, { status: result.status });

  } catch (e: any) {

    return NextResponse.json(
      { ok: false, error: e?.message ?? "sales route error" },
      { status: 500 }
    );

  }
}