// app/api/restaurant/labor/drivers/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count" | "hours";

export type OpsDriver = {
  id: string;
  domain: "labor";
  severity: Severity;
  title: string;

  why: string;
  recommendation: string;

  kpi_code?: string;
  metric?: { value?: number | null; delta?: number | null; unit?: Unit };

  impact_pct: number;

  score?: number;
  meta?: Record<string, any>;
};

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  return (["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d") as any;
}

function parseUuid(sp: URLSearchParams, key: string): string | null {
  const v = sp.get(key);
  if (!v) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampPct(x: number) {
  return Math.max(0, Math.min(100, x));
}

function toImpactPct(score: any): number {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) return clampPct(Math.round(n * 100));
  if (n > 1 && n <= 100) return clampPct(Math.round(n));
  return 100;
}

function scoreFrom(sev: Severity, bump?: number | null) {
  const base = sev === "risk" ? 100 : sev === "warn" ? 60 : 20;
  const extra = bump ? Math.min(30, Math.abs(bump)) : 0;
  return base + extra;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const windowCode = parseWindow(url.searchParams);
  const asOf = parseAsOf(url.searchParams);
  const locationId = parseUuid(url.searchParams, "location_id");

  const params = asOf ? [asOf, windowCode, locationId] : [windowCode, locationId];

  try {
    // Reuse ops delta (it has labor aggregates)
    const sqlDelta = asOf
      ? `SELECT * FROM analytics.get_ops_kpis_delta($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_ops_kpis_delta(now(), $1::text, $2::uuid);`;

    const deltaRes = await pool.query(sqlDelta, params);
    const k = deltaRes.rows?.[0] ?? null;

    if (!k) {
      return NextResponse.json({ ok: true, window: windowCode, location_id: locationId ?? null, drivers: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    // ---- Drivers ----
    const drivers: OpsDriver[] = [];

    // Labor cost ratio (use your existing column labor_cost_ratio_pct)
    {
      const v = toNum(k.labor_cost_ratio_pct);
      const d = toNum(k.labor_ratio_delta_pp); // pp
      const sev: Severity = v === null ? "good" : v >= 30 ? "risk" : v >= 25 ? "warn" : "good";
      const score = scoreFrom(sev, d);

      drivers.push({
        id: "drv_labor_ratio",
        domain: "labor",
        severity: sev,
        title: "Labor % of sales",
        why: v === null ? "Labor ratio unavailable." : `Labor is ${v.toFixed(1)}% of sales.`,
        recommendation:
          sev === "risk"
            ? "Cut low-value hours, enforce schedule to forecast, reduce overtime, and tighten breaks."
            : sev === "warn"
            ? "Labor is elevated. Trim staffing in off-peak and align schedule to demand."
            : "Labor ratio is healthy. Maintain schedule discipline.",
        kpi_code: "LABOR_PCT",
        metric: { value: v, delta: d, unit: "pct" },
        score,
        impact_pct: toImpactPct(score),
      });
    }

    // Sales per labor hour
    {
      const v = toNum(k.sales_per_labor_hour);
      const d = toNum(k.sales_per_labor_hour_delta_pct);
      const sev: Severity = v === null ? "good" : v <= 80 ? "risk" : v <= 120 ? "warn" : "good";
      const score = scoreFrom(sev, d);

      drivers.push({
        id: "drv_splh",
        domain: "labor",
        severity: sev,
        title: "Sales per labor hour (SPLH)",
        why: v === null ? "SPLH unavailable." : `SPLH is $${v.toFixed(0)}.`,
        recommendation:
          sev === "risk"
            ? "Reduce staffing during low demand, cross-train, and tighten deployment by station."
            : sev === "warn"
            ? "SPLH is soft. Adjust staffing to peaks and reduce idle time."
            : "SPLH looks strong. Keep labor deployment tight.",
        kpi_code: "SPLH",
        metric: { value: v, delta: d, unit: "usd" },
        score,
        impact_pct: toImpactPct(score),
      });
    }

    // Labor hours
    {
      const v = toNum(k.labor_hours);
      const d = toNum(k.labor_hours_delta_pct);
      const sev: Severity = v === null ? "good" : d !== null && d > 15 ? "warn" : "good";
      const score = scoreFrom(sev, d);

      drivers.push({
        id: "drv_labor_hours",
        domain: "labor",
        severity: sev,
        title: "Labor hours volume",
        why: v === null ? "Labor hours unavailable." : `Labor hours: ${v.toFixed(0)}.`,
        recommendation:
          sev === "warn"
            ? "Hours are rising faster than expected. Validate schedule vs forecast and fix overstaffing blocks."
            : "Hours look in control. Maintain schedule cadence.",
        kpi_code: "LABOR_HOURS",
        metric: { value: v, delta: d, unit: "hours" },
        score,
        impact_pct: toImpactPct(score),
      });
    }

    drivers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topDrivers = drivers.slice(0, 8);

    return NextResponse.json(
      {
        ok: true,
        as_of: k?.as_of_ts ?? asOf ?? null,
        window: windowCode,
        location_id: locationId ?? null,
        drivers: topDrivers,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, drivers: [], error: e?.message ?? String(e) }, { status: 500 });
  }
}