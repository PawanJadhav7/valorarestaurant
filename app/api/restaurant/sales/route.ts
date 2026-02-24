// app/api/restaurant/sales/route.ts
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

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function severityFromDelta(deltaPct: number | null): Severity {
  if (deltaPct === null) return "good";
  if (deltaPct < -5) return "risk";
  if (deltaPct < 0) return "warn";
  return "good";
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

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = url.searchParams.get("location_id"); // optional UUID

    // param order:
    // - if asOf provided -> $1 = asOf
    // - $2 = windowCode
    // - $3 = locationId (uuid) or null
    const params = asOf ? [asOf, windowCode, locationId] : [windowCode, locationId];

    // ✅ Use DELTA KPI function
    const sqlDelta = asOf
      ? `SELECT * FROM analytics.get_sales_kpis_delta($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_sales_kpis_delta(now(), $1::text, $2::uuid);`;

    const sqlSeries = asOf
      ? `SELECT * FROM analytics.get_sales_timeseries_daily($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_sales_timeseries_daily(now(), $1::text, $2::uuid);`;

    const sqlTopItems = asOf
      ? `SELECT * FROM analytics.get_sales_top_items($1::timestamptz, $2::text, $3::uuid, 10);`
      : `SELECT * FROM analytics.get_sales_top_items(now(), $1::text, $2::uuid, 10);`;

    const sqlCategoryMix = asOf
      ? `SELECT * FROM analytics.get_sales_category_mix($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_sales_category_mix(now(), $1::text, $2::uuid);`;

    const sqlChannelMix = asOf
      ? `SELECT * FROM analytics.get_sales_channel_mix($1::timestamptz, $2::text, $3::uuid);`
      : `SELECT * FROM analytics.get_sales_channel_mix(now(), $1::text, $2::uuid);`;

    const [deltaRes, seriesRes, topRes, catRes, chRes] = await Promise.all([
      pool.query(sqlDelta, params),
      pool.query(sqlSeries, params),
      pool.query(sqlTopItems, params),
      pool.query(sqlCategoryMix, params),
      pool.query(sqlChannelMix, params),
    ]);

    const k = deltaRes.rows?.[0] ?? null;
    const rows = seriesRes.rows ?? [];

    // KPI tiles (with deltas)
    const kpis: Kpi[] = k
      ? [
          {
            code: "SALES_REVENUE",
            label: `Revenue (${windowCode.toUpperCase()})`,
            value: toNum(k.revenue),
            unit: "usd",
            delta: toNum(k.revenue_delta_pct),
            severity: severityFromDelta(toNum(k.revenue_delta_pct)),
            hint: "Total sales for selected window vs previous window.",
          },
          {
            code: "SALES_ORDERS",
            label: `Orders (${windowCode.toUpperCase()})`,
            value: toNum(k.orders),
            unit: "count",
            delta: toNum(k.orders_delta_pct),
            severity: severityFromDelta(toNum(k.orders_delta_pct)),
            hint: "Orders for selected window vs previous window.",
          },
          {
            code: "SALES_AOV",
            label: "Average Order Value",
            value: toNum(k.aov),
            unit: "usd",
            delta: toNum(k.aov_delta_pct),
            severity: severityFromDelta(toNum(k.aov_delta_pct)),
            hint: "AOV vs previous window.",
          },
          {
            code: "SALES_GROSS_MARGIN",
            label: "Gross Margin",
            value: toNum(k.gross_margin_pct), // 0..100
            unit: "pct",
            delta: toNum(k.gross_margin_delta_pp),
            severity: severityFromMargin(toNum(k.gross_margin_pct)),
            hint: "Gross margin % and change (pp) vs previous window.",
          },
          {
            code: "SALES_DISCOUNT_RATE",
            label: "Discount Rate",
            value: toNum(k.discount_rate_pct), // 0..100
            unit: "pct",
            delta: toNum(k.discount_rate_delta_pp),
            severity: severityFromDiscount(toNum(k.discount_rate_pct)),
            hint: "Discount rate % and change (pp) vs previous window.",
          },
        ]
      : [];

    // Series for charts (daily)
    const series = {
      day: rows.map((r) => String(r.day)),
      revenue: rows.map((r) => Number(r.revenue ?? 0)),
      orders: rows.map((r) => Number(r.orders ?? 0)),
      aov: rows.map((r) => (r.aov === null ? null : Number(r.aov))),
      gross_margin_pct: rows.map((r) => (r.gross_margin_pct === null ? null : Number(r.gross_margin_pct))),
      discount_rate_pct: rows.map((r) => (r.discount_rate_pct === null ? null : Number(r.discount_rate_pct))),
    };

    return NextResponse.json(
      {
        ok: true,
        as_of: k?.as_of_ts ?? null,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: { id: locationId ?? "all", name: locationId ? locationId : "All Locations" },
        kpis,
        series,
        top_items: topRes.rows ?? [],
        category_mix: catRes.rows ?? [],
        channel_mix: chRes.rows ?? [],
        raw: {
          delta_row: k,
          series_rows: rows.length,
          top_items: (topRes.rows ?? []).length,
          categories: (catRes.rows ?? []).length,
          channels: (chRes.rows ?? []).length,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/sales failed:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}