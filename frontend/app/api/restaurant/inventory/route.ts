// frontend/app/api/restaurant/inventory/route.ts
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
  if (w === "7d") return "6 days";
  if (w === "30d") return "29 days";
  if (w === "90d") return "89 days";
  return "364 days";
}

function windowDays(w: string): number {
  if (w === "7d") return 7;
  if (w === "30d") return 30;
  if (w === "90d") return 90;
  return 365;
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const window = parseWindow(url.searchParams.get("window") ?? "30d");
    const dayParam = url.searchParams.get("day") ?? url.searchParams.get("as_of");
    const locParam = url.searchParams.get("location_id");
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
      return NextResponse.json({ ok: true, kpis: [], series: {}, inventory: { kpis: null, alerts: [], actions: [], policy: { target_dih_days: 60, warn_dih_days: 75, risk_dih_days: 100 } }, drivers: { top_onhand_items: [], category_mix: [], slow_movers: [] }, raw: { anchor_missing: false } });
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
    const days = windowDays(window);

    // ── Aggregate KPIs ────────────────────────────────────────
    const aggRes = await pool.query(
      `
      SELECT
        ROUND(AVG(avg_inventory), 2)                                    AS avg_inventory_value,
        ROUND(SUM(cogs), 2)                                             AS total_cogs,
        -- Days inventory on hand
        CASE WHEN SUM(cogs) > 0
             THEN ROUND(AVG(avg_inventory) / (SUM(cogs) / COUNT(*)), 1)
             ELSE 0 END                                                 AS dih_days,
        -- Inventory turns
        CASE WHEN AVG(avg_inventory) > 0
             THEN ROUND(SUM(cogs) / AVG(avg_inventory), 2)
             ELSE 0 END                                                 AS inv_turns,
        -- Waste estimate 2%
        ROUND(SUM(revenue) * 0.02, 2)                                   AS waste_value,
        0.02                                                            AS waste_pct,
        -- Stock efficiency
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(AVG(avg_inventory) / SUM(revenue) * 100, 2)
             ELSE 0 END                                                 AS stock_to_sales_pct,
        -- Avg daily COGS
        CASE WHEN COUNT(*) > 0
             THEN ROUND(SUM(cogs) / COUNT(*), 2)
             ELSE 0 END                                                 AS avg_daily_cogs,
        -- Food cost pct
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(cogs) / SUM(revenue), 4)
             ELSE 0 END                                                 AS food_cost_pct,
        COUNT(*)::int                                                   AS row_count
      FROM analytics.v_gold_daily
      WHERE tenant_id = ANY($1::uuid[])
        AND day BETWEEN ($2::date - $3::interval) AND $2::date
        AND location_id = ANY($4::bigint[])
        AND ($5::bigint IS NULL OR location_id = $5::bigint)
      `,
      [tenantIds, anchorDay, interval, allowedIds, locationId]
    );
    const agg = aggRes.rows[0] ?? {};

    // ── Previous period for delta ─────────────────────────────
    const prevRes = await pool.query(
      `
      SELECT
        ROUND(AVG(avg_inventory), 2)                                    AS avg_inventory_value,
        CASE WHEN SUM(cogs) > 0
             THEN ROUND(AVG(avg_inventory) / (SUM(cogs) / COUNT(*)), 1)
             ELSE 0 END                                                 AS dih_days,
        CASE WHEN AVG(avg_inventory) > 0
             THEN ROUND(SUM(cogs) / AVG(avg_inventory), 2)
             ELSE 0 END                                                 AS inv_turns
      FROM analytics.v_gold_daily
      WHERE tenant_id = ANY($1::uuid[])
        AND day BETWEEN ($2::date - ($3::interval * 2)) AND ($2::date - $3::interval - interval '1 day')
        AND location_id = ANY($4::bigint[])
        AND ($5::bigint IS NULL OR location_id = $5::bigint)
      `,
      [tenantIds, anchorDay, interval, allowedIds, locationId]
    );
    const prev = prevRes.rows[0] ?? {};

    function delta(curr: number | null, prevVal: number | null): number | null {
      if (curr === null || prevVal === null || prevVal === 0) return null;
      return ((curr - prevVal) / prevVal) * 100;
    }

    // ── Series ────────────────────────────────────────────────
    const seriesRes = await pool.query(
      `
      SELECT
        day,
        ROUND(AVG(avg_inventory), 2)                                    AS avg_inventory_value,
        CASE WHEN SUM(cogs) > 0
             THEN ROUND(AVG(avg_inventory) / (SUM(cogs) / COUNT(*)), 1)
             ELSE 0 END                                                 AS dih_days,
        0.02                                                            AS waste_pct,
        CASE WHEN SUM(revenue) > 0
             THEN ROUND(SUM(cogs) / SUM(revenue), 4)
             ELSE 0 END                                                 AS food_cost_pct
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
      day: seriesRows.map((r: any) => r.day?.toISOString?.()?.slice(0, 10) ?? String(r.day)),
      AVG_INVENTORY: seriesRows.map((r: any) => toNum(r.avg_inventory_value) ?? 0),
      DIOH: seriesRows.map((r: any) => toNum(r.dih_days) ?? 0),
      WASTE_PCT: seriesRows.map((r: any) => 0.02),
      FOOD_COST_PCT: seriesRows.map((r: any) => toNum(r.food_cost_pct) ?? 0),
      STOCKOUT_COUNT: seriesRows.map((_: any) => 0),
      VARIANCE_PCT: seriesRows.map((_: any) => 0),
    };

    // ── KPIs ──────────────────────────────────────────────────
    const dihDays = toNum(agg.dih_days);
    const invTurns = toNum(agg.inv_turns);
    const prevDih = toNum(prev.dih_days);
    const prevTurns = toNum(prev.inv_turns);
    const prevInv = toNum(prev.avg_inventory_value);

    function dihSeverity(v: number | null): "good" | "warn" | "risk" {
      if (v === null) return "good";
      if (v > 100) return "risk";
      if (v > 75) return "warn";
      return "good";
    }

    const kpis = [
      { code: "INV_AVG_VALUE", label: "Avg Inventory Value", value: toNum(agg.avg_inventory_value), unit: "usd", delta: delta(toNum(agg.avg_inventory_value), prevInv), severity: "good" },
      { code: "INV_DIH", label: "Days on Hand", value: dihDays, unit: "days", delta: delta(dihDays, prevDih), severity: dihSeverity(dihDays) },
      { code: "INV_TURNS", label: "Inventory Turns", value: invTurns, unit: "ratio", delta: delta(invTurns, prevTurns), severity: invTurns !== null && invTurns < 4 ? "warn" : "good" },
      { code: "INV_WASTE_VALUE", label: "Est. Waste Value", value: toNum(agg.waste_value), unit: "usd", delta: null, severity: "warn" },
      { code: "INV_WASTE_PCT", label: "Waste %", value: 0.02, unit: "pct", delta: null, severity: "good" },
      { code: "INV_FOOD_COST", label: "Food Cost %", value: toNum(agg.food_cost_pct), unit: "pct", delta: null, severity: toNum(agg.food_cost_pct) !== null && (toNum(agg.food_cost_pct) ?? 0) > 0.33 ? "warn" : "good" },
      { code: "INV_DAILY_COGS", label: "Avg Daily COGS", value: toNum(agg.avg_daily_cogs), unit: "usd", delta: null, severity: "good" },
      { code: "INV_STOCK_SALES", label: "Stock to Sales %", value: toNum(agg.stock_to_sales_pct), unit: "pct", delta: null, severity: "good" },
    ];

    // ── Performance Insights ──────────────────────────────────
    const insights = [];
    if (dihDays !== null && dihDays > 75) {
      insights.push({ code: "dih_high", title: "Days on hand above target", message: `DIH of ${dihDays.toFixed(1)} days exceeds the 60-day target. Review ordering frequency and stock levels.`, severity: dihDays > 100 ? "risk" : "warn" });
    }
    if (invTurns !== null && invTurns < 4) {
      insights.push({ code: "turns_low", title: "Low inventory turnover", message: `Inventory turns of ${invTurns.toFixed(1)}x is below the 6x target. Excess stock may be tying up cash.`, severity: "warn" });
    }
    if (insights.length === 0) {
      insights.push({ code: "inv_healthy", title: "Inventory health is good", message: "Days on hand and turnover are within healthy ranges.", severity: "good" });
    }

    return NextResponse.json({
      ok: true,
      as_of: anchorDay,
      refreshed_at: new Date().toISOString(),
      window,
      anchor_day: anchorDay,
      location: { id: locationId ? String(locationId) : "all", name: "Inventory Health" },
      kpis,
      series,
      inventory: {
        kpis: {
          avg_inventory_value: toNum(agg.avg_inventory_value),
          dih_days: dihDays,
          inv_turns: invTurns,
          waste_value: toNum(agg.waste_value),
          waste_pct: 0.02,
          food_cost_pct: toNum(agg.food_cost_pct),
          avg_daily_cogs: toNum(agg.avg_daily_cogs),
          delta_dih: delta(dihDays, prevDih),
          delta_inv_turns: delta(invTurns, prevTurns),
        },
        alerts: [],
        actions: [],
        policy: { target_dih_days: 60, warn_dih_days: 75, risk_dih_days: 100 },
      },
      drivers: { top_onhand_items: [], category_mix: [], slow_movers: [] },
      insights: {
        kpi_insights: insights,
        chart_insights: [],
        alerts: [],
        recommendations: [],
      },
      raw: { anchor_missing: false, series_rows: seriesRows.length, anchor_day: anchorDay },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch inventory data" },
      { status: 500 }
    );
  }
}
