// app/api/restaurant/overview/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Unit = "usd" | "pct" | "count" | "days" | "ratio";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
};

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizePct(v: number): number {
  return v > 1.5 ? v / 100 : v;
}

function mapUnit(u: string | null | undefined): Unit {
  const x = String(u ?? "").toLowerCase();
  if (x.includes("%")) return "pct";
  if (x.includes("day")) return "days";
  if (x.includes("ratio")) return "ratio";
  if (x.includes("count")) return "count";
  return "usd";
}

function lastTwo(arr?: number[]) {
  if (!arr || arr.length < 2) return null;
  const prev = Number(arr[arr.length - 2]);
  const curr = Number(arr[arr.length - 1]);
  if (!Number.isFinite(prev) || !Number.isFinite(curr)) return null;
  return { prev, curr };
}

function deltaPct(prev: number, curr: number) {
  if (!Number.isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function rollingAvg(arr: number[], window = 7): number[] {
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(avg);
  }
  return out;
}

function mapCode(dbCode: string): { code: string; label: string; unit?: Unit } | null {
  const c = dbCode.toUpperCase();

  if (c === "NET_SALES") return { code: "REVENUE", label: "Net Sales", unit: "usd" };

  if (c === "COGS") return { code: "COGS", label: "COGS", unit: "usd" };
  if (c === "LABOR") return { code: "LABOR", label: "Labor", unit: "usd" };
  if (c === "PRIME_COST") return { code: "PRIME_COST", label: "Prime Cost", unit: "usd" };
  if (c === "FIXED_COSTS") return { code: "FIXED_COSTS", label: "Fixed Costs", unit: "usd" };

  if (c === "GROSS_PROFIT") return { code: "GROSS_PROFIT", label: "Gross Profit", unit: "usd" };
  if (c === "GROSS_MARGIN") return { code: "GROSS_MARGIN", label: "Gross Margin", unit: "pct" };

  if (c === "FOOD_COST_PCT") return { code: "FOOD_COST_RATIO", label: "Food Cost %", unit: "pct" };
  if (c === "LABOR_COST_PCT") return { code: "LABOR_COST_RATIO", label: "Labor Cost %", unit: "pct" };
  if (c === "PRIME_COST_PCT") return { code: "PRIME_COST_RATIO", label: "Prime Cost %", unit: "pct" };

  if (c === "FIXED_COST_COVERAGE_RATIO")
    return { code: "FIXED_COST_COVERAGE_RATIO", label: "Fixed Cost Coverage", unit: "ratio" };

  if (c === "BREAK_EVEN_REVENUE")
    return { code: "BREAK_EVEN_REVENUE", label: "Break-even Revenue", unit: "usd" };

  if (c === "SAFETY_MARGIN_PCT") return { code: "SAFETY_MARGIN", label: "Safety Margin", unit: "pct" };

  if (c === "EBIT") return { code: "EBIT", label: "EBIT", unit: "usd" };
  if (c === "INTEREST_EXPENSE") return { code: "INTEREST_EXPENSE", label: "Interest Expense", unit: "usd" };
  if (c === "INTEREST_COVERAGE_RATIO")
    return { code: "INTEREST_COVERAGE_RATIO", label: "Interest Coverage", unit: "ratio" };

  if (c === "DAYS_INVENTORY_ON_HAND")
    return { code: "DAYS_INVENTORY_ON_HAND", label: "Days Inventory", unit: "days" };
  if (c === "AR_DAYS") return { code: "AR_DAYS", label: "AR Days", unit: "days" };
  if (c === "AP_DAYS") return { code: "AP_DAYS", label: "AP Days", unit: "days" };
  if (c === "CASH_CONVERSION_CYCLE")
    return { code: "CASH_CONVERSION_CYCLE", label: "Cash Conversion Cycle", unit: "days" };

  if (c === "ORDERS") return { code: "ORDERS", label: "Orders", unit: "count" };
  if (c === "CUSTOMERS") return { code: "CUSTOMERS", label: "Customers", unit: "count" };
  if (c === "ARPU") return { code: "ARPU", label: "ARPU", unit: "usd" };

  return null;
}

type Agg = { values: number[]; sum: number; unit?: string };

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const locationIdParam = url.searchParams.get("location_id");
  const locationId = locationIdParam === null ? null : Number(locationIdParam);

  if (locationIdParam !== null && !Number.isFinite(locationId)) {
    return NextResponse.json({ ok: false, error: "location_id must be a number" }, { status: 400 });
  }

  const client = await pool.connect();

  async function bail(status: number, payload: any) {
    try {
      await client.query("rollback");
    } catch {}
    return NextResponse.json(payload, { status });
  }

  try {
    await client.query("begin");

    const tenantRes = await client.query(
      `
      select tenant_id
      from app.tenant_user
      where user_id = $1::uuid
      order by created_at asc
      limit 1
      `,
      [user.user_id]
    );

    const tenantId: string | null = tenantRes.rows?.[0]?.tenant_id ?? null;
    if (!tenantId) {
      return await bail(403, { ok: false, error: "User not linked to a tenant yet" });
    }

    await client.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);

    const allowedRes = await client.query(
      `
      with tenant_allowed as (
        select tl.location_id::bigint as location_id
        from app.tenant_location tl
        where tl.tenant_id = $1::uuid
          and tl.is_active = true
      ),
      user_allowed as (
        select ul.location_id::bigint as location_id
        from app.user_location ul
        where ul.tenant_id = $1::uuid
          and ul.user_id = $2::uuid
          and ul.is_active = true
      ),
      effective as (
        select location_id from user_allowed
        union all
        select ta.location_id
        from tenant_allowed ta
        where not exists (select 1 from user_allowed)
      )
      select distinct location_id
      from effective
      order by 1
      `,
      [tenantId, user.user_id]
    );

    const allowedIds = allowedRes.rows.map((r) => Number(r.location_id)).filter(Number.isFinite);

    if (allowedIds.length === 0) {
      return await bail(403, { ok: false, error: "No locations assigned to this tenant/user yet" });
    }

    if (locationId !== null && !allowedIds.includes(locationId)) {
      return await bail(403, { ok: false, error: "Forbidden location" });
    }

    const kpiRes = await client.query(
      `
      with allowed as (
        select unnest($1::bigint[]) as location_id
      )
      select *
      from analytics.get_executive_kpis_by_location(now())
      where location_id in (select location_id from allowed)
        and ($2::bigint is null or location_id = $2::bigint)
      `,
      [allowedIds, locationId]
    );

    const rows = kpiRes.rows;

    const seriesRes = await client.query(
      `
      with allowed as (
        select unnest($1::bigint[]) as location_id
      )
      select
        day::date,
        sum(revenue) as revenue,
        sum(cogs) as cogs,
        sum(labor) as labor
      from restaurant.raw_restaurant_daily
      where day >= current_date - interval '30 days'
        and location_id_bigint in (select location_id from allowed)
        and ($2::bigint is null or location_id_bigint = $2::bigint)
      group by 1
      order by 1
      `,
      [allowedIds, locationId]
    );

    const daily = seriesRes.rows;

    const revenueSeries: number[] = [];
    const gmSeries: number[] = [];
    const foodSeries: number[] = [];
    const laborSeries: number[] = [];
    const primeSeries: number[] = [];

    for (const d of daily) {
      const rev = Number(d.revenue);
      const cogs = Number(d.cogs);
      const labor = Number(d.labor);

      revenueSeries.push(rev);

      if (rev > 0) {
        gmSeries.push(((rev - cogs) / rev) * 100);
        foodSeries.push((cogs / rev) * 100);
        laborSeries.push((labor / rev) * 100);
        primeSeries.push(((cogs + labor) / rev) * 100);
      } else {
        gmSeries.push(0);
        foodSeries.push(0);
        laborSeries.push(0);
        primeSeries.push(0);
      }
    }

    const series: Record<string, number[]> = {
      REVENUE: rollingAvg(revenueSeries),
      GROSS_MARGIN: rollingAvg(gmSeries).map(normalizePct),
      FOOD_COST_RATIO: rollingAvg(foodSeries).map(normalizePct),
      LABOR_COST_RATIO: rollingAvg(laborSeries).map(normalizePct),
      PRIME_COST_RATIO: rollingAvg(primeSeries).map(normalizePct),
    };

    const byCode = new Map<string, Agg>();

    for (const row of rows) {
      const v = toNum(row.kpi_value);
      if (v === null) continue;

      const key = String(row.kpi_code);
      const cur = byCode.get(key) ?? { values: [], sum: 0, unit: row.unit as string | undefined };

      cur.values.push(v);
      cur.sum += v;
      cur.unit = cur.unit ?? (row.unit as string | undefined);

      byCode.set(key, cur);
    }

    const kpis: Kpi[] = [];

    for (const [dbCode, agg] of byCode.entries()) {
      const mapped = mapCode(dbCode);
      if (!mapped) continue;

      const unit = mapped.unit ?? mapUnit(agg.unit);

      const raw =
        unit === "pct" ? agg.values.reduce((a, b) => a + b, 0) / agg.values.length : agg.sum;

      const normalized = unit === "pct" ? normalizePct(raw) : raw;

      const s = series[mapped.code];
      const pair = lastTwo(s);

      let delta: number | null = null;
      if (pair) {
        delta = unit === "pct" ? pair.curr - pair.prev : deltaPct(pair.prev, pair.curr);
      }

      kpis.push({
        code: mapped.code,
        label: mapped.label,
        value: normalized,
        unit,
        delta,
      });
    }

    await client.query("commit");

    return NextResponse.json({
      ok: true,
      as_of: refreshedAt,
      refreshed_at: refreshedAt,
      tenant_id: tenantId,
      location: { id: locationId ?? "all" },
      allowed_location_ids: allowedIds,
      kpis,
      series,
    });
  } catch (e: any) {
    try {
      await client.query("rollback");
    } catch {}

    return NextResponse.json({ ok: false, error: e?.message ?? "Overview API failed" }, { status: 500 });
  } finally {
    client.release();
  }
}