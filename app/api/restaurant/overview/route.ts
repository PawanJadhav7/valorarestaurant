// app/api/restaurant/overview/route.ts
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

function parseAsOf(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
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

    // uuid OR "all" OR null
    const locationIdRaw = url.searchParams.get("location_id");
    const locationId = locationIdRaw && locationIdRaw !== "all" ? locationIdRaw : null;

    /**
     * Param strategy (avoid SQLSTATE param index errors):
     * - If asOf provided: $1 = asOf
     * - If locationId provided: $2 = locationId
     * - If asOf not provided: "now()" is inlined, and $1 = locationId
     */

    const sqlAll = asOf
      ? `SELECT * FROM analytics.get_executive_kpis_all_locations($1::timestamptz);`
      : `SELECT * FROM analytics.get_executive_kpis_all_locations(now());`;

    const sqlByLoc = (() => {
      if (asOf && locationId) {
        return `
          SELECT *
          FROM analytics.get_executive_kpis_by_location($1::timestamptz)
          WHERE location_id = $2::uuid
          ORDER BY revenue_30d DESC;
        `;
      }
      if (asOf && !locationId) {
        return `
          SELECT *
          FROM analytics.get_executive_kpis_by_location($1::timestamptz)
          ORDER BY revenue_30d DESC;
        `;
      }
      if (!asOf && locationId) {
        return `
          SELECT *
          FROM analytics.get_executive_kpis_by_location(now())
          WHERE location_id = $1::uuid
          ORDER BY revenue_30d DESC;
        `;
      }
      return `
        SELECT *
        FROM analytics.get_executive_kpis_by_location(now())
        ORDER BY revenue_30d DESC;
      `;
    })();

    const paramsAll = asOf ? [asOf] : [];

    const paramsByLoc = (() => {
      if (asOf && locationId) return [asOf, locationId];
      if (asOf && !locationId) return [asOf];
      if (!asOf && locationId) return [locationId];
      return [];
    })();

    const [allRes, byLocRes] = await Promise.all([
      asOf ? pool.query(sqlAll, paramsAll) : pool.query(sqlAll),
      pool.query(sqlByLoc, paramsByLoc),
    ]);

    const executive = allRes.rows?.[0] ?? null;
    const byLocation = byLocRes.rows ?? [];

    // If a specific location is requested, prefer that row; otherwise executive
    const active = locationId ? byLocation?.[0] ?? null : executive;

    // Old behavior: no data => ok true with empty KPIs
    if (!executive) {
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          location: { id: locationIdRaw ?? "all", name: locationIdRaw ? locationIdRaw : "All Locations" },
          kpis: [],
          series: {},
          notes: "No data yet.",
          executive: null,
          by_location: [],
          active: null,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Use ACTIVE row to populate tiles (location-specific or all)
    const row = active ?? executive;

    // Convert DB percent 0..100 -> old UI expects 0..1 for pct unit
    const grossMarginPct = toNum(row.gross_margin_pct);
    const foodCostPct = toNum(row.food_cost_ratio_pct);
    const laborCostPct = toNum(row.labor_cost_ratio_pct);
    const primeCostPct = toNum(row.prime_cost_ratio_pct);
    const safetyMarginPct = toNum(row.safety_margin_pct);

    const kpis: Kpi[] = [
      { code: "REVENUE", label: "Revenue (30d)", value: toNum(row.revenue_30d), unit: "usd", delta: null, severity: "good", hint: "Total sales over last 30 days." },
      { code: "COGS", label: "COGS (30d)", value: toNum(row.cogs_30d), unit: "usd", delta: null, severity: "good", hint: "Cost of goods sold over last 30 days." },
      { code: "GROSS_PROFIT", label: "Gross Profit (30d)", value: toNum(row.gross_profit_30d), unit: "usd", delta: null, severity: "good", hint: "Revenue − COGS." },

      { code: "GROSS_MARGIN", label: "Gross Margin", value: grossMarginPct === null ? null : grossMarginPct / 100, unit: "pct", delta: null, severity: "good", hint: "(Revenue − COGS) / Revenue." },
      { code: "FOOD_COST_RATIO", label: "Food Cost Ratio", value: foodCostPct === null ? null : foodCostPct / 100, unit: "pct", delta: null, severity: "good", hint: "COGS / Revenue." },
      { code: "LABOR_COST_RATIO", label: "Labor Cost Ratio", value: laborCostPct === null ? null : laborCostPct / 100, unit: "pct", delta: null, severity: "good", hint: "Labor / Revenue." },
      { code: "PRIME_COST_RATIO", label: "Prime Cost Ratio", value: primeCostPct === null ? null : primeCostPct / 100, unit: "pct", delta: null, severity: "good", hint: "(COGS + Labor) / Revenue." },

      { code: "FIXED_COSTS", label: "Fixed Costs (30d)", value: toNum(row.fixed_costs_30d), unit: "usd", delta: null, severity: "good", hint: "Rent, utilities, subscriptions, etc." },
      { code: "FIXED_COST_COVERAGE_RATIO", label: "Fixed Cost Coverage Ratio", value: toNum(row.fixed_cost_coverage_ratio), unit: "ratio", delta: null, severity: "good", hint: "Gross Profit / Fixed Costs." },
      { code: "BREAK_EVEN_REVENUE", label: "Break-even Revenue", value: toNum(row.break_even_revenue_30d), unit: "usd", delta: null, severity: "good", hint: "Fixed Costs / Gross Margin%." },
      { code: "SAFETY_MARGIN", label: "Safety Margin", value: safetyMarginPct === null ? null : safetyMarginPct / 100, unit: "pct", delta: null, severity: "good", hint: "(Actual − Break-even) / Actual." },

      { code: "DAYS_INVENTORY_ON_HAND", label: "Days of Inventory on Hand", value: toNum(row.days_inventory_on_hand), unit: "days", delta: null, severity: "good", hint: "Avg Inventory / COGS * 365." },
      { code: "AR_DAYS", label: "AR Days", value: toNum(row.ar_days), unit: "days", delta: null, severity: "good", hint: "AR Balance / Revenue * 365." },
      { code: "AP_DAYS", label: "AP Days", value: toNum(row.ap_days), unit: "days", delta: null, severity: "good", hint: "AP Balance / COGS * 365." },
      { code: "CASH_CONVERSION_CYCLE", label: "Cash Conversion Cycle", value: toNum(row.cash_conversion_cycle_days), unit: "days", delta: null, severity: "good", hint: "Inventory + AR − AP (days)." },

      // Growth (MVP placeholders)
      { code: "ORDERS", label: "Orders (30d)", value: toNum(row.orders_30d), unit: "count", delta: null, severity: "good", hint: "Total orders over last 30 days." },
      { code: "ARPU", label: "Average Revenue per Customer", value: null, unit: "usd", delta: null, severity: "good", hint: "Revenue / Avg Customers. (Enable after customer snapshots.)" },
      { code: "CUSTOMER_CHURN", label: "Customer Churn Rate", value: null, unit: "pct", delta: null, severity: "good", hint: "Enable after snapshots." },
      { code: "CAC", label: "Customer Acquisition Cost", value: null, unit: "usd", delta: null, severity: "good", hint: "Marketing / New Customers. (Enable after marketing + new customer data.)" },

      { code: "EBIT", label: "EBIT (30d)", value: toNum(row.ebit_30d), unit: "usd", delta: null, severity: "good", hint: "Earnings before interest & taxes." },
      { code: "INTEREST_EXPENSE", label: "Interest Expense (30d)", value: toNum(row.interest_expense_30d), unit: "usd", delta: null, severity: "good", hint: "Total interest expense (30d)." },
      { code: "INTEREST_COVERAGE_RATIO", label: "Interest Coverage Ratio", value: toNum(row.interest_coverage_ratio), unit: "ratio", delta: null, severity: "good", hint: "EBIT / Interest Expense." },
    ];

    // MVP: keep empty series so UI won’t break if it expects object
    const series: Record<string, number[]> = {};

    return NextResponse.json(
      {
        ok: true,
        as_of: row.as_of_ts ?? executive.as_of_ts ?? null,
        refreshed_at: refreshedAt,
        location: { id: locationIdRaw ?? "all", name: locationIdRaw ? locationIdRaw : "All Locations" },
        kpis,
        series,
        notes: "KPI aggregation from analytics.* functions.",

        // extras
        executive,
        by_location: byLocation,
        active,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("GET /api/restaurant/overview failed:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}