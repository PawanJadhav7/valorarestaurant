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

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams); // int or null

    // Build params:
    // If asOf is provided => [$1=asOf, $2=window, $3=location]
    // else => [$1=window, $2=location] and DB uses now()
    const params = asOf ? [asOf, windowCode, locationId] : [windowCode, locationId];

    const sqlDelta = asOf
      ? `SELECT * FROM analytics.get_sales_kpis_delta($1::timestamptz, $2::text, $3::int);`
      : `SELECT * FROM analytics.get_sales_kpis_delta(now(), $1::text, $2::int);`;

    const sqlSeries = asOf
      ? `SELECT * FROM analytics.get_sales_timeseries_daily($1::timestamptz, $2::text, $3::int);`
      : `SELECT * FROM analytics.get_sales_timeseries_daily(now(), $1::text, $2::int);`;

    const sqlTopItems = asOf
      ? `SELECT * FROM analytics.get_sales_top_items($1::timestamptz, $2::text, $3::int, 10);`
      : `SELECT * FROM analytics.get_sales_top_items(now(), $1::text, $2::int, 10);`;

    const sqlCategoryMix = asOf
      ? `SELECT * FROM analytics.get_sales_category_mix($1::timestamptz, $2::text, $3::int);`
      : `SELECT * FROM analytics.get_sales_category_mix(now(), $1::text, $2::int);`;

    const sqlChannelMix = asOf
      ? `SELECT * FROM analytics.get_sales_channel_mix($1::timestamptz, $2::text, $3::int);`
      : `SELECT * FROM analytics.get_sales_channel_mix(now(), $1::text, $2::int);`;

    // Run queries (parallel)
    const [deltaRes, seriesRes, topRes, catRes, channelRes] = await Promise.all([
      pool.query(sqlDelta, params),
      pool.query(sqlSeries, params),
      pool.query(sqlTopItems, params),
      pool.query(sqlCategoryMix, params),
      pool.query(sqlChannelMix, params),
    ]);

    const d = deltaRes.rows?.[0] ?? null;

    const revenue = toNum(d?.revenue);
    const revenueDeltaPct = toNum(d?.revenue_delta_pct);

    const orders = d?.orders === null || d?.orders === undefined ? null : Number(d.orders);
    const ordersDeltaPct = toNum(d?.orders_delta_pct);

    const aov = toNum(d?.aov);
    const aovDeltaPct = toNum(d?.aov_delta_pct);

    const grossMarginPct = toNum(d?.gross_margin_pct);
    const grossMarginDeltaPp = toNum(d?.gross_margin_delta_pp);

    const discountRatePct = toNum(d?.discount_rate_pct);
    const discountRateDeltaPp = toNum(d?.discount_rate_delta_pp);

    const kpis: Kpi[] = [
      {
        code: "SALES_REVENUE",
        label: `Revenue (${windowCode.toUpperCase()})`,
        value: revenue,
        unit: "usd",
        delta: revenueDeltaPct,
        severity: severityFromDelta(revenueDeltaPct),
        hint: "Total sales for selected window vs previous window.",
      },
      {
        code: "SALES_ORDERS",
        label: `Orders (${windowCode.toUpperCase()})`,
        value: orders,
        unit: "count",
        delta: ordersDeltaPct,
        severity: severityFromDelta(ordersDeltaPct),
        hint: "Orders for selected window vs previous window.",
      },
      {
        code: "SALES_AOV",
        label: "Average Order Value",
        value: aov,
        unit: "usd",
        delta: aovDeltaPct,
        severity: severityFromDelta(aovDeltaPct),
        hint: "AOV vs previous window.",
      },
      {
        code: "SALES_GROSS_MARGIN",
        label: "Gross Margin",
        value: grossMarginPct,
        unit: "pct",
        delta: grossMarginDeltaPp,
        severity: severityFromMargin(grossMarginPct),
        hint: "Gross margin % and change (pp) vs previous window.",
      },
      {
        code: "SALES_DISCOUNT_RATE",
        label: "Discount Rate",
        value: discountRatePct,
        unit: "pct",
        delta: discountRateDeltaPp,
        severity: severityFromDiscount(discountRatePct),
        hint: "Discount rate % and change (pp) vs previous window.",
      },
    ];

    const seriesRows = seriesRes.rows ?? [];
    const series = {
      day: seriesRows.map((r: any) => new Date(r.day).toString()),
      revenue: seriesRows.map((r: any) => toNum(r.revenue)),
      orders: seriesRows.map((r: any) => (r.orders == null ? null : Number(r.orders))),
      aov: seriesRows.map((r: any) => toNum(r.aov)),
      gross_margin_pct: seriesRows.map((r: any) => toNum(r.gross_margin_pct)),
      discount_rate_pct: seriesRows.map((r: any) => toNum(r.discount_rate_pct)),
    };

    const top_items = (topRes.rows ?? []).map((r: any) => ({
      item_name: String(r.item_name),
      quantity: String(r.quantity),
      revenue: String(r.revenue),
      share_pct: String(r.share_pct),
    }));

    const category_mix = (catRes.rows ?? []).map((r: any) => ({
      category: String(r.category),
      revenue: String(r.revenue),
      share_pct: String(r.share_pct),
    }));

    const channel_mix = (channelRes.rows ?? []).map((r: any) => ({
      order_channel: String(r.order_channel),
      revenue: String(r.revenue),
      share_pct: String(r.share_pct),
    }));

    return NextResponse.json({
      ok: true,
      as_of: d?.as_of_ts ? new Date(d.as_of_ts).toISOString() : asOf,
      refreshed_at: refreshedAt,
      window: windowCode,
      location: { id: locationId ?? "all", name: locationId ? String(locationId) : "All Locations" },
      kpis,
      series,
      top_items,
      category_mix,
      channel_mix,
      raw: {
        delta_row: d,
        series_rows: seriesRows.length,
        top_items: top_items.length,
        categories: category_mix.length,
        channels: channel_mix.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "sales route error",
      },
      { status: 500 }
    );
  }
}