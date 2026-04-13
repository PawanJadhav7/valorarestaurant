// frontend/app/api/restaurant/cost-control/route.ts
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
  return "364 days";
}

function severity(code: string, value: number | null): "good" | "warn" | "risk" {
  if (value === null) return "good";
  switch (code) {
    case "CC_FOOD_COST_PCT":
      if (value > 0.35) return "risk";
      if (value > 0.32) return "warn";
      return "good";
    case "CC_LABOR_COST_PCT":
      if (value > 0.35) return "risk";
      if (value > 0.32) return "warn";
      return "good";
    case "CC_PRIME_COST_PCT":
      if (value > 0.65) return "risk";
      if (value > 0.62) return "warn";
      return "good";
    case "CC_WASTE_PCT":
      if (value > 0.05) return "risk";
      if (value > 0.03) return "warn";
      return "good";
    case "CC_DISCOUNT_PCT":
      if (value > 0.10) return "risk";
      if (value > 0.05) return "warn";
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

    const url       = new URL(req.url);
    const window    = parseWindow(url.searchParams.get("window") ?? "30d");
    const dayParam  = url.searchParams.get("day") ?? url.searchParams.get("as_of");
    const locParam  = url.searchParams.get("location_id");
    const locationId = locParam ? parseInt(locParam) : null;

    // Resolve tenant
    const tenantRes = await pool.query(
      `SELECT tenant_id FROM app.tenant_user
       WHERE user_id = $1::uuid ORDER BY created_at ASC`,
      [user.user_id]
    );
    const tenantIds: string[] = tenantRes.rows.map((r: any) => r.tenant_id);
    const tenantId = tenantIds[0] ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not resolved" }, { status: 403 });
    }

    // Resolve allowed locations
    const allowedRes = await pool.query(
      `SELECT DISTINCT dl.location_id
       FROM restaurant.dim_location dl
       JOIN app.tenant_location tl ON tl.location_id = dl.location_id
       WHERE dl.tenant_id = ANY($1::uuid[]) AND dl.is_active = true`,
      [tenantIds]
    );
    const allowedIds = allowedRes.rows.map((r: any) => r.location_id);
    if (!allowedIds.length) {
      return NextResponse.json({ ok: true, kpis: [], series: {} });
    }

    // Anchor date
    const anchorRes = await pool.query(
      `SELECT COALESCE(MAX(day), CURRENT_DATE)::date AS anchor_day
       FROM analytics.v_gold_daily
       WHERE tenant_id = ANY($1::uuid[])
         AND location_id = ANY($2::bigint[])
         AND ($3::bigint IS NULL OR location_id = $3::bigint)`,
      [tenantIds, allowedIds, locationId]
    );
    const anchorDay = dayParam?.slice(0, 10) ??
      anchorRes.rows[0]?.anchor_day?.toISOString?.()?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);

    const interval = windowInterval(window);

    // ── Aggregate KPIs ────────────────────────────────────────
    const aggRes = await pool.query(
      `
      SELECT
        -- Cost ratios
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(cogs) / SUM(revenue), 4) END              AS food_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(labor) / SUM(revenue), 4) END             AS labor_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND((SUM(cogs)+SUM(labor)) / SUM(revenue), 4) END AS prime_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(fixed_costs) / SUM(revenue), 4) END       AS fixed_cost_pct,
        -- Absolute costs
        ROUND(SUM(cogs), 2)                                            AS total_cogs,
        ROUND(SUM(labor), 2)                                          AS total_labor,
        ROUND(SUM(fixed_costs), 2)                                    AS total_fixed,
        ROUND(SUM(cogs) + SUM(labor), 2)                              AS total_prime_cost,
        -- Waste estimate 2%
        0.02                                                          AS waste_pct,
        -- Discount (not in Gold — default 0)
        0.0                                                           AS discount_pct,
        0                                                             AS stockouts,
        0.0                                                           AS void_pct,
        0.0                                                           AS comp_pct,
        -- Cost per order
        CASE WHEN SUM(orders) > 0
             THEN ROUND(SUM(cogs) / SUM(orders), 2) END              AS cogs_per_order,
        CASE WHEN SUM(orders) > 0
             THEN ROUND(SUM(labor) / SUM(orders), 2) END             AS labor_per_order
      FROM analytics.v_gold_daily
      WHERE tenant_id = ANY($1::uuid[])
        AND day BETWEEN ($2::date - $3::interval) AND $2::date
        AND location_id = ANY($4::bigint[])
        AND ($5::bigint IS NULL OR location_id = $5::bigint)
      `,
      [tenantIds, anchorDay, interval, allowedIds, locationId]
    );
    const agg = aggRes.rows[0] ?? {};

    // ── Series ────────────────────────────────────────────────
    const seriesRes = await pool.query(
      `
      SELECT
        day,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(cogs) / SUM(revenue), 4) END              AS food_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(labor) / SUM(revenue), 4) END             AS labor_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND((SUM(cogs)+SUM(labor)) / SUM(revenue), 4) END AS prime_cost_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(fixed_costs) / SUM(revenue), 4) END       AS fixed_cost_pct,
        ROUND(SUM(cogs), 2)                                            AS total_cogs,
        ROUND(SUM(labor), 2)                                          AS total_labor,
        0.02                                                          AS waste_pct,
        0.0                                                           AS discount_pct
      FROM analytics.v_gold_daily
      WHERE tenant_id = ANY($1::uuid[])
        AND day BETWEEN ($2::date - $3::interval) AND $2::date
        AND location_id = ANY($4::bigint[])
        AND ($5::bigint IS NULL OR location_id = $5::bigint)
      GROUP BY day
      ORDER BY day ASC
      `,
      [tenantIds, anchorDay, interval, allowedIds, locationId]
    );
    const seriesRows = seriesRes.rows ?? [];

    const series = {
      day:            seriesRows.map((r: any) => r.day?.toISOString?.()?.slice(0, 10) ?? String(r.day)),
      FOOD_COST_PCT:  seriesRows.map((r: any) => toNum(r.food_cost_pct) ?? 0),
      LABOR_COST_PCT: seriesRows.map((r: any) => toNum(r.labor_cost_pct) ?? 0),
      PRIME_COST_PCT: seriesRows.map((r: any) => toNum(r.prime_cost_pct) ?? 0),
      FIXED_COST_PCT: seriesRows.map((r: any) => toNum(r.fixed_cost_pct) ?? 0),
      COGS:           seriesRows.map((r: any) => toNum(r.total_cogs) ?? 0),
      LABOR:          seriesRows.map((r: any) => toNum(r.total_labor) ?? 0),
      WASTE_PCT:      seriesRows.map((r: any) => 0.02),
      DISCOUNT_PCT:   seriesRows.map((r: any) => 0),
    };

    // ── KPIs ──────────────────────────────────────────────────
    const kpis = [
      { code: "CC_FOOD_COST_PCT",   label: "Food Cost %",      value: toNum(agg.food_cost_pct),   unit: "pct"   },
      { code: "CC_LABOR_COST_PCT",  label: "Labor Cost %",     value: toNum(agg.labor_cost_pct),  unit: "pct"   },
      { code: "CC_PRIME_COST_PCT",  label: "Prime Cost %",     value: toNum(agg.prime_cost_pct),  unit: "pct"   },
      { code: "CC_WASTE_PCT",       label: "Waste %",          value: toNum(agg.waste_pct),       unit: "pct"   },
      { code: "CC_TOTAL_COGS",      label: "Total COGS",       value: toNum(agg.total_cogs),      unit: "usd"   },
      { code: "CC_TOTAL_LABOR",     label: "Total Labor",      value: toNum(agg.total_labor),     unit: "usd"   },
      { code: "CC_TOTAL_FIXED",     label: "Fixed Costs",      value: toNum(agg.total_fixed),     unit: "usd"   },
      { code: "CC_PRIME_COST_ABS",  label: "Prime Cost $",     value: toNum(agg.total_prime_cost),unit: "usd"   },
      { code: "CC_DISCOUNT_PCT",    label: "Discount Rate",    value: toNum(agg.discount_pct),    unit: "pct"   },
      { code: "CC_STOCKOUTS",       label: "Stockouts",        value: toNum(agg.stockouts),       unit: "count" },
      { code: "CC_VOID_PCT",        label: "Void Rate",        value: toNum(agg.void_pct),        unit: "pct"   },
      { code: "CC_COMP_PCT",        label: "Comp Rate",        value: toNum(agg.comp_pct),        unit: "pct"   },
      { code: "CC_COGS_PER_ORDER",  label: "COGS / Order",     value: toNum(agg.cogs_per_order),  unit: "usd"   },
      { code: "CC_LABOR_PER_ORDER", label: "Labor / Order",    value: toNum(agg.labor_per_order), unit: "usd"   },
      { code: "CC_FIXED_COST_PCT",  label: "Fixed Cost %",     value: toNum(agg.fixed_cost_pct),  unit: "pct"   },
    ].map((k) => ({ ...k, severity: severity(k.code, k.value), delta: null }));

    // ── Insights ──────────────────────────────────────────────
    const insights = [];
    const foodCost  = toNum(agg.food_cost_pct) ?? 0;
    const laborCost = toNum(agg.labor_cost_pct) ?? 0;
    const primeCost = toNum(agg.prime_cost_pct) ?? 0;

    if (foodCost > 0.32) {
      insights.push({
        code: "food_cost_elevated",
        title: "Food cost above benchmark",
        message: `Food cost of ${(foodCost * 100).toFixed(1)}% exceeds the 30% target. Review supplier pricing and portion controls.`,
        severity: foodCost > 0.35 ? "risk" : "warn",
      });
    }
    if (laborCost > 0.32) {
      insights.push({
        code: "labor_cost_elevated",
        title: "Labor cost pressure detected",
        message: `Labor cost of ${(laborCost * 100).toFixed(1)}% is above the 30% benchmark. Review scheduling and overtime.`,
        severity: laborCost > 0.35 ? "risk" : "warn",
      });
    }
    if (primeCost > 0.62) {
      insights.push({
        code: "prime_cost_high",
        title: "Prime cost exceeds target",
        message: `Combined food and labor cost of ${(primeCost * 100).toFixed(1)}% exceeds the 60% target.`,
        severity: primeCost > 0.65 ? "risk" : "warn",
      });
    }
    if (insights.length === 0) {
      insights.push({
        code: "costs_healthy",
        title: "Cost structure is healthy",
        message: "Food cost, labor, and prime cost are all within target ranges.",
        severity: "good",
      });
    }

    return NextResponse.json({
      ok:           true,
      as_of:        new Date().toISOString(),
      refreshed_at: new Date().toISOString(),
      window,
      anchor_day:   anchorDay,
      location:     { id: locationId ? String(locationId) : "all", name: "Cost Management" },
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
      { error: error?.message ?? "Failed to fetch cost management data" },
      { status: 500 }
    );
  }
}
