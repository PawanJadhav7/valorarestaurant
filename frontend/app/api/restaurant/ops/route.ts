// frontend/app/api/restaurant/ops/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function parseWindow(w: string): string {
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
}

function windowInterval(w: string): string {
  if (w === "7d")  return "6 days";
  if (w === "30d") return "29 days";
  if (w === "90d") return "89 days";
  return "364 days"; // ytd approx
}

function severity(code: string, value: number | null): "good" | "warn" | "risk" {
  if (value === null) return "good";
  switch (code) {
    case "OPS_LABOR_RATIO":
      if (value > 0.35) return "risk";
      if (value > 0.32) return "warn";
      return "good";
    case "OPS_WASTE_PCT":
      if (value > 0.05) return "risk";
      if (value > 0.03) return "warn";
      return "good";
    case "OPS_FOOD_COST_RATIO":
      if (value > 0.35) return "risk";
      if (value > 0.32) return "warn";
      return "good";
    case "OPS_PRIME_COST_RATIO":
      if (value > 0.65) return "risk";
      if (value > 0.62) return "warn";
      return "good";
    case "OPS_OVERTIME_PCT":
      if (value > 0.15) return "risk";
      if (value > 0.10) return "warn";
      return "good";
    default:
      return "good";
  }
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url    = new URL(req.url);
    const window = parseWindow(url.searchParams.get("window") ?? "30d");
    const dayParam = url.searchParams.get("day");
    const locationIdParam = url.searchParams.get("location_id");
    const locationId = locationIdParam ? parseInt(locationIdParam) : null;

    // Resolve tenant
    const tenantRes = await pool.query(
      `SELECT tenant_id FROM app.tenant_user
       WHERE user_id = $1::uuid ORDER BY created_at ASC LIMIT 1`,
      [user.user_id]
    );
    const tenantId = tenantRes.rows[0]?.tenant_id ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not resolved" }, { status: 403 });
    }

    // Resolve allowed locations
    const allowedRes = await pool.query(
      `SELECT DISTINCT dl.location_id
       FROM restaurant.dim_location dl
       JOIN app.tenant_location tl ON tl.location_id = dl.location_id
       WHERE dl.tenant_id = $1::uuid AND dl.is_active = true`,
      [tenantId]
    );
    const allowedIds = allowedRes.rows.map((r: any) => r.location_id);
    if (!allowedIds.length) {
      return NextResponse.json({ ok: true, kpis: [], series: {} });
    }

    // Anchor date
    const anchorRes = await pool.query(
      `SELECT COALESCE(MAX(day), CURRENT_DATE)::date AS anchor_day
       FROM analytics.v_gold_daily
       WHERE tenant_id = $1::uuid
         AND location_id = ANY($2::bigint[])
         AND ($3::bigint IS NULL OR location_id = $3::bigint)`,
      [tenantId, allowedIds, locationId]
    );
    const anchorDay = dayParam?.slice(0, 10) ??
      anchorRes.rows[0]?.anchor_day?.toISOString?.()?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);

    const interval = windowInterval(window);

    // ── Aggregate KPIs ────────────────────────────────────────
    const aggRes = await pool.query(
      `
      SELECT
        SUM(orders)::numeric                                          AS orders,
        SUM(customers)::numeric                                       AS customers,
        CASE WHEN SUM(orders) > 0
             THEN ROUND(SUM(revenue) / SUM(orders), 2) END           AS aov,
        CASE WHEN SUM(customers) > 0
             THEN ROUND(SUM(revenue) / SUM(customers), 2) END        AS rev_per_customer,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(labor) / SUM(revenue), 4) END            AS labor_ratio,
        ROUND(SUM(revenue) / NULLIF(COUNT(*), 0), 2)                 AS avg_daily_revenue,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(gross_profit) / SUM(revenue), 4) END     AS gross_margin,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(cogs) / SUM(revenue), 4) END             AS food_cost_ratio,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND((SUM(cogs) + SUM(labor)) / SUM(revenue), 4) END AS prime_cost_ratio,
        -- Labor hours estimate (revenue / $25/hr)
        ROUND(SUM(revenue) / 25.0, 1)                                AS labor_hours,
        -- Sales per labor hour
        CASE WHEN SUM(revenue) / 25.0 > 0
             THEN ROUND(SUM(revenue) / (SUM(revenue) / 25.0), 2) END AS sales_per_labor_hour,
        -- Overtime estimate (10% of labor hours)
        0.10                                                          AS overtime_pct,
        -- Inventory metrics
        ROUND(AVG(avg_inventory), 2)                                  AS avg_inventory,
        -- Waste (2% estimate)
        0.02                                                          AS waste_pct,
        -- Days inventory on hand
        CASE WHEN SUM(cogs) > 0
             THEN ROUND(AVG(avg_inventory) / (SUM(cogs) / COUNT(*)) * 1.0, 1) END AS dih,
        -- Inventory turns
        CASE WHEN AVG(avg_inventory) > 0
             THEN ROUND(SUM(cogs) / AVG(avg_inventory), 2) END       AS inv_turns
      FROM analytics.v_gold_daily
      WHERE tenant_id = $1::uuid
        AND day BETWEEN ($2::date - $3::interval) AND $2::date
        AND location_id = ANY($4::bigint[])
        AND ($5::bigint IS NULL OR location_id = $5::bigint)
      `,
      [tenantId, anchorDay, interval, allowedIds, locationId]
    );
    const agg = aggRes.rows[0] ?? {};

    // ── Series data ───────────────────────────────────────────
    const seriesRes = await pool.query(
      `
      SELECT
        day,
        SUM(orders)::numeric                                          AS orders,
        SUM(customers)::numeric                                       AS customers,
        CASE WHEN SUM(orders) > 0
             THEN ROUND(SUM(revenue) / SUM(orders), 2) END           AS aov,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(labor) / SUM(revenue), 4) END            AS labor_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(cogs) / SUM(revenue), 4) END             AS food_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND((SUM(cogs)+SUM(labor)) / SUM(revenue), 4) END AS prime_cost_pct,
        0.10                                                          AS overtime_pct,
        0.02                                                          AS waste_pct,
        ROUND(AVG(avg_inventory), 2)                                  AS avg_inventory
      FROM analytics.v_gold_daily
      WHERE tenant_id = $1::uuid
        AND day BETWEEN ($2::date - $3::interval) AND $2::date
        AND location_id = ANY($4::bigint[])
        AND ($5::bigint IS NULL OR location_id = $5::bigint)
      GROUP BY day
      ORDER BY day ASC
      `,
      [tenantId, anchorDay, interval, allowedIds, locationId]
    );
    const seriesRows = seriesRes.rows ?? [];

    const series: Record<string, any[]> = {
      day:         seriesRows.map((r: any) => r.day?.toISOString?.()?.slice(0, 10) ?? String(r.day)),
      ORDERS:      seriesRows.map((r: any) => toNum(r.orders) ?? 0),
      CUSTOMERS:   seriesRows.map((r: any) => toNum(r.customers) ?? 0),
      AOV:         seriesRows.map((r: any) => toNum(r.aov) ?? 0),
      LABOR_PCT:   seriesRows.map((r: any) => toNum(r.labor_pct) ?? 0),
      FOOD_COST:   seriesRows.map((r: any) => toNum(r.food_cost_pct) ?? 0),
      PRIME_COST:  seriesRows.map((r: any) => toNum(r.prime_cost_pct) ?? 0),
      OVERTIME_PCT: seriesRows.map((r: any) => toNum(r.overtime_pct) ?? 0),
      WASTE_PCT:   seriesRows.map((r: any) => toNum(r.waste_pct) ?? 0),
      DIOH:        seriesRows.map((r: any) => toNum(r.avg_inventory) ?? 0),
    };

    // ── Build KPIs ────────────────────────────────────────────
    const kpis = [
      { code: "OPS_ORDERS",               label: "Total Orders",            value: toNum(agg.orders),             unit: "count" },
      { code: "OPS_CUSTOMERS",            label: "Total Customers",         value: toNum(agg.customers),          unit: "count" },
      { code: "OPS_AOV",                  label: "Avg Order Value",         value: toNum(agg.aov),                unit: "usd"   },
      { code: "OPS_REVENUE_PER_CUSTOMER", label: "Revenue / Customer",      value: toNum(agg.rev_per_customer),   unit: "usd"   },
      { code: "OPS_LABOR_RATIO",          label: "Labor Cost %",            value: toNum(agg.labor_ratio),        unit: "pct"   },
      { code: "OPS_LABOR_HOURS",          label: "Est. Labor Hours",        value: toNum(agg.labor_hours),        unit: "count" },
      { code: "OPS_SALES_PER_LABOR_HOUR", label: "Sales / Labor Hour",      value: toNum(agg.sales_per_labor_hour), unit: "usd" },
      { code: "OPS_OVERTIME_PCT",         label: "Overtime %",              value: toNum(agg.overtime_pct),       unit: "pct"   },
      { code: "OPS_DIH",                  label: "Days Inventory on Hand",  value: toNum(agg.dih),                unit: "days"  },
      { code: "OPS_INV_TURNS",            label: "Inventory Turns",         value: toNum(agg.inv_turns),          unit: "ratio" },
      { code: "OPS_AVG_INVENTORY",        label: "Avg Inventory Value",     value: toNum(agg.avg_inventory),      unit: "usd"   },
      { code: "OPS_WASTE_PCT",            label: "Waste %",                 value: toNum(agg.waste_pct),          unit: "pct"   },
      { code: "OPS_AVG_DAILY_REVENUE",    label: "Avg Daily Revenue",       value: toNum(agg.avg_daily_revenue),  unit: "usd"   },
      { code: "OPS_GROSS_MARGIN",         label: "Gross Margin",            value: toNum(agg.gross_margin),       unit: "pct"   },
      { code: "OPS_FOOD_COST_RATIO",      label: "Food Cost %",             value: toNum(agg.food_cost_ratio),    unit: "pct"   },
      { code: "OPS_PRIME_COST_RATIO",     label: "Prime Cost %",            value: toNum(agg.prime_cost_ratio),   unit: "pct"   },
    ].map((k) => ({
      ...k,
      severity: severity(k.code, k.value),
      delta: null,
    }));

    // ── Performance Insights ──────────────────────────────────
    const insights = [];
    const laborRatio = toNum(agg.labor_ratio) ?? 0;
    const primeCost  = toNum(agg.prime_cost_ratio) ?? 0;
    const aovVal     = toNum(agg.aov) ?? 0;

    if (laborRatio > 0.32) {
      insights.push({
        code: "labor_cost_elevated",
        title: "Labor cost is elevated",
        message: `Labor ratio of ${(laborRatio * 100).toFixed(1)}% is above the 30% benchmark. Review scheduling and overtime.`,
        severity: laborRatio > 0.35 ? "risk" : "warn",
      });
    }
    if (primeCost > 0.62) {
      insights.push({
        code: "prime_cost_high",
        title: "Prime cost pressure",
        message: `Combined food and labor cost of ${(primeCost * 100).toFixed(1)}% exceeds the 60% target.`,
        severity: primeCost > 0.65 ? "risk" : "warn",
      });
    }
    if (aovVal < 25) {
      insights.push({
        code: "low_aov",
        title: "Average order value opportunity",
        message: `AOV of $${aovVal.toFixed(2)} is below target. Consider upsell prompts and bundle offers.`,
        severity: "warn",
      });
    }
    if (insights.length === 0) {
      insights.push({
        code: "ops_healthy",
        title: "Operations running efficiently",
        message: "Labor, food cost, and order metrics are within healthy ranges.",
        severity: "good",
      });
    }

    return NextResponse.json({
      ok:           true,
      as_of:        new Date().toISOString(),
      refreshed_at: new Date().toISOString(),
      window,
      anchor_day:   anchorDay,
      location:     { id: locationId ? String(locationId) : "all", name: "Operations" },
      kpis,
      series,
      insights: {
        kpi_insights:   insights,
        chart_insights: [],
        alerts:         [],
        recommendations: [],
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch operations data" },
      { status: 500 }
    );
  }
}
