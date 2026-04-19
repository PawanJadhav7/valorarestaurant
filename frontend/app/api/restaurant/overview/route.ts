import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Unit = "usd" | "pct" | "count" | "days" | "ratio";
type Severity = "good" | "warn" | "risk";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
};

type Agg = { values: number[]; sum: number; unit?: string };

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

function computeSeverity(code: string, value: number | null, delta: number | null): Severity {
  if (value === null) return "good";
  switch (code) {
    case "REVENUE":
      if (delta !== null && delta < -5) return "risk";
      if (delta !== null && delta < 0) return "warn";
      return "good";
    case "GROSS_MARGIN":
      if (value < 0.5) return "risk";
      if (value < 0.6) return "warn";
      return "good";
    case "FOOD_COST_RATIO":
      if (value >= 0.34) return "risk";
      if (value >= 0.3) return "warn";
      return "good";
    case "LABOR_COST_RATIO":
      if (value >= 0.32) return "risk";
      if (value >= 0.28) return "warn";
      return "good";
    case "PRIME_COST_RATIO":
      if (value >= 0.65) return "risk";
      if (value >= 0.6) return "warn";
      return "good";
    case "DAYS_INVENTORY_ON_HAND":
      if (value >= 100) return "risk";
      if (value >= 75) return "warn";
      return "good";
    case "CASH_CONVERSION_CYCLE":
      if (value >= 45) return "risk";
      if (value >= 30) return "warn";
      return "good";
    case "FIXED_COST_COVERAGE_RATIO":
    case "INTEREST_COVERAGE_RATIO":
      if (value < 1) return "risk";
      if (value < 1.5) return "warn";
      return "good";
    case "SAFETY_MARGIN":
      if (value < 0.05) return "risk";
      if (value < 0.1) return "warn";
      return "good";
    default:
      return "good";
  }
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
  if (c === "FIXED_COST_COVERAGE_RATIO") return { code: "FIXED_COST_COVERAGE_RATIO", label: "Fixed Cost Coverage", unit: "ratio" };
  if (c === "BREAK_EVEN_REVENUE") return { code: "BREAK_EVEN_REVENUE", label: "Break-even Revenue", unit: "usd" };
  if (c === "SAFETY_MARGIN_PCT") return { code: "SAFETY_MARGIN", label: "Safety Margin", unit: "pct" };
  if (c === "EBIT") return { code: "EBIT", label: "EBIT", unit: "usd" };
  if (c === "INTEREST_EXPENSE") return { code: "INTEREST_EXPENSE", label: "Interest Expense", unit: "usd" };
  if (c === "INTEREST_COVERAGE_RATIO") return { code: "INTEREST_COVERAGE_RATIO", label: "Interest Coverage", unit: "ratio" };
  if (c === "DAYS_INVENTORY_ON_HAND") return { code: "DAYS_INVENTORY_ON_HAND", label: "Days Inventory", unit: "days" };
  if (c === "AR_DAYS") return { code: "AR_DAYS", label: "AR Days", unit: "days" };
  if (c === "AP_DAYS") return { code: "AP_DAYS", label: "AP Days", unit: "days" };
  if (c === "CASH_CONVERSION_CYCLE") return { code: "CASH_CONVERSION_CYCLE", label: "Cash Conversion Cycle", unit: "days" };
  if (c === "ORDERS") return { code: "ORDERS", label: "Orders", unit: "count" };
  if (c === "CUSTOMERS") return { code: "CUSTOMERS", label: "Customers", unit: "count" };
  if (c === "ARPU") return { code: "ARPU", label: "ARPU", unit: "usd" };
  return null;
}

