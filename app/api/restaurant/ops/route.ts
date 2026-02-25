// app/api/restaurant/ops/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { toNum, toNumOrZero } from "@/lib/number";

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

// ---------------- helpers ----------------
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const w = idx - lo;
  return sortedAsc[lo] * (1 - w) + sortedAsc[hi] * w;
}

function sevFromThresholds(v: number, warnAt: number, riskAt: number): Severity {
  if (v >= riskAt) return "risk";
  if (v >= warnAt) return "warn";
  return "good";
}

// function toNum(v: any): number | null {
//   if (v === null || v === undefined) return null;
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// }

// function toNumOrZero(v: any): number {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : 0;
// }

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

function parseWindow(sp: URLSearchParams): string {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  return ["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d";
}

function parseUuid(sp: URLSearchParams, key: string): string | null {
  const v = sp.get(key);
  if (!v) return null;
  const t = v.trim();
  return t.length ? t : null;
}

// ---------------- route ----------------
export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseUuid(url.searchParams, "location_id"); // optional UUID

    // params for "windowed" functions:
    // with as_of:    [$1=asOf, $2=windowCode, $3=locationId]
    // without as_of: [$1=windowCode, $2=locationId]
    const paramsWin = asOf ? [asOf, windowCode, locationId] : [windowCode, locationId];

    // ---------- SQL: Ops ----------
    const sqlDelta = asOf
      ? `SELECT * FROM analytics.get_ops_kpis_delta($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_ops_kpis_delta(now(), $1::text, $2::uuid);`;

    const sqlSeries = asOf
      ? `SELECT * FROM analytics.get_ops_timeseries_daily($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_ops_timeseries_daily(now(), $1::text, $2::uuid);`;

    // ---------- SQL: Inventory intelligence ----------
    const sqlInvKpis = asOf
      ? `SELECT * FROM analytics.get_inventory_kpis($1::timestamptz, $2::text, $3::uuid, 60);`
      : `SELECT * FROM analytics.get_inventory_kpis(now(), $1::text, $2::uuid, 60);`;

    const sqlInvAlerts = asOf
      ? `SELECT * FROM analytics.get_inventory_alerts($1::timestamptz, $2::text, $3::uuid, 60, 75, 100);`
      : `SELECT * FROM analytics.get_inventory_alerts(now(), $1::text, $2::uuid, 60, 75, 100);`;

    const sqlInvActions = asOf
      ? `SELECT * FROM analytics.get_inventory_actions($1::timestamptz, $2::text, $3::uuid, 60, 75, 100);`
      : `SELECT * FROM analytics.get_inventory_actions(now(), $1::text, $2::uuid, 60, 75, 100);`;

    // ---------- SQL: Inventory drivers ----------
    // signature: (as_of_ts, window_code, p_location_id, p_limit)
    const sqlTopOnhand = asOf
      ? `SELECT * FROM analytics.get_inventory_top_onhand_items($1::timestamptz, $2::text, $3::uuid, 10::int);`
      : `SELECT * FROM analytics.get_inventory_top_onhand_items(now(), $1::text, $2::uuid, 10::int);`;

    const sqlCategoryMix = asOf
      ? `SELECT * FROM analytics.get_inventory_category_mix($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_inventory_category_mix(now(), $1::text, $2::uuid);`;

    // ---------- queries ----------
    const [
      deltaRes,
      seriesRes,
      invKpiRes,
      invAlertsRes,
      invActionsRes,
      topOnhandRes,
      catMixRes,
    ] = await Promise.all([
      pool.query(sqlDelta, paramsWin),
      pool.query(sqlSeries, paramsWin),
      pool.query(sqlInvKpis, paramsWin),
      pool.query(sqlInvAlerts, paramsWin),
      pool.query(sqlInvActions, paramsWin),
      pool.query(sqlTopOnhand, paramsWin),
      pool.query(sqlCategoryMix, paramsWin),
    ]);

    // ---------- rows ----------
    const k = deltaRes.rows?.[0] ?? null;
    const rows = seriesRes.rows ?? [];

    const invKpis = invKpiRes.rows?.[0] ?? null;
    const invAlerts = invAlertsRes.rows ?? [];
    const invActions = invActionsRes.rows ?? [];

    const top_onhand_items = topOnhandRes.rows ?? [];
    const category_mix = catMixRes.rows ?? [];

    // ✅ Top 3 actions for Ops page
    const actions = invActions.slice(0, 3);

    // ✅ Exceptions & Alerts (currently inventory alerts only)
    const alerts = invAlerts;

    // ---------- KPIs (preserve nulls) ----------
    const kpis: Kpi[] = k
      ? [
          {
            code: "OPS_LABOR_COST",
            label: "Labor Cost",
            value: toNum(k.labor_cost),
            unit: "usd",
            delta: toNum(k.labor_cost_delta_pct),
            severity: "good",
            hint: "Total labor cost vs previous window (%).",
          },
          {
            code: "OPS_LABOR_HOURS",
            label: "Labor Hours",
            value: toNum(k.labor_hours),
            unit: "count",
            delta: toNum(k.labor_hours_delta_pct),
            severity: "good",
            hint: "Total labor hours vs previous window (%).",
          },
          {
            code: "OPS_AVG_HOURLY_RATE",
            label: "Avg Hourly Rate",
            value: toNum(k.avg_hourly_rate),
            unit: "usd",
            delta: null,
            severity: "good",
            hint: "Labor cost / labor hours.",
          },
          {
            code: "OPS_LABOR_RATIO",
            label: "Labor Cost Ratio",
            value: toNum(k.labor_cost_ratio_pct),
            unit: "pct",
            delta: toNum(k.labor_ratio_delta_pp), // pp
            severity: "good",
            hint: "Labor % of revenue and change (pp).",
          },
          {
            code: "OPS_SALES_PER_LABOR_HOUR",
            label: "Sales per Labor Hour",
            value: toNum(k.sales_per_labor_hour),
            unit: "usd",
            delta: toNum(k.sales_per_labor_hour_delta_pct),
            severity: "good",
            hint: "Revenue / labor hours vs previous window (%).",
          },
          {
            code: "OPS_AVG_INVENTORY",
            label: "Avg Inventory Value",
            value: toNum(k.avg_inventory_value),
            unit: "usd",
            delta: toNum(k.avg_inventory_delta_pct),
            severity: "good",
            hint: "Average inventory value vs previous window (%).",
          },
          {
            code: "OPS_DIH",
            label: "Days Inventory on Hand",
            value: toNum(k.dih_days),
            unit: "days",
            delta: toNum(k.dih_delta_pct),
            severity: "good",
            hint: "Inventory days vs previous window (%).",
          },
          {
            code: "OPS_INV_TURNS",
            label: "Inventory Turns",
            value: toNum(k.inventory_turns),
            unit: "ratio",
            delta: toNum(k.inv_turns_delta_pct),
            severity: "good",
            hint: "Annualized COGS / Avg inventory vs previous window (%).",
          },
          {
            code: "OPS_AR_DAYS",
            label: "AR Days",
            value: toNum(k.ar_days),
            unit: "days",
            delta: null,
            severity: "good",
            hint: "Avg AR balance / daily revenue.",
          },
          {
            code: "OPS_AP_DAYS",
            label: "AP Days",
            value: toNum(k.ap_days),
            unit: "days",
            delta: null,
            severity: "good",
            hint: "Avg AP balance / daily COGS.",
          },
          {
            code: "OPS_CCC",
            label: "Cash Conversion Cycle",
            value: toNum(k.ccc_days),
            unit: "days",
            delta: toNum(k.ccc_delta_days),
            severity: "good",
            hint: "DIH + AR − AP (delta in days).",
          },
        ]
      : [];

    // ---------- Step 2: dynamic thresholds + severity badges ----------
    // Top on-hand: use distribution-based cutoffs, with sane floors (so tiny datasets don't set silly cutoffs)
    const onhandVals = top_onhand_items
      .map((r: any) => Number(r.avg_on_hand_value ?? NaN))
      .filter((x) => Number.isFinite(x) && x > 0)
      .sort((a, b) => a - b);

    const onhandWarn = Math.max(150, percentile(onhandVals, 0.75)); // floor $150
    const onhandRisk = Math.max(250, percentile(onhandVals, 0.9));  // floor $250

    const top_onhand_items_badged = top_onhand_items.map((r: any) => {
      const v = Number(r.avg_on_hand_value ?? 0);
      const sev = sevFromThresholds(v, onhandWarn, onhandRisk);
      return {
        ...r,
        severity: sev,
        badge_reason:
          sev === "risk"
            ? `High on-hand value: ${fmtUsd(v)} (≥ ${fmtUsd(onhandRisk)})`
            : sev === "warn"
            ? `Elevated on-hand value: ${fmtUsd(v)} (≥ ${fmtUsd(onhandWarn)})`
            : `On-hand value in range: ${fmtUsd(v)}`,
      };
    });

    // Category mix: distribution-based cutoffs with floors (15% warn, 25% risk)
    const catPcts = category_mix
      .map((r: any) => Number(r.pct_of_total ?? NaN))
      .filter((x) => Number.isFinite(x) && x >= 0)
      .sort((a, b) => a - b);

    const catWarn = Math.max(15, percentile(catPcts, 0.75));
    const catRisk = Math.max(25, percentile(catPcts, 0.9));

    const category_mix_badged = category_mix.map((r: any) => {
      const p = Number(r.pct_of_total ?? 0);
      const sev = sevFromThresholds(p, catWarn, catRisk);
      return {
        ...r,
        severity: sev,
        badge_reason:
          sev === "risk"
            ? `Concentrated inventory: ${p.toFixed(1)}% (≥ ${catRisk.toFixed(1)}%)`
            : sev === "warn"
            ? `High inventory share: ${p.toFixed(1)}% (≥ ${catWarn.toFixed(1)}%)`
            : `Balanced share: ${p.toFixed(1)}%`,
      };
    });

    // ---------- series (charts: safe zero fallback) ----------
    const series = {
      day: rows.map((r) => String(r.day)),
      revenue: rows.map((r) => toNumOrZero(r.revenue)),
      labor_cost: rows.map((r) => toNumOrZero(r.labor_cost)),
      labor_hours: rows.map((r) => toNumOrZero(r.labor_hours)),
      labor_cost_ratio_pct: rows.map((r) => (r.labor_cost_ratio_pct === null ? null : Number(r.labor_cost_ratio_pct))),
      sales_per_labor_hour: rows.map((r) => (r.sales_per_labor_hour === null ? null : Number(r.sales_per_labor_hour))),
      inventory_value: rows.map((r) => toNumOrZero(r.inventory_value)),
      cogs: rows.map((r) => toNumOrZero(r.cogs)),
    };

    return NextResponse.json(
      {
        ok: true,
        as_of: k?.as_of_ts ?? asOf ?? null,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: { id: locationId ?? "all", name: locationId ? "Location" : "All Locations" },

        kpis,
        series,

        // inventory intelligence passthrough
        inventory: {
          kpis: invKpis,
          alerts: invAlerts,
        },

        // Ops page: Exceptions & Alerts + Top 3 Actions
        alerts,
        actions,

        // Ops page: Drivers (NOW includes badged arrays + dynamic policy)
        drivers: {
          inventory: {
            policy: {
              top_onhand_warn_usd: Number(onhandWarn.toFixed(2)),
              top_onhand_risk_usd: Number(onhandRisk.toFixed(2)),
              category_warn_pct: Number(catWarn.toFixed(2)),
              category_risk_pct: Number(catRisk.toFixed(2)),
              method: "percentiles(p75=warn, p90=risk) with floors",
            },
            top_onhand_items: top_onhand_items_badged,
            category_mix: category_mix_badged,
          },
        },

        raw: {
          ops_delta_row: Boolean(k),
          series_rows: rows.length,
          inventory_kpis_row: Boolean(invKpis),
          inventory_alerts_count: invAlerts.length,
          inventory_actions_count: invActions.length,
          merged_alerts_count: alerts.length,
          top_onhand_items_count: top_onhand_items.length,
          category_mix_count: category_mix.length,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/ops failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}