/**
 * Valora AI — Department Registry
 * Central source of truth for department codes, labels, URLs and KPI mappings.
 * Used by KpiTile, alerts page, actions page for navigation.
 */

export type DeptInfo = {
  code: string;
  label: string;
  url: string;
};

export const DEPARTMENTS: DeptInfo[] = [
  { code: "overview",      label: "Business Overview",        url: "/restaurant" },
  { code: "sales",         label: "Sales & Demand",           url: "/restaurant/sales" },
  { code: "cost",          label: "Cost Management",          url: "/restaurant/cost-management" },
  { code: "profitability", label: "Profitability",            url: "/restaurant/profitability" },
  { code: "inventory",     label: "Inventory Health",         url: "/restaurant/inventory" },
  { code: "workforce",     label: "Workforce Performance",    url: "/restaurant/workforce" },
  { code: "operations",    label: "Operations Intelligence",  url: "/restaurant/operations" },
];

// KPI code prefix → dept code
const PREFIX_MAP: Record<string, string> = {
  "OPS_":       "operations",
  "WF_":        "workforce",
  "LABOR_":     "workforce",
  "INV_":       "inventory",
  "CC_":        "cost",
  "SALES_":     "sales",
  "PROFIT_":    "profitability",
};

// Individual KPI code → dept code
const KPI_DEPT_MAP: Record<string, string> = {
  // Sales & Demand
  REVENUE: "sales", ORDERS: "sales", CUSTOMERS: "sales",
  ARPU: "sales", AOV: "sales", NEW_CUSTOMERS: "sales",

  // Cost Management
  GROSS_MARGIN: "cost", FOOD_COST_RATIO: "cost",
  FOOD_COST_PCT: "cost", LABOR_COST_RATIO: "cost",
  LABOR_COST_PCT: "cost", PRIME_COST_RATIO: "cost",
  PRIME_COST_PCT: "cost", CC_FOOD_COST_PCT: "cost",
  CC_LABOR_COST_PCT: "cost", CC_PRIME_COST_PCT: "cost",
  CC_DISCOUNT_PCT: "cost", CC_VOID_PCT: "cost",
  CC_WASTE_PCT: "cost", CC_COMP_PCT: "cost",
  CC_STOCKOUTS: "cost",

  // Profitability
  COGS: "profitability", LABOR: "profitability",
  PRIME_COST: "profitability", GROSS_PROFIT: "profitability",
  FIXED_COSTS: "profitability", BREAK_EVEN_REVENUE: "profitability",
  SAFETY_MARGIN: "profitability", FIXED_COST_COVERAGE_RATIO: "profitability",
  EBIT: "profitability", INTEREST_EXPENSE: "profitability",
  INTEREST_COVERAGE_RATIO: "profitability", FREE_CASH_FLOW: "profitability",

  // Inventory Health
  DAYS_INVENTORY_ON_HAND: "inventory", DIOH: "inventory",
  AR_DAYS: "inventory", AP_DAYS: "inventory",
  CASH_CONVERSION_CYCLE: "inventory", AVG_INVENTORY: "inventory",
  INV_TURNS: "inventory", INVENTORY_TURNS: "inventory",
  INVENTORY_TO_SALES_RATIO: "inventory", ENDING_INVENTORY: "inventory",
  DEPLETION_RATE: "inventory", EXCESS_STOCK_VALUE: "inventory",

  // Workforce Performance
  LABOR_HOURS: "workforce", LABOR_COST: "workforce",
  ACTUAL_HOURS: "workforce", ABSENCE_RATE: "workforce",
  AVG_HOURLY_RATE: "workforce", LABOR_COST_PER_ORDER: "workforce",
  LABOR_COST_PER_CUSTOMER: "workforce", LABOR_OVERTIME_PCT: "workforce",
  LABOR_LABOR_RATIO: "workforce",

  // Operations Intelligence
  VOID_PCT: "operations", DISCOUNT_PCT: "operations",
  REFUND_PCT: "operations", WASTE_PCT: "operations",
  WASTE_AMOUNT: "operations", STOCKOUT_COUNT: "operations",
  SALES_PER_LABOR_HOUR: "operations",
};

/**
 * Get department info from a KPI code.
 * Handles prefixed codes like OPS_ORDERS, LABOR_HOURS etc.
 */
export function getDeptFromKpiCode(kpiCode: string): DeptInfo {
  const c = kpiCode.toUpperCase();

  // Check prefix first
  for (const [prefix, deptCode] of Object.entries(PREFIX_MAP)) {
    if (c.startsWith(prefix)) {
      return DEPARTMENTS.find((d) => d.code === deptCode)!;
    }
  }

  // Strip any prefix and check individual KPI map
  const stripped = c.replace(/^[A-Z]+_/, "");
  const deptCode = KPI_DEPT_MAP[c] ?? KPI_DEPT_MAP[stripped];
  return DEPARTMENTS.find((d) => d.code === deptCode)
    ?? DEPARTMENTS[0]; // fallback to Business Overview
}

/**
 * Get department info from a source string or kpi_label.
 */
export function getDeptFromSource(source: string, kpiLabel?: string | null): DeptInfo {
  // Try kpiLabel first (group name from dashboard)
  if (kpiLabel) {
    const decoded = (() => { try { return decodeURIComponent(kpiLabel); } catch { return kpiLabel; } })();
    const byLabel = DEPARTMENTS.find((d) =>
      d.label.toLowerCase() === decoded.toLowerCase()
    );
    if (byLabel) return byLabel;
  }
  // Try source code
  return DEPARTMENTS.find((d) => d.code === source) ?? DEPARTMENTS[0];
}
