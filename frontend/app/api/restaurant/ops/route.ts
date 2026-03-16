//frontend/app/api/restaurant/ops/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";


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

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
}

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "all") return null;
  const n = Number(raw.trim());
  return Number.isInteger(n) ? n : null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pctDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null || prevVal === 0) return null;
  return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
}

function ppDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null) return null;
  return Number((currVal - prevVal).toFixed(2));
}

function severityFromNegativeDelta(delta: number | null): Severity {
  if (delta === null) return "good";
  if (delta < -10) return "risk";
  if (delta < 0) return "warn";
  return "good";
}

function severityFromHigherIsBad(value: number | null, warnAt: number, riskAt: number): Severity {
  if (value === null) return "good";
  if (value >= riskAt) return "risk";
  if (value >= warnAt) return "warn";
  return "good";
}

function windowDays(windowCode: "7d" | "30d" | "90d" | "ytd", asOfDate: Date): number {
  if (windowCode === "7d") return 7;
  if (windowCode === "30d") return 30;
  if (windowCode === "90d") return 90;
  const yearStart = new Date(Date.UTC(asOfDate.getUTCFullYear(), 0, 1));
  const diffMs = asOfDate.getTime() - yearStart.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

    const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const tenantRes = await pool.query(
    `
    select tenant_id
    from app.tenant_user
    where user_id = $1::uuid
    order by created_at asc
    limit 1
    `,
    [user.user_id]
  );

  const tenantId = tenantRes.rows?.[0]?.tenant_id;

  if (!tenantId) {
    return NextResponse.json(
      {
        ok: true,
        as_of: null,
        refreshed_at: refreshedAt,
        window: "30d",
        location: { id: "all", name: "All Locations" },
        kpis: [],
        series: {
          day: [],
          ORDERS: [],
          CUSTOMERS: [],
          AOV: [],
          REVENUE_PER_CUSTOMER: [],
          REVENUE: [],
          LABOR_PCT: [],
          OVERTIME_PCT: [],
          DIOH: [],
          WASTE_PCT: [],
        },
        location_summary: [],
        alerts: [],
        actions: [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const url = new URL(req.url);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    let asOf = parseAsOf(url.searchParams);
    if (!asOf) {
      const anchorSql = locationId
        ? `
          select max(day)::timestamptz as as_of_ts
          from restaurant.f_location_daily_features
          where tenant_id = $1::uuid
            and location_id = $2::bigint
        `
        : `
          select max(day)::timestamptz as as_of_ts
          from restaurant.f_location_daily_features
          where tenant_id = $1::uuid
        `;

      const r = await pool.query(
        anchorSql,
        locationId ? [tenantId, locationId] : [tenantId]
      );

      const ts = r.rows?.[0]?.as_of_ts;
      asOf = ts ? new Date(ts).toISOString() : null;
    }

    if (!asOf) {
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          window: windowCode,
          location: { id: locationId ?? "all", name: locationId ? `Location ${locationId}` : "All Locations" },
          kpis: [],
          series: {
            day: [],
            LABOR_PCT: [],
            OVERTIME_PCT: [],
            DIOH: [],
            WASTE_PCT: [],
          },
          alerts: [],
          actions: [],
          raw: { anchor_missing: true },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const asOfDate = new Date(asOf);
    const days = windowDays(windowCode, asOfDate);

    const currRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      curr as (
        select f.*
        from restaurant.f_location_daily_features f
        cross join params p
        where f.tenant_id = $4::uuid
          and f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(orders), 0)::numeric as orders,
        coalesce(sum(customers), 0)::numeric as customers,
        coalesce(avg(revenue), 0)::numeric as avg_daily_revenue,
        coalesce(avg(orders), 0)::numeric as avg_daily_orders,
        coalesce(avg(avg_inventory), 0)::numeric as avg_inventory,
        coalesce(avg(dio), 0)::numeric as dioh,
        coalesce(avg(ar_days), 0)::numeric as ar_days,
        coalesce(avg(ap_days), 0)::numeric as ap_days,
        coalesce(avg(cash_conversion_cycle), 0)::numeric as ccc,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        coalesce(sum(labor), 0)::numeric as labor_cost
      from curr
      `,
      [asOf, days, locationId, tenantId]
    );

    const prevRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      bounds as (
        select
          (as_of_day - (n_days - 1))::date as curr_start,
          as_of_day::date as curr_end,
          n_days,
          p_location
        from params
      ),
      prev_range as (
        select
          (curr_start - n_days)::date as prev_start,
          (curr_start - 1)::date as prev_end,
          p_location
        from bounds
      ),
      prev as (
        select f.*
        from restaurant.f_location_daily_features f
        cross join prev_range p
        where f.tenant_id = $4::uuid
          and f.day between p.prev_start and p.prev_end
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(orders), 0)::numeric as orders,
        coalesce(sum(customers), 0)::numeric as customers,
        coalesce(avg(revenue), 0)::numeric as avg_daily_revenue,
        coalesce(avg(orders), 0)::numeric as avg_daily_orders,
        coalesce(avg(avg_inventory), 0)::numeric as avg_inventory,
       coalesce(avg(dio), 0)::numeric as dioh,
        coalesce(avg(ar_days), 0)::numeric as ar_days,
        coalesce(avg(ap_days), 0)::numeric as ap_days,
        coalesce(avg(cash_conversion_cycle), 0)::numeric as ccc,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        coalesce(sum(labor), 0)::numeric as labor_cost
      from prev
      `,
      [asOf, days, locationId, tenantId]
    );

    const curr = currRes.rows?.[0] ?? {};
    const prev = prevRes.rows?.[0] ?? {};

    const revenue = toNum(curr.revenue);
    const orders = toNum(curr.orders);
    const customers = toNum(curr.customers);

    const aov =
      orders && orders > 0 && revenue !== null ? Number((revenue / orders).toFixed(2)) : 0;

    const revenuePerCustomer =
      customers && customers > 0 && revenue !== null
        ? Number((revenue / customers).toFixed(2))
        : 0;

    const avgDailyOrders = toNum(curr.avg_daily_orders);
    const avgDailyRevenue = toNum(curr.avg_daily_revenue);

    const laborPct = toNum(curr.labor_pct);
    const laborCost = toNum(curr.labor_cost);

    const laborHours =
      laborCost !== null ? Number((laborCost / 22).toFixed(2)) : 0;

    const avgHourlyRate =
      laborHours > 0 && laborCost !== null ? Number((laborCost / laborHours).toFixed(2)) : 22;

    const salesPerLaborHour =
      laborHours > 0 && revenue !== null ? Number((revenue / laborHours).toFixed(2)) : 0;

    const dioh = toNum(curr.dioh);
    const avgInventory = toNum(curr.avg_inventory);
    const ccc = toNum(curr.ccc);
    const apDays = toNum(curr.ap_days);

    const prevRevenue = toNum(prev.revenue);
    const prevOrders = toNum(prev.orders);
    const prevCustomers = toNum(prev.customers);
    const wastePct = toNum(curr.waste_pct);

    const prevAov =
      prevOrders && prevOrders > 0 && prevRevenue !== null
        ? prevRevenue / prevOrders
        : null;

    const prevRpc =
      prevCustomers && prevCustomers > 0 && prevRevenue !== null
        ? prevRevenue / prevCustomers
        : null;

    const kpis: Kpi[] = [
      {
        code: "OPS_ORDERS",
        label: `Orders (${windowCode.toUpperCase()})`,
        value: orders,
        unit: "count",
        delta: pctDelta(prevOrders, orders),
        severity: severityFromNegativeDelta(pctDelta(prevOrders, orders)),
        hint: "Total orders in selected window.",
      },
      {
        code: "OPS_CUSTOMERS",
        label: `Customers (${windowCode.toUpperCase()})`,
        value: customers,
        unit: "count",
        delta: pctDelta(prevCustomers, customers),
        severity: severityFromNegativeDelta(pctDelta(prevCustomers, customers)),
        hint: "Total customers in selected window.",
      },
      {
        code: "OPS_AOV",
        label: "AOV",
        value: aov,
        unit: "usd",
        delta: pctDelta(prevAov, aov),
        severity: severityFromNegativeDelta(pctDelta(prevAov, aov)),
        hint: "Average order value.",
      },
      {
        code: "OPS_REVENUE_PER_CUSTOMER",
        label: "Revenue / Customer",
        value: revenuePerCustomer,
        unit: "usd",
        delta: pctDelta(prevRpc, revenuePerCustomer),
        severity: severityFromNegativeDelta(pctDelta(prevRpc, revenuePerCustomer)),
        hint: "Revenue per customer.",
      },
      {
        code: "OPS_AVG_DAILY_ORDERS",
        label: "Avg Daily Orders",
        value: avgDailyOrders,
        unit: "count",
        delta: pctDelta(toNum(prev.avg_daily_orders), avgDailyOrders),
        severity: severityFromNegativeDelta(pctDelta(toNum(prev.avg_daily_orders), avgDailyOrders)),
        hint: "Average orders per day.",
      },
      {
        code: "OPS_AVG_DAILY_REVENUE",
        label: "Avg Daily Revenue",
        value: avgDailyRevenue,
        unit: "usd",
        delta: pctDelta(toNum(prev.avg_daily_revenue), avgDailyRevenue),
        severity: severityFromNegativeDelta(pctDelta(toNum(prev.avg_daily_revenue), avgDailyRevenue)),
        hint: "Average revenue per day.",
      },
      {
        code: "OPS_LABOR_RATIO",
        label: "Labor %",
        value: laborPct,
        unit: "pct",
        delta: ppDelta(toNum(prev.labor_pct), laborPct),
        severity: severityFromHigherIsBad(laborPct, 28, 34),
        hint: "Labor cost as % of revenue.",
      },
      {
        code: "OPS_LABOR_COST",
        label: "Labor Cost",
        value: laborCost,
        unit: "usd",
        delta: pctDelta(toNum(prev.labor_cost), laborCost),
        severity: severityFromHigherIsBad(laborPct, 28, 34),
        hint: "Total labor cost in selected window.",
      },
      {
        code: "OPS_LABOR_HOURS",
        label: "Labor Hours",
        value: laborHours,
        unit: "count",
        delta: null,
        severity: "good",
        hint: "Estimated labor hours (demo).",
      },
      {
        code: "OPS_AVG_HOURLY_RATE",
        label: "Avg Hourly Rate",
        value: avgHourlyRate,
        unit: "usd",
        delta: null,
        severity: "good",
        hint: "Estimated hourly labor rate (demo).",
      },
      {
        code: "OPS_SALES_PER_LABOR_HOUR",
        label: "Sales / Labor Hour",
        value: salesPerLaborHour,
        unit: "usd",
        delta: null,
        severity: "good",
        hint: "Revenue generated per labor hour.",
      },
      {
        code: "OPS_DIH",
        label: "Days Inventory on Hand",
        value: dioh,
        unit: "days",
        delta: ppDelta(toNum(prev.dioh), dioh),
        severity: severityFromHigherIsBad(dioh, 35, 50),
        hint: "Average inventory days on hand.",
      },
      {
        code: "OPS_INV_TURNS",
        label: "Inventory Turns",
        value: dioh && dioh > 0 ? Number((365 / dioh).toFixed(2)) : 0,
        unit: "ratio",
        delta: null,
        severity: "good",
        hint: "Annualized inventory turns.",
      },
      {
        code: "OPS_AVG_INVENTORY",
        label: "Avg Inventory",
        value: avgInventory,
        unit: "usd",
        delta: pctDelta(toNum(prev.avg_inventory), avgInventory),
        severity: "good",
        hint: "Average inventory value.",
      },
      {
        code: "OPS_CCC",
        label: "Cash Conversion Cycle",
        value: ccc,
        unit: "days",
        delta: ppDelta(toNum(prev.ccc), ccc),
        severity: severityFromHigherIsBad(ccc, 30, 45),
        hint: "Cash conversion cycle.",
      },
      {
        code: "OPS_AP_DAYS",
        label: "AP Days",
        value: apDays,
        unit: "days",
        delta: ppDelta(toNum(prev.ap_days), apDays),
        severity: "good",
        hint: "Average payables days.",
      },
    ];

    const seriesRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      curr as (
        select f.*
        from restaurant.f_location_daily_features f
        cross join params p
        where f.tenant_id = $4::uuid
          and f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        day,
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(orders), 0)::numeric as orders,
        coalesce(sum(customers), 0)::numeric as customers,
        case when coalesce(sum(orders), 0) = 0 then 0
             else round((sum(revenue) / sum(orders))::numeric, 2)
        end as aov,
        case when coalesce(sum(customers), 0) = 0 then 0
             else round((sum(revenue) / sum(customers))::numeric, 2)
        end as revenue_per_customer,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        0::numeric as overtime_pct,
        coalesce(avg(dio), 0)::numeric as dioh,
       coalesce(avg(waste_pct),0)::numeric as waste_pct
      from curr
      group by day
      order by day
      `,
      [asOf, days, locationId, tenantId]
    );

    const rows = seriesRes.rows ?? [];

    const locationSummaryRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      curr as (
        select f.*
        from restaurant.f_location_daily_features f
        cross join params p
        where f.tenant_id = $4::uuid
          and f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        dl.location_id,
        dl.location_name,
        round(coalesce(sum(curr.revenue), 0)::numeric, 2) as revenue,
        coalesce(sum(curr.orders), 0)::int as orders,
        coalesce(sum(curr.customers), 0)::int as customers,
        case when coalesce(sum(curr.orders), 0) = 0 then 0
             else round((sum(curr.revenue) / sum(curr.orders))::numeric, 2)
        end as aov,
        case when coalesce(sum(curr.customers), 0) = 0 then 0
             else round((sum(curr.revenue) / sum(curr.customers))::numeric, 2)
        end as revenue_per_customer
      from curr
      join restaurant.dim_location dl
        on dl.location_id = curr.location_id
      group by dl.location_id, dl.location_name
      order by revenue desc
      `,
      [asOf, days, locationId, tenantId]
    );

    const alerts: any[] = [
    ...(laborPct !== null && laborPct >= 28
      ? [
          {
            id: "ops_labor_pct",
            severity: laborPct >= 34 ? "risk" : "warn",
            title: "Labor cost ratio is elevated",
            detail: `Labor is ${laborPct.toFixed(1)}% of revenue.`,
          },
        ]
      : []),

    ...(dioh !== null && dioh >= 35
      ? [
          {
            id: "ops_dioh",
            severity: dioh >= 50 ? "risk" : "warn",
            title: "Inventory days on hand is elevated",
            detail: `DIOH is ${dioh.toFixed(1)} days.`,
          },
        ]
      : []),

    ...(ccc !== null && ccc >= 30
      ? [
          {
            id: "ops_ccc",
            severity: ccc >= 45 ? "risk" : "warn",
            title: "Cash conversion cycle is elevated",
            detail: `CCC is ${ccc.toFixed(1)} days.`,
          },
        ]
      : []),

    ...(wastePct !== null && wastePct >= 2
      ? [
          {
            id: "ops_waste_pct",
            severity: wastePct >= 4 ? "risk" : "warn",
            title: "Waste % is elevated",
            detail: `Waste is ${wastePct.toFixed(1)}% of sales.`,
          },
        ]
      : []),
  ];

  const actions: any[] = [
    ...(laborPct !== null && laborPct >= 28
      ? [
          {
            id: "act_labor_tighten",
            priority: 1,
            title: "Tighten labor scheduling",
            rationale: "Reduce off-peak coverage and align staffing more closely to demand.",
            owner: "GM",
          },
        ]
      : []),

    ...(dioh !== null && dioh >= 35
      ? [
          {
            id: "act_inventory_reduce",
            priority: 2,
            title: "Reduce inventory exposure",
            rationale: "Trim next purchase orders and reduce pars on slower-moving stock.",
            owner: "Purchasing",
          },
        ]
      : []),

    ...(ccc !== null && ccc >= 30
      ? [
          {
            id: "act_ccc_release_cash",
            priority: 3,
            title: "Release cash from working capital",
            rationale: "Lower inventory days and review receivable/payable timing.",
            owner: "Finance / Ops",
          },
        ]
      : []),
  ].slice(0, 3);

  /* Fallback action so panel never looks empty */
  if (actions.length < 3 && salesPerLaborHour !== null && salesPerLaborHour < 130) {
    actions.push({
      id: "act_labor_productivity",
      priority: 3,
      title: "Improve labor productivity",
      rationale: "Review deployment by shift and tighten staffing during low-demand periods.",
      owner: "Operations",
    });
  }

    return NextResponse.json(
      {
        ok: true,
        as_of: asOf,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: {
          id: locationId ?? "all",
          name: locationId ? `Location ${locationId}` : "All Locations",
        },
        kpis,
        series: {
          day: rows.map((r: any) => String(r.day)),
          ORDERS: rows.map((r: any) => Number(r.orders ?? 0)),
          CUSTOMERS: rows.map((r: any) => Number(r.customers ?? 0)),
          AOV: rows.map((r: any) => Number(r.aov ?? 0)),
          REVENUE_PER_CUSTOMER: rows.map((r: any) => Number(r.revenue_per_customer ?? 0)),
          REVENUE: rows.map((r: any) => Number(r.revenue ?? 0)),
          LABOR_PCT: rows.map((r: any) => Number(r.labor_pct ?? 0)),
          OVERTIME_PCT: rows.map((r: any) => Number(r.overtime_pct ?? 0)),
          DIOH: rows.map((r: any) => Number(r.dioh ?? 0)),
          WASTE_PCT: rows.map((r: any) => Number(r.waste_pct ?? 0)),
        },
        location_summary: locationSummaryRes.rows ?? [],
        alerts,
        actions,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/ops failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "ops route error" },
      { status: 500 }
    );
  }
}