const EMPTY_SERIES = {
  REVENUE: [], ORDERS: [], CUSTOMERS: [], ARPU: [],
  COGS: [], LABOR: [], PRIME_COST: [], GROSS_PROFIT: [],
  GROSS_MARGIN: [], FOOD_COST_RATIO: [], LABOR_COST_RATIO: [], PRIME_COST_RATIO: [],
  FIXED_COSTS: [], FIXED_COST_COVERAGE_RATIO: [], BREAK_EVEN_REVENUE: [], SAFETY_MARGIN: [],
  DAYS_INVENTORY_ON_HAND: [], AR_DAYS: [], AP_DAYS: [], CASH_CONVERSION_CYCLE: [],
  EBIT: [], INTEREST_EXPENSE: [], INTEREST_COVERAGE_RATIO: [],
};

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const locationIdParam = url.searchParams.get("location_id");
  const dayParam = url.searchParams.get("day");
  const rangeParam = url.searchParams.get("range") ?? "30d";
  let locationId: number | null = null;
  if (locationIdParam && locationIdParam.trim().toLowerCase() !== "all") {
    locationId = Number(locationIdParam);
    if (!Number.isFinite(locationId)) {
      return NextResponse.json({ ok: false, error: "location_id must be a number" }, { status: 400 });
    }
  }

  const client = await pool.connect();
  async function bail(status: number, payload: any) {
    try { await client.query("rollback"); } catch {}
    return NextResponse.json(payload, { status });
  }

  try {
    await client.query("begin");

    // ── Resolve ALL tenants for this user ─────────────────────────────────
    const tenantRes = await client.query(
      `SELECT COALESCE(uc.tenant_id, tu.tenant_id)::text as tenant_id
       FROM app.tenant_user tu
       LEFT JOIN app.user_context uc ON uc.user_id = tu.user_id
       WHERE tu.user_id = $1::uuid
       ORDER BY CASE WHEN uc.tenant_id IS NOT NULL THEN 0 ELSE 1 END, tu.created_at ASC
       LIMIT 1`,
      [user.user_id]
    );
    const activeTenantId: string | null = tenantRes.rows[0]?.tenant_id ?? null;
    if (!activeTenantId) return await bail(403, { ok: false, error: "User not linked to a tenant yet" });
    const allTenantRes = await client.query(
      `SELECT tenant_id FROM app.tenant_user WHERE user_id = $1::uuid`,
      [user.user_id]
    );
    const tenantIds: string[] = allTenantRes.rows.map((r: any) => r.tenant_id);
    const tenantId: string | null = activeTenantId;

    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantIds.join(',')]);

    // ── Allowed locations across ALL tenants ──────────────────────────────
    const allowedRes = await client.query(
      `
      WITH tenant_allowed AS (
        SELECT tl.location_id::bigint AS location_id
        FROM app.tenant_location tl
        WHERE tl.tenant_id = ANY($1::uuid[])
          AND tl.is_active = true
      ),
      user_allowed AS (
        SELECT ul.location_id::bigint AS location_id
        FROM app.user_location ul
        WHERE ul.tenant_id = ANY($1::uuid[])
          AND ul.user_id = $2::uuid
          AND ul.is_active = true
      ),
      effective AS (
        SELECT location_id FROM user_allowed
        UNION ALL
        SELECT ta.location_id FROM tenant_allowed ta
        WHERE NOT EXISTS (SELECT 1 FROM user_allowed)
      )
      SELECT DISTINCT location_id FROM effective ORDER BY 1
      `,
      [tenantIds, user.user_id]
    );

    const allowedIds = allowedRes.rows.map((r) => Number(r.location_id)).filter(Number.isFinite);

    if (allowedIds.length === 0) {
      await client.query("commit");
      return NextResponse.json({
        ok: true, as_of: refreshedAt, refreshed_at: refreshedAt,
        tenant_id: tenantId, location: { id: locationId ?? "all" },
        allowed_location_ids: [], kpis: [], series: EMPTY_SERIES,
        raw: { has_data: false, reason: "no_allowed_locations" },
      });
    }

    if (locationId !== null && !allowedIds.includes(locationId)) {
      return await bail(403, { ok: false, error: "Forbidden location" });
    }

    const fnName = rangeParam === "7d"  ? "get_kpis_last_7d"  :
                   rangeParam === "90d" ? "get_kpis_last_90d" :
                   rangeParam === "ytd" ? "get_kpis_ytd"      :
                                          "get_kpis_last_30d";

        // ── KPI query — union across ALL tenants this user owns ─────────────
    const kpiUnionParts = tenantIds.map((_: string, i: number) => `
      SELECT * FROM analytics.${fnName}(
        COALESCE($2::date, CURRENT_DATE), ${i + 3}::uuid
      )
      WHERE location_id = ANY($1::bigint[])
        AND (${tenantIds.length + 3}::bigint IS NULL OR location_id = ${tenantIds.length + 3}::bigint)
    `).join(' UNION ALL ');
    const kpiParams = [allowedIds, dayParam ? dayParam : null, ...tenantIds, locationId];
    const kpiRes = await client.query(kpiUnionParts, kpiParams);

    // ── Series query — use tenantIds array ────────────────────────────────
    const seriesRes = await client.query(
      `
      WITH allowed AS (SELECT unnest($1::bigint[]) AS location_id)
      SELECT
        day::date,
        COALESCE(SUM(revenue), 0)::numeric        AS revenue,
        COALESCE(SUM(orders), 0)::numeric          AS orders,
        COALESCE(SUM(customers), 0)::numeric       AS customers,
        COALESCE(SUM(cogs), 0)::numeric            AS cogs,
        COALESCE(SUM(labor), 0)::numeric           AS labor,
        COALESCE(SUM(gross_profit), 0)::numeric    AS gross_profit,
        COALESCE(AVG(food_cost_pct), 0)::numeric   AS food_cost_pct,
        COALESCE(AVG(labor_cost_pct), 0)::numeric  AS labor_cost_pct,
        COALESCE(AVG(prime_cost_pct), 0)::numeric  AS prime_cost_pct,
        COALESCE(SUM(prime_cost), 0)::numeric      AS prime_cost,
        COALESCE(AVG(avg_inventory), 0)::numeric   AS avg_inventory,
        COALESCE(AVG(ar_days), 0)::numeric         AS ar_days,
        COALESCE(AVG(ap_days), 0)::numeric         AS ap_days,
        COALESCE(AVG(cash_conversion_cycle), 0)::numeric AS cash_conversion_cycle
      FROM restaurant.f_location_daily_features
      WHERE tenant_id = ANY($2::uuid[])
        AND day >= COALESCE($4::date, CURRENT_DATE) - INTERVAL '30 days'
        AND day <= COALESCE($4::date, CURRENT_DATE)
        AND location_id IN (SELECT location_id FROM allowed)
        AND ($3::bigint IS NULL OR location_id = $3::bigint)
      GROUP BY 1 ORDER BY 1
      `,
      [allowedIds, tenantIds, locationId, dayParam ? new Date(dayParam) : null]
    );

    const rows = kpiRes.rows ?? [];
    const daily = seriesRes.rows ?? [];
    const hasData = rows.length > 0 || daily.length > 0;

    if (!hasData) {
      await client.query("commit");
      return NextResponse.json({
        ok: true, as_of: refreshedAt, refreshed_at: refreshedAt,
        tenant_id: tenantId, location: { id: locationId ?? "all" },
        allowed_location_ids: allowedIds, kpis: [], series: EMPTY_SERIES,
        raw: { has_data: false },
      });
    }

    const revenueSeries: number[] = [];
    const ordersSeries: number[] = [];
    const customersSeries: number[] = [];
    const arpuSeries: number[] = [];
    const cogsSeries: number[] = [];
    const laborSeries: number[] = [];
    const primeCostSeries: number[] = [];
    const grossProfitSeries: number[] = [];
    const gmSeries: number[] = [];
    const foodSeries: number[] = [];
    const laborPctSeries: number[] = [];
    const primePctSeries: number[] = [];
    const fixedCostsSeries: number[] = [];
    const fixedCostCoverageSeries: number[] = [];
    const breakEvenRevenueSeries: number[] = [];
    const safetyMarginSeries: number[] = [];
    const diohSeries: number[] = [];
    const arDaysSeries: number[] = [];
    const apDaysSeries: number[] = [];
    const cccSeries: number[] = [];
    const ebitSeries: number[] = [];
    const interestExpenseSeries: number[] = [];
    const interestCoverageSeries: number[] = [];

    for (const d of daily) {
      const revenue = Number(d.revenue ?? 0);
      const orders = Number(d.orders ?? 0);
      const customers = Number(d.customers ?? 0);
      const cogs = Number(d.cogs ?? 0);
      const labor = Number(d.labor ?? 0);
      const grossProfit = Number(d.gross_profit ?? 0);
      const primeCost = Number(d.prime_cost ?? cogs + labor);
      const foodPct = Number(d.food_cost_pct ?? 0);
      const laborPct = Number(d.labor_cost_pct ?? 0);
      const primePct = Number(d.prime_cost_pct ?? 0);
      const avgInventory = Number(d.avg_inventory ?? 0);
      const arDays = Number(d.ar_days ?? 0);
      const apDays = Number(d.ap_days ?? 0);
      const ccc = Number(d.cash_conversion_cycle ?? 0);
      const arpu = customers > 0 ? revenue / customers : 0;
      const fixedCosts = Math.max(0, revenue - cogs - labor - grossProfit);
      const ebit = revenue - cogs - labor - fixedCosts;
      const interestExpense = Math.max(0, ebit * 0.08);
      const interestCoverage = interestExpense > 0 ? ebit / interestExpense : 0;
      const fixedCostCoverage = fixedCosts > 0 ? grossProfit / fixedCosts : 0;
      const breakEvenRevenue = revenue > 0 && grossProfit > 0
        ? fixedCosts / Math.max(grossProfit / revenue, 0.000001) : 0;
      const safetyMargin = revenue > 0 ? Math.max(0, (revenue - breakEvenRevenue) / revenue) : 0;
      const dioh = cogs > 0 ? (avgInventory / Math.max(cogs, 0.000001)) * 30 : 0;

      revenueSeries.push(revenue); ordersSeries.push(orders); customersSeries.push(customers);
      arpuSeries.push(arpu); cogsSeries.push(cogs); laborSeries.push(labor);
      primeCostSeries.push(primeCost); grossProfitSeries.push(grossProfit);
      gmSeries.push(revenue > 0 ? (grossProfit / revenue) * 100 : 0);
      foodSeries.push(foodPct > 1.5 ? foodPct : foodPct * 100);
      laborPctSeries.push(laborPct > 1.5 ? laborPct : laborPct * 100);
      primePctSeries.push(primePct > 1.5 ? primePct : primePct * 100);
      fixedCostsSeries.push(fixedCosts); fixedCostCoverageSeries.push(fixedCostCoverage);
      breakEvenRevenueSeries.push(breakEvenRevenue); safetyMarginSeries.push(safetyMargin * 100);
      diohSeries.push(dioh); arDaysSeries.push(arDays); apDaysSeries.push(apDays);
      cccSeries.push(ccc); ebitSeries.push(ebit); interestExpenseSeries.push(interestExpense);
      interestCoverageSeries.push(interestCoverage);
    }

    const series: Record<string, number[]> = {
      REVENUE: rollingAvg(revenueSeries), ORDERS: rollingAvg(ordersSeries),
      CUSTOMERS: rollingAvg(customersSeries), ARPU: rollingAvg(arpuSeries),
      COGS: rollingAvg(cogsSeries), LABOR: rollingAvg(laborSeries),
      PRIME_COST: rollingAvg(primeCostSeries), GROSS_PROFIT: rollingAvg(grossProfitSeries),
      GROSS_MARGIN: rollingAvg(gmSeries).map(normalizePct),
      FOOD_COST_RATIO: rollingAvg(foodSeries).map(normalizePct),
      LABOR_COST_RATIO: rollingAvg(laborPctSeries).map(normalizePct),
      PRIME_COST_RATIO: rollingAvg(primePctSeries).map(normalizePct),
      FIXED_COSTS: rollingAvg(fixedCostsSeries),
      FIXED_COST_COVERAGE_RATIO: rollingAvg(fixedCostCoverageSeries),
      BREAK_EVEN_REVENUE: rollingAvg(breakEvenRevenueSeries),
      SAFETY_MARGIN: rollingAvg(safetyMarginSeries).map(normalizePct),
      DAYS_INVENTORY_ON_HAND: rollingAvg(diohSeries),
      AR_DAYS: rollingAvg(arDaysSeries), AP_DAYS: rollingAvg(apDaysSeries),
      CASH_CONVERSION_CYCLE: rollingAvg(cccSeries), EBIT: rollingAvg(ebitSeries),
      INTEREST_EXPENSE: rollingAvg(interestExpenseSeries),
      INTEREST_COVERAGE_RATIO: rollingAvg(interestCoverageSeries),
    };

    const byCode = new Map<string, Agg>();
    for (const row of rows) {
      const v = toNum(row.kpi_value);
      if (v === null) continue;
      const key = String(row.kpi_code);
      const cur = byCode.get(key) ?? { values: [], sum: 0, unit: row.unit as string | undefined };
      cur.values.push(v); cur.sum += v;
      cur.unit = cur.unit ?? (row.unit as string | undefined);
      byCode.set(key, cur);
    }

    const kpis: Kpi[] = [];
    for (const [dbCode, agg] of byCode.entries()) {
      const mapped = mapCode(dbCode);
      if (!mapped) continue;
      const unit = mapped.unit ?? mapUnit(agg.unit);
      const raw = unit === "pct"
        ? agg.values.reduce((a, b) => a + b, 0) / agg.values.length : agg.sum;
      const normalized = unit === "pct" ? raw / 100 : raw;
      const s = series[mapped.code];
      const pair = lastTwo(s);
      let delta: number | null = null;
      if (pair) {
        delta = unit === "pct" ? pair.curr - pair.prev : deltaPct(pair.prev, pair.curr);
      }
      kpis.push({
        code: mapped.code, label: mapped.label, value: normalized,
        unit, delta, severity: computeSeverity(mapped.code, normalized, delta),
      });
    }

    await client.query("commit");

    return NextResponse.json({
      ok: true, as_of: refreshedAt, refreshed_at: refreshedAt,
      tenant_id: tenantId, location: { id: locationId ?? "all" },
      allowed_location_ids: allowedIds, kpis, series,
      raw: { has_data: true },
    });
  } catch (e: any) {
    try { await client.query("rollback"); } catch {}
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Overview API failed" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}