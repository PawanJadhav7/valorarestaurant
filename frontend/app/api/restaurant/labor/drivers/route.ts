//frontend/app/api/restaurant/labor/drivers/route.ts
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
  return (["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d") as
    | "7d"
    | "30d"
    | "90d"
    | "ytd";
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

function windowDays(windowCode: "7d" | "30d" | "90d" | "ytd", asOfDate: Date): number {
  if (windowCode === "7d") return 7;
  if (windowCode === "30d") return 30;
  if (windowCode === "90d") return 90;
  const yearStart = new Date(Date.UTC(asOfDate.getUTCFullYear(), 0, 1));
  const diffMs = asOfDate.getTime() - yearStart.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

function pctDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null || prevVal === 0) return null;
  return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
}

function ppDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null) return null;
  return Number((currVal - prevVal).toFixed(2));
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const windowCode = parseWindow(url.searchParams);
  let asOf = parseAsOf(url.searchParams);
  const locationId = parseLocationId(url.searchParams);

  try {
    if (!asOf) {
      const r = await pool.query(`
        select max(day)::timestamptz as as_of_ts
        from restaurant.f_location_daily_features
      `);
      const ts = r.rows?.[0]?.as_of_ts;
      asOf = ts ? new Date(ts).toISOString() : null;
    }

    if (!asOf) {
      return NextResponse.json(
        {
          ok: true,
          window: windowCode,
          location_id: locationId ?? null,
          drivers: [],
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
        select *
        from restaurant.f_location_daily_features f
        cross join params p
        where f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(labor), 0)::numeric as labor_cost,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct
      from curr
      `,
      [asOf, days, locationId]
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
        select *
        from restaurant.f_location_daily_features f
        cross join prev_range p
        where f.day between p.prev_start and p.prev_end
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(labor), 0)::numeric as labor_cost,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        coalesce(sum(labor_hours), 0)::numeric as labor_hours,
        coalesce(avg(sales_per_labor_hour), 0)::numeric as sales_per_labor_hour
      from prev
      `,
      [asOf, days, locationId]
    );

    const curr = currRes.rows?.[0] ?? {};
    const prev = prevRes.rows?.[0] ?? {};

    const revenue = toNum(curr.revenue);
    const laborCost = toNum(curr.labor_cost);
    const laborPct = toNum(curr.labor_pct);

    const prevRevenue = toNum(prev.revenue);
    const prevLaborCost = toNum(prev.labor_cost);
    const prevLaborPct = toNum(prev.labor_pct);

    const laborHours =
      laborCost !== null ? Number((laborCost / 22).toFixed(2)) : null;

    const prevLaborHours =
      prevLaborCost !== null ? Number((prevLaborCost / 22).toFixed(2)) : null;

    const splh =
      laborHours && laborHours > 0 && revenue !== null
        ? Number((revenue / laborHours).toFixed(2))
        : null;

    const prevSplh =
      prevLaborHours && prevLaborHours > 0 && prevRevenue !== null
        ? Number((prevRevenue / prevLaborHours).toFixed(2))
        : null;

    const drivers: OpsDriver[] = [];

    {
      const d = ppDelta(prevLaborPct, laborPct);
      const sev: Severity =
        laborPct === null ? "good" : laborPct >= 30 ? "risk" : laborPct >= 25 ? "warn" : "good";
      const score = scoreFrom(sev, d);

      drivers.push({
        id: "drv_labor_ratio",
        domain: "labor",
        severity: sev,
        title: "Labor % of sales",
        why:
          laborPct === null
            ? "Labor ratio unavailable."
            : `Labor is ${laborPct.toFixed(1)}% of sales.`,
        recommendation:
          sev === "risk"
            ? "Cut low-value hours, align schedule to demand, reduce overtime, and tighten break compliance."
            : sev === "warn"
            ? "Labor is elevated. Trim off-peak coverage and align staffing more tightly to demand."
            : "Labor ratio is healthy. Maintain schedule discipline.",
        kpi_code: "LABOR_PCT",
        metric: { value: laborPct, delta: d, unit: "pct" },
        score,
        impact_pct: toImpactPct(score),
      });
    }

    {
      const d = pctDelta(prevSplh, splh);
      const sev: Severity =
        splh === null ? "good" : splh <= 80 ? "risk" : splh <= 120 ? "warn" : "good";
      const score = scoreFrom(sev, d);

      drivers.push({
        id: "drv_splh",
        domain: "labor",
        severity: sev,
        title: "Sales per labor hour (SPLH)",
        why:
          splh === null
            ? "SPLH unavailable."
            : `SPLH is $${splh.toFixed(0)}.`,
        recommendation:
          sev === "risk"
            ? "Reduce staffing during low demand, cross-train staff, and tighten station deployment."
            : sev === "warn"
            ? "SPLH is soft. Adjust staffing to peaks and reduce idle time."
            : "SPLH looks strong. Keep labor deployment tight.",
        kpi_code: "SPLH",
        metric: { value: splh, delta: d, unit: "usd" },
        score,
        impact_pct: toImpactPct(score),
      });
    }

    {
      const d = pctDelta(prevLaborHours, laborHours);
      const sev: Severity =
        laborHours === null ? "good" : d !== null && d > 15 ? "warn" : "good";
      const score = scoreFrom(sev, d);

      drivers.push({
        id: "drv_labor_hours",
        domain: "labor",
        severity: sev,
        title: "Labor hours volume",
        why:
          laborHours === null
            ? "Labor hours unavailable."
            : `Estimated labor hours: ${laborHours.toFixed(0)}.`,
        recommendation:
          sev === "warn"
            ? "Hours are rising faster than expected. Validate schedule vs forecast and remove overstaffed blocks."
            : "Hours look in control. Maintain schedule cadence.",
        kpi_code: "LABOR_HOURS",
        metric: { value: laborHours, delta: d, unit: "hours" },
        score,
        impact_pct: toImpactPct(score),
      });
    }

    drivers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return NextResponse.json(
      {
        ok: true,
        as_of: asOf,
        window: windowCode,
        location_id: locationId ?? null,
        drivers: drivers.slice(0, 8),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, drivers: [], error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}