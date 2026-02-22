// app/api/restaurant/overview/route.ts
import { NextResponse } from "next/server";
import pg from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null; // MVP: null
  severity?: Severity; // MVP: "good"
  hint?: string;
};

function safeDiv(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

function n(v: any): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function GET(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const url = new URL(req.url);
  const locationId = url.searchParams.get("location_id"); // optional

  const refreshedAt = new Date().toISOString();
  const client = await pool.connect();

  try {
    // Anchor window on max(day) for stability (backfills, historical loads)
    const latest = await client.query(
      `select max(day) as max_day
       from restaurant.raw_restaurant_daily
       ${locationId ? "where location_id = $1" : ""}`,
      locationId ? [locationId] : []
    );

    const maxDay = (latest.rows?.[0]?.max_day as string | null) ?? null;

    if (!maxDay) {
      return NextResponse.json({
        ok: true,
        as_of: null,
        refreshed_at: refreshedAt,
        location: { id: locationId ?? "all", name: locationId ? locationId : "All Locations" },
        kpis: [],
        series: {},
        notes: "No data yet. Upload CSV first.",
      });
    }

    // Aggregate last 30 days (inclusive)
    const agg = await client.query(
      `
      with w as (
        select *
        from restaurant.raw_restaurant_daily
        where day >= ($1::date - interval '29 days')
          and day <= $1::date
          ${locationId ? "and location_id = $2" : ""}
      )
      select
        sum(revenue)::numeric as revenue_30d,
        sum(cogs)::numeric as cogs_30d,
        sum(labor)::numeric as labor_30d,
        sum(fixed_costs)::numeric as fixed_costs_30d,
        sum(marketing_spend)::numeric as marketing_30d,
        sum(interest_expense)::numeric as interest_30d,
        sum(orders)::numeric as orders_30d,
        avg(customers)::numeric as avg_customers_30d,
        sum(new_customers)::numeric as new_customers_30d,
        avg(avg_inventory)::numeric as avg_inventory_30d,
        avg(ar_balance)::numeric as avg_ar_balance_30d,
        avg(ap_balance)::numeric as avg_ap_balance_30d,
        sum(ebit)::numeric as ebit_30d
      from w
      `,
      locationId ? [maxDay, locationId] : [maxDay]
    );

    const r = agg.rows[0] ?? {};

    const revenue = n(r.revenue_30d);
    const cogs = n(r.cogs_30d);
    const labor = n(r.labor_30d);
    const fixed = n(r.fixed_costs_30d);
    const marketing = n(r.marketing_30d);
    const interest = n(r.interest_30d);
    const orders = n(r.orders_30d);
    const avgCustomers = n(r.avg_customers_30d);
    const newCustomers = n(r.new_customers_30d);
    const avgInv = n(r.avg_inventory_30d);
    const arBal = n(r.avg_ar_balance_30d);
    const apBal = n(r.avg_ap_balance_30d);
    const ebit = n(r.ebit_30d);

    const grossProfit = (revenue ?? 0) - (cogs ?? 0);
    const grossMargin = safeDiv(grossProfit, revenue); // 0..1
    const foodCost = safeDiv(cogs, revenue); // 0..1
    const laborCost = safeDiv(labor, revenue); // 0..1
    const primeCost = safeDiv((cogs ?? 0) + (labor ?? 0), revenue); // 0..1

    // Days approximations
    const invDays = safeDiv((avgInv ?? 0) * 365, cogs);
    const arDays = safeDiv((arBal ?? 0) * 365, revenue);
    const apDays = safeDiv((apBal ?? 0) * 365, cogs);
    const cashConversionCycle =
      (invDays ?? 0) + (arDays ?? 0) - (apDays ?? 0);

    const fixedCoverage = safeDiv(grossProfit, fixed); // GP / fixed
    const breakEvenRevenue =
      grossMargin !== null ? safeDiv(fixed ?? 0, grossMargin) : null;
    const safetyMargin =
      breakEvenRevenue !== null && revenue !== null && revenue !== 0
        ? safeDiv(revenue - breakEvenRevenue, revenue)
        : null;

    const arpu =
      revenue !== null && avgCustomers !== null && avgCustomers !== 0
        ? safeDiv(revenue, avgCustomers)
        : null;

    const cac =
      marketing !== null && newCustomers !== null && newCustomers !== 0
        ? safeDiv(marketing, newCustomers)
        : null;

    const interestCoverage =
      ebit !== null && interest !== null && interest !== 0
        ? safeDiv(ebit, interest)
        : null;

    const churn = null; // needs prior-period snapshots

    const kpis: Kpi[] = [
      { code: "REVENUE", label: "Revenue (30d)", value: revenue, unit: "usd", delta: null, severity: "good", hint: "Total sales over last 30 days." },
      { code: "COGS", label: "COGS (30d)", value: cogs, unit: "usd", delta: null, severity: "good", hint: "Cost of goods sold over last 30 days." },
      { code: "GROSS_PROFIT", label: "Gross Profit (30d)", value: grossProfit, unit: "usd", delta: null, severity: "good", hint: "Revenue − COGS." },
      { code: "GROSS_MARGIN", label: "Gross Margin", value: grossMargin, unit: "pct", delta: null, severity: "good", hint: "(Revenue − COGS) / Revenue." },

      { code: "FOOD_COST_RATIO", label: "Food Cost Ratio", value: foodCost, unit: "pct", delta: null, severity: "good", hint: "COGS / Revenue." },
      { code: "LABOR_COST_RATIO", label: "Labor Cost Ratio", value: laborCost, unit: "pct", delta: null, severity: "good", hint: "Labor / Revenue." },
      { code: "PRIME_COST_RATIO", label: "Prime Cost Ratio", value: primeCost, unit: "pct", delta: null, severity: "good", hint: "(COGS + Labor) / Revenue." },

      { code: "FIXED_COSTS", label: "Fixed Costs (30d)", value: fixed, unit: "usd", delta: null, severity: "good", hint: "Rent, utilities, subscriptions, etc." },
      { code: "FIXED_COST_COVERAGE_RATIO", label: "Fixed Cost Coverage Ratio", value: fixedCoverage, unit: "ratio", delta: null, severity: "good", hint: "Gross Profit / Fixed Costs." },
      { code: "BREAK_EVEN_REVENUE", label: "Break-even Revenue", value: breakEvenRevenue, unit: "usd", delta: null, severity: "good", hint: "Fixed Costs / Gross Margin%." },
      { code: "SAFETY_MARGIN", label: "Safety Margin", value: safetyMargin, unit: "pct", delta: null, severity: "good", hint: "(Actual − Break-even) / Actual." },

      { code: "DAYS_INVENTORY_ON_HAND", label: "Days of Inventory on Hand", value: invDays, unit: "days", delta: null, severity: "good", hint: "Avg Inventory / COGS * 365." },
      { code: "AR_DAYS", label: "AR Days", value: arDays, unit: "days", delta: null, severity: "good", hint: "AR Balance / Revenue * 365." },
      { code: "AP_DAYS", label: "AP Days", value: apDays, unit: "days", delta: null, severity: "good", hint: "AP Balance / COGS * 365." },
      { code: "CASH_CONVERSION_CYCLE", label: "Cash Conversion Cycle", value: Number.isFinite(cashConversionCycle) ? cashConversionCycle : null, unit: "days", delta: null, severity: "good", hint: "Inventory + AR − AP (days)." },

      { code: "ORDERS", label: "Orders (30d)", value: orders, unit: "count", delta: null, severity: "good", hint: "Total orders over last 30 days." },
      { code: "ARPU", label: "Average Revenue per Customer", value: arpu, unit: "usd", delta: null, severity: "good", hint: "Revenue / Avg Customers." },
      { code: "CUSTOMER_CHURN", label: "Customer Churn Rate", value: churn, unit: "pct", delta: null, severity: "good", hint: "Enable after snapshots." },
      { code: "CAC", label: "Customer Acquisition Cost", value: cac, unit: "usd", delta: null, severity: "good", hint: "Marketing / New Customers." },

      { code: "EBIT", label: "EBIT (30d)", value: ebit, unit: "usd", delta: null, severity: "good", hint: "Earnings before interest & taxes." },
      { code: "INTEREST_EXPENSE", label: "Interest Expense (30d)", value: interest, unit: "usd", delta: null, severity: "good", hint: "Total interest expense (30d)." },
      { code: "INTEREST_COVERAGE_RATIO", label: "Interest Coverage Ratio", value: interestCoverage, unit: "ratio", delta: null, severity: "good", hint: "EBIT / Interest Expense." },
    ];

    // Daily series for sparklines (last 30 days)
    const hist = await client.query(
      `
      with w as (
        select *
        from restaurant.raw_restaurant_daily
        where day >= ($1::date - interval '29 days')
          and day <= $1::date
          ${locationId ? "and location_id = $2" : ""}
      ),
      d as (
        select
          day::date as day,
          sum(revenue)::numeric as revenue,
          sum(cogs)::numeric as cogs,
          sum(labor)::numeric as labor,
          avg(avg_inventory)::numeric as avg_inventory,
          avg(ar_balance)::numeric as ar_balance,
          avg(ap_balance)::numeric as ap_balance
        from w
        group by 1
        order by 1 asc
      )
      select
        day,
        revenue,
        cogs,
        labor,
        case when revenue = 0 then null else (revenue - cogs) / revenue end as gross_margin,
        case when revenue = 0 then null else cogs / revenue end as food_cost_ratio,
        case when revenue = 0 then null else labor / revenue end as labor_cost_ratio,
        case when cogs = 0 then null else (avg_inventory * 365) / cogs end as inv_days,
        case when revenue = 0 then null else (ar_balance * 365) / revenue end as ar_days,
        case when cogs = 0 then null else (ap_balance * 365) / cogs end as ap_days
      from d
      `,
      locationId ? [maxDay, locationId] : [maxDay]
    );

    const series: Record<string, number[]> = {
      REVENUE: hist.rows.map((x) => Number(x.revenue ?? 0)),
      GROSS_MARGIN: hist.rows.map((x) => (x.gross_margin === null ? NaN : Number(x.gross_margin))),
      FOOD_COST_RATIO: hist.rows.map((x) => (x.food_cost_ratio === null ? NaN : Number(x.food_cost_ratio))),
      LABOR_COST_RATIO: hist.rows.map((x) => (x.labor_cost_ratio === null ? NaN : Number(x.labor_cost_ratio))),
      CASH_CONVERSION_CYCLE: hist.rows.map((x) => {
        const inv = x.inv_days === null ? NaN : Number(x.inv_days);
        const ar = x.ar_days === null ? NaN : Number(x.ar_days);
        const ap = x.ap_days === null ? NaN : Number(x.ap_days);
        const ccc = inv + ar - ap;
        return Number.isFinite(ccc) ? ccc : NaN;
      }),
    };

    return NextResponse.json({
      ok: true,
      as_of: maxDay, // anchored to max data day
      refreshed_at: refreshedAt,
      location: { id: locationId ?? "all", name: locationId ? locationId : "All Locations" },
      kpis,
      series, // ✅ return the computed series
      notes: "DB-driven KPI aggregation (30d) from restaurant.raw_restaurant_daily.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}