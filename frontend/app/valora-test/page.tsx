import {
  getDashboardHome,
  getDashboardKpis,
  getDashboardRisks,
  getDashboardOpportunities,
  getControlTower,
} from "@/lib/valora-api";

const TENANT_ID = "dcdbe149-deeb-4e7a-be21-28d122a89221";
const DAY = "2026-03-06";

function riskBadgeClasses(value?: string) {
  switch (value) {
    case "healthy":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
    case "stockout_risk":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "waste_spike":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
    case "inventory_stress":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "labor_productivity_drop":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-700 border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
  }
}

function actionBadgeClasses(value?: string) {
  switch (value) {
    case "maintain_current_operating_discipline":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
    case "prevent_stockouts":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "reduce_kitchen_waste":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
    case "rebalance_inventory":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "optimize_staffing":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-700 border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
  }
}

function severityBadgeClasses(value?: string) {
  switch (value) {
    case "critical":
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
    case "high":
    case "warn":
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "watch":
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
    default:
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
  }
}

function formatCurrency(value: unknown) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatCurrency0(value: unknown) {
  return `$${Number(value ?? 0).toFixed(0)}`;
}

function formatPercent(value: unknown) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

export default async function ValoraTestPage() {
  const [home, kpis, risks, opportunities, controlTowerData] = await Promise.all([
    getDashboardHome(TENANT_ID, DAY),
    getDashboardKpis(TENANT_ID, DAY),
    getDashboardRisks(TENANT_ID, DAY, 10),
    getDashboardOpportunities(TENANT_ID, DAY, 10),
    getControlTower(TENANT_ID, DAY, 20),
  ]);

  const homeItems = (home as { items?: any[] })?.items ?? [];
  const riskItems = (risks as { items?: any[] })?.items ?? [];
  const opportunityItems = (opportunities as { items?: any[] })?.items ?? [];
  const controlTowerItems = (controlTowerData as { items?: any[] })?.items ?? [];

  const totalRevenue = controlTowerItems.reduce(
    (sum: number, row: any) => sum + Number(row.revenue ?? 0),
    0
  );

  const totalOpportunity = controlTowerItems.reduce(
    (sum: number, row: any) => sum + Number(row.estimated_profit_uplift ?? 0),
    0
  );

  const atRiskCount = controlTowerItems.filter(
    (row: any) => row.top_risk_type && row.top_risk_type !== "healthy"
  ).length;

  const healthyCount = controlTowerItems.filter(
    (row: any) => row.top_risk_type === "healthy"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Valora Control Tower</h1>
        <p className="text-sm text-muted-foreground">
          Tenant: {TENANT_ID} · Date: {DAY}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">
            Total Profit Opportunity
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalOpportunity)}
          </div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Locations At Risk</div>
          <div className="mt-2 text-2xl font-semibold">{atRiskCount}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">Healthy Locations</div>
          <div className="mt-2 text-2xl font-semibold">{healthyCount}</div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">KPI Summary</h2>
        <div className="rounded-xl border p-4">
          <pre className="overflow-auto text-sm whitespace-pre-wrap">
            {JSON.stringify(kpis, null, 2)}
          </pre>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Dashboard Home</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Revenue</th>
                <th className="p-3 text-left">Gross Margin</th>
                <th className="p-3 text-left">Top Action</th>
                <th className="p-3 text-left">Headline</th>
              </tr>
            </thead>
            <tbody>
              {homeItems.map((row: any) => (
                <tr key={`${row.tenant_id}-${row.location_id}`} className="border-t">
                  <td className="p-3">{row.location_name}</td>
                  <td className="p-3">{formatCurrency(row.revenue)}</td>
                  <td className="p-3">{formatPercent(row.gross_margin)}</td>
                  <td className="p-3">{row.top_action_code ?? "-"}</td>
                  <td className="p-3 text-muted-foreground">{row.headline ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Top Risks</h2>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Risk</th>
                  <th className="p-3 text-left">Severity</th>
                  <th className="p-3 text-left">Impact</th>
                </tr>
              </thead>
              <tbody>
                {riskItems.map((row: any, index: number) => (
                  <tr
                    key={`${row.tenant_id}-${row.location_id}-${row.risk_type}-${index}`}
                    className="border-t"
                  >
                    <td className="p-3">{row.location_name}</td>
                    <td className="p-3">
                      <span className={riskBadgeClasses(row.risk_type)}>
                        {row.risk_type}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={severityBadgeClasses(row.severity_band)}>
                        {row.severity_band}
                      </span>
                    </td>
                    <td className="p-3">{formatCurrency0(row.impact_estimate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Profit Opportunities</h2>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Profit Uplift</th>
                </tr>
              </thead>
              <tbody>
                {opportunityItems.map((row: any, index: number) => (
                  <tr
                    key={`${row.tenant_id}-${row.location_id}-${row.action_code}-${index}`}
                    className="border-t"
                  >
                    <td className="p-3">{row.location_name}</td>
                    <td className="p-3">
                      <span className={actionBadgeClasses(row.action_code)}>
                        {row.action_code}
                      </span>
                    </td>
                    <td className="p-3">{row.opportunity_type}</td>
                    <td className="p-3 font-medium">
                      {formatCurrency0(row.estimated_profit_uplift)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Control Tower</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Revenue</th>
                <th className="p-3 text-left">Top Risk</th>
                <th className="p-3 text-left">Recommended Action</th>
                <th className="p-3 text-left">Profit Opportunity</th>
                <th className="p-3 text-left">Insight</th>
              </tr>
            </thead>
            <tbody>
              {controlTowerItems.map((row: any) => (
                <tr
                  key={`${row.tenant_id}-${row.location_id}`}
                  className="border-t"
                >
                  <td className="p-3 font-medium">{row.location_name}</td>
                  <td className="p-3">{formatCurrency(row.revenue)}</td>
                  <td className="p-3">
                    <span className={riskBadgeClasses(row.top_risk_type)}>
                      {row.top_risk_type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={actionBadgeClasses(row.top_action_code)}>
                      {row.top_action_code}
                    </span>
                  </td>
                  <td className="p-3 font-medium">
                    {formatCurrency0(row.estimated_profit_uplift)}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.headline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}