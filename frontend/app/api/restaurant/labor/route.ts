// app/api/restaurant/labor/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

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

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseUuid(url.searchParams, "location_id");

    const params = asOf ? [asOf, windowCode, locationId] : [windowCode, locationId];

    const sqlDelta = asOf
      ? `SELECT * FROM analytics.get_ops_kpis_delta($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_ops_kpis_delta(now(), $1::text, $2::uuid);`;

    const sqlSeries = asOf
      ? `SELECT * FROM analytics.get_ops_timeseries_daily($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_ops_timeseries_daily(now(), $1::text, $2::uuid);`;

    const [deltaRes, seriesRes] = await Promise.all([
      pool.query(sqlDelta, params),
      pool.query(sqlSeries, params),
    ]);

    const k = deltaRes.rows?.[0] ?? null;
    const rows = seriesRes.rows ?? [];

    const kpis: Kpi[] = k
      ? [
          {
            code: "LABOR_COST",
            label: "Labor Cost",
            value: toNum(k.labor_cost),
            unit: "usd",
            delta: toNum(k.labor_cost_delta_pct),
            severity: "good",
            hint: "Total labor cost vs previous window (%).",
          },
          {
            code: "LABOR_HOURS",
            label: "Labor Hours",
            value: toNum(k.labor_hours),
            unit: "count",
            delta: toNum(k.labor_hours_delta_pct),
            severity: "good",
            hint: "Total labor hours vs previous window (%).",
          },
          {
            code: "AVG_HOURLY_RATE",
            label: "Avg Hourly Rate",
            value: toNum(k.avg_hourly_rate),
            unit: "usd",
            delta: null,
            severity: "good",
            hint: "Labor cost / labor hours.",
          },
          {
            code: "LABOR_COST_RATIO",
            label: "Labor Cost Ratio",
            value: toNum(k.labor_cost_ratio_pct),
            unit: "pct",
            delta: toNum(k.labor_ratio_delta_pp),
            severity: "good",
            hint: "Labor % of revenue (delta in pp).",
          },
          {
            code: "SALES_PER_LABOR_HOUR",
            label: "Sales per Labor Hour",
            value: toNum(k.sales_per_labor_hour),
            unit: "usd",
            delta: toNum(k.sales_per_labor_hour_delta_pct),
            severity: "good",
            hint: "Revenue / labor hours vs previous window (%).",
          },
        ]
      : [];

    const series = {
      day: rows.map((r) => String(r.day)),
      revenue: rows.map((r) => Number(r.revenue ?? 0)),
      labor_cost: rows.map((r) => Number(r.labor_cost ?? 0)),
      labor_hours: rows.map((r) => Number(r.labor_hours ?? 0)),
      labor_cost_ratio_pct: rows.map((r) =>
        r.labor_cost_ratio_pct === null ? null : Number(r.labor_cost_ratio_pct)
      ),
      sales_per_labor_hour: rows.map((r) =>
        r.sales_per_labor_hour === null ? null : Number(r.sales_per_labor_hour)
      ),
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
        raw: { delta_row: Boolean(k), series_rows: rows.length },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/labor failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}