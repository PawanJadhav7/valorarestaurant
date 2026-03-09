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

function safeDivPct(numer: any, denom: any): number | null {
  const n = Number(numer);
  const d = Number(denom);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return (n / d) * 100;
}

function pickNum(row: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = row?.[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function forwardFill(nums: (number | null)[]) {
  let last: number | null = null;
  return nums.map((v) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      last = v;
      return v;
    }
    return last; // keep last known
  });
}


// ---------------- route ----------------
export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    let asOf = parseAsOf(url.searchParams);

    if (!asOf) {
      const r = await pool.query(`
        SELECT MAX(snapshot_date)::timestamptz AS as_of_ts
        FROM restaurant.fact_inventory_item_on_hand_daily
      `);
      const ts = r.rows?.[0]?.as_of_ts;
      asOf = ts ? new Date(ts).toISOString() : null;
    }
    const windowCode = parseWindow(url.searchParams);
    const locRaw = url.searchParams.get("location_id");
    const locationId =
      !locRaw || locRaw.trim() === "" || locRaw.trim().toLowerCase() === "all"
        ? null
        : locRaw.trim();

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
    // ---------- series (charts) ----------
    const day = rows.map((r) => String(r.day));

    // Preserve NULLs for charting (do NOT coerce to 0)
    const revenue = rows.map((r) => (r.revenue === null ? null : Number(r.revenue)));
    const labor_cost = rows.map((r) => (r.labor_cost === null ? null : Number(r.labor_cost)));
    const labor_hours = rows.map((r) => (r.labor_hours === null ? null : Number(r.labor_hours)));
    const inventory_value = rows.map((r) => (r.inventory_value === null ? null : Number(r.inventory_value)));
    const cogs = rows.map((r) => (r.cogs === null ? null : Number(r.cogs)));

    const overtime_hours = rows.map((r) => {
      const n = Number((r as any).overtime_hours);
      return Number.isFinite(n) ? n : null;
    });

    const waste_cost = rows.map((r) => {
      const n = Number((r as any).waste_cost);
      return Number.isFinite(n) ? n : null;
    });

    // Derived series your UI expects (all are percent values, not 0..1)
    const LABOR_PCT = rows.map((r) => safeDivPct(r.labor_cost, r.revenue));

    const SPLH = rows.map((r) => {
      const rev = Number(r.revenue);
      const hrs = Number(r.labor_hours);
      if (!Number.isFinite(rev) || !Number.isFinite(hrs) || hrs <= 0) return null;
      return rev / hrs;
    });

    // DIOH proxy = inventory_value / daily cogs
    const DIOH = rows.map((r) => {
      const inv = Number(r.inventory_value);
      const dcogs = Number(r.cogs);
      if (!Number.isFinite(inv) || !Number.isFinite(dcogs) || dcogs <= 0) return null;
      return inv / dcogs;
    });

    const OVERTIME_PCT = rows.map((r) => safeDivPct((r as any).overtime_hours, r.labor_hours));
    const WASTE_PCT = rows.map((r) => safeDivPct((r as any).waste_cost, r.revenue));

    // If you want forward-fill, use it here; otherwise delete these lines.
    // const OVERTIME_PCT = forwardFill(OVERTIME_PCT_RAW);
    // const WASTE_PCT = forwardFill(WASTE_PCT_RAW);

    const series = {
      day,

      // raw series
      revenue,
      labor_cost,
      labor_hours,
      overtime_hours,
      waste_cost,
      inventory_value,
      cogs,

      // keys UI expects
      LABOR_PCT,
      OVERTIME_PCT,
      DIOH,
      WASTE_PCT,
      SPLH,
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
          series_sample_row: rows?.[0] ?? null,
          series_sample_keys: rows?.[0] ? Object.keys(rows[0]) : [],
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/ops failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}