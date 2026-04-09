// frontend/app/api/restaurant/labor/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count" | "hours";

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

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
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

function pctDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null || prevVal === 0) return null;
  return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
}

function ppDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null) return null;
  return Number((currVal - prevVal).toFixed(2));
}

function severityFromHigherIsBad(value: number | null, warnAt: number, riskAt: number): Severity {
  if (value === null) return "good";
  if (value >= riskAt) return "risk";
  if (value >= warnAt) return "warn";
  return "good";
}

function severityFromLowerIsBad(value: number | null, warnAt: number, riskAt: number): Severity {
  if (value === null) return "good";
  if (value <= riskAt) return "risk";
  if (value <= warnAt) return "warn";
  return "good";
}

function windowDays(windowCode: "7d" | "30d" | "90d" | "ytd", asOfDate: Date): number {
  if (windowCode === "7d") return 7;
  if (windowCode === "30d") return 30;
  if (windowCode === "90d") return 90;
  const yearStart = new Date(Date.UTC(asOfDate.getUTCFullYear(), 0, 1));
  const diffMs = asOfDate.getTime() - yearStart.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const tenantRes = await pool.query(
      `
      select tenant_id
      from app.tenant_user
      where user_id = $1::uuid
      order by created_at asc
      limit 1
      `,
      [user.user_id]
    );

    const tenantId = tenantRes.rows?.[0]?.tenant_id;

    if (!tenantId) {
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          window: "30d",
          location: { id: "all", name: "All Locations" },
          kpis: [],
          series: {},
          notes: "No labor data available yet.",
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const url = new URL(req.url);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    let asOf = parseAsOf(url.searchParams);
    if (!asOf) {
      const anchorSql = locationId
        ? `
          select max(day)::timestamptz as as_of_ts
          from analytics.v_gold_daily
          where tenant_id = $1::uuid
            and location_id = $2::bigint
        `
        : `
          select max(day)::timestamptz as as_of_ts
          from analytics.v_gold_daily
          where tenant_id = $1::uuid
        `;

      const r = await pool.query(
        anchorSql,
        locationId ? [tenantId, locationId] : [tenantId]
      );

      const ts = r.rows?.[0]?.as_of_ts;
      asOf = ts ? new Date(ts).toISOString() : null;
    }

    if (!asOf) {
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          window: windowCode,
          location: {
            id: locationId ?? "all",
            name: locationId ? `Location ${locationId}` : "All Locations",
          },
          kpis: [],
          series: {},
          notes: "No labor data available yet.",
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
        select f.*
        from analytics.v_gold_daily f
        cross join params p
        where f.tenant_id = $4::uuid
          and f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(labor), 0)::numeric as labor_cost,
        coalesce(sum(labor_hours), 0)::numeric as labor_hours,
        coalesce(sum(overtime_hours), 0)::numeric as overtime_hours,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        coalesce(avg(sales_per_labor_hour), 0)::numeric as sales_per_labor_hour
      from curr
      `,
      [asOf, days, locationId, tenantId]
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
        select f.*
        from analytics.v_gold_daily f
        cross join prev_range p
        where f.tenant_id = $4::uuid
          and f.day between p.prev_start and p.prev_end
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(sum(revenue), 0)::numeric as revenue,
        coalesce(sum(labor), 0)::numeric as labor_cost,
        coalesce(sum(labor_hours), 0)::numeric as labor_hours,
        coalesce(sum(overtime_hours), 0)::numeric as overtime_hours,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        coalesce(avg(sales_per_labor_hour), 0)::numeric as sales_per_labor_hour
      from prev
      `,
      [asOf, days, locationId, tenantId]
    );

    const seriesRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      curr as (
        select f.*
        from analytics.v_gold_daily f
        cross join params p
        where f.tenant_id = $4::uuid
          and f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        day,
        coalesce(sum(labor), 0)::numeric as labor_cost,
        coalesce(sum(labor_hours), 0)::numeric as labor_hours,
        coalesce(sum(overtime_hours), 0)::numeric as overtime_hours,
        coalesce(avg(labor_cost_pct), 0)::numeric * 100 as labor_pct,
        case
          when coalesce(sum(labor_hours), 0) = 0 then 0
          else round((sum(overtime_hours) / sum(labor_hours) * 100)::numeric, 2)
        end as overtime_pct,
        coalesce(avg(sales_per_labor_hour), 0)::numeric as sales_per_labor_hour
      from curr
      group by day
      order by day
      `,
      [asOf, days, locationId, tenantId]
    );

    const curr = currRes.rows?.[0] ?? {};
    const prev = prevRes.rows?.[0] ?? {};
    const rows = seriesRes.rows ?? [];

    const laborCost = toNum(curr.labor_cost);
    const laborHours = toNum(curr.labor_hours);
    const overtimeHours = toNum(curr.overtime_hours);
    const laborPct = toNum(curr.labor_pct);
    const salesPerLaborHour = toNum(curr.sales_per_labor_hour);

    const prevLaborCost = toNum(prev.labor_cost);
    const prevLaborHours = toNum(prev.labor_hours);
    const prevOvertimeHours = toNum(prev.overtime_hours);
    const prevLaborPct = toNum(prev.labor_pct);
    const prevSalesPerLaborHour = toNum(prev.sales_per_labor_hour);

    const overtimePct =
      laborHours !== null && laborHours > 0 && overtimeHours !== null
        ? Number(((overtimeHours / laborHours) * 100).toFixed(2))
        : 0;

    const prevOvertimePct =
      prevLaborHours !== null && prevLaborHours > 0 && prevOvertimeHours !== null
        ? Number(((prevOvertimeHours / prevLaborHours) * 100).toFixed(2))
        : null;

    const avgHourlyRate =
      laborCost !== null && laborHours !== null && laborHours > 0
        ? Number((laborCost / laborHours).toFixed(2))
        : null;

    const prevAvgHourlyRate =
      prevLaborCost !== null && prevLaborHours !== null && prevLaborHours > 0
        ? Number((prevLaborCost / prevLaborHours).toFixed(2))
        : null;

    const kpis: Kpi[] = [
      {
        code: "LABOR_COST",
        label: "Labor Cost",
        value: laborCost,
        unit: "usd",
        delta: pctDelta(prevLaborCost, laborCost),
        severity: "good",
        hint: "Total labor cost for selected window.",
      },
      {
        code: "LABOR_HOURS",
        label: "Labor Hours",
        value: laborHours,
        unit: "hours",
        delta: pctDelta(prevLaborHours, laborHours),
        severity: "good",
        hint: "Total labor hours for selected window.",
      },
      {
        code: "LABOR_PCT",
        label: "Labor %",
        value: laborPct,
        unit: "pct",
        delta: ppDelta(prevLaborPct, laborPct),
        severity: severityFromHigherIsBad(laborPct, 28, 34),
        hint: "Labor cost as % of revenue.",
      },
      {
        code: "OVERTIME_HOURS",
        label: "Overtime Hours",
        value: overtimeHours,
        unit: "hours",
        delta: pctDelta(prevOvertimeHours, overtimeHours),
        severity: severityFromHigherIsBad(overtimeHours, 100, 250),
        hint: "Total overtime hours.",
      },
      {
        code: "OVERTIME_PCT",
        label: "Overtime %",
        value: overtimePct,
        unit: "pct",
        delta: ppDelta(prevOvertimePct, overtimePct),
        severity: severityFromHigherIsBad(overtimePct, 5, 10),
        hint: "Overtime as % of labor hours.",
      },
      {
        code: "AVG_HOURLY_RATE",
        label: "Avg Hourly Rate",
        value: avgHourlyRate,
        unit: "usd",
        delta: pctDelta(prevAvgHourlyRate, avgHourlyRate),
        severity: "good",
        hint: "Labor cost divided by labor hours.",
      },
      {
        code: "SPLH",
        label: "Sales / Labor Hour",
        value: salesPerLaborHour,
        unit: "usd",
        delta: pctDelta(prevSalesPerLaborHour, salesPerLaborHour),
        severity: severityFromLowerIsBad(salesPerLaborHour, 120, 80),
        hint: "Revenue generated per labor hour.",
      },
    ];

    return NextResponse.json(
      {
        ok: true,
        as_of: asOf,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: {
          id: locationId ?? "all",
          name: locationId ? `Location ${locationId}` : "All Locations",
        },
        kpis,
        series: {
          LABOR_COST: rows.map((r: any) => Number(r.labor_cost ?? 0)),
          LABOR_HOURS: rows.map((r: any) => Number(r.labor_hours ?? 0)),
          LABOR_PCT: rows.map((r: any) => Number(r.labor_pct ?? 0)),
          OVERTIME_HOURS: rows.map((r: any) => Number(r.overtime_hours ?? 0)),
          OVERTIME_PCT: rows.map((r: any) => Number(r.overtime_pct ?? 0)),
          AVG_HOURLY_RATE: rows.map((r: any) => {
            const lc = Number(r.labor_cost ?? 0);
            const lh = Number(r.labor_hours ?? 0);
            return lh > 0 ? Number((lc / lh).toFixed(2)) : 0;
          }),
          SPLH: rows.map((r: any) => Number(r.sales_per_labor_hour ?? 0)),
        },
        notes: "Labor page is currently powered from f_location_daily_features.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/labor failed:", e);
    return NextResponse.json(
      { ok: false, kpis: [], series: {}, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}