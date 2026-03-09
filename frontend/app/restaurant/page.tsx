// app/restaurant/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";

type LocationOpt = { id: string; label: string };

type OverviewApi = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  tenant_id?: string;
  location?: { id: string; name?: string };
  allowed_location_ids?: number[];
  kpis: RestaurantKpi[];
  series?: Record<string, number[]>;
  notes?: string;
  error?: string;
};

type ControlTowerRow = {
  as_of_date: string;
  tenant_id: string;
  location_id: number;
  location_name: string;
  region: string | null;
  country_code?: string | null;

  revenue: number | null;
  gross_profit?: number | null;
  gross_margin: number | null;
  food_cost_pct?: number | null;
  labor_cost_pct?: number | null;
  prime_cost_pct?: number | null;
  aov?: number | null;
  orders?: number | null;
  customers?: number | null;
  labor_hours?: number | null;
  sales_per_labor_hour?: number | null;
  avg_inventory?: number | null;
  stockout_count?: number | null;
  waste_amount?: number | null;
  waste_pct?: number | null;

  top_risk_type: string | null;
  top_risk_score?: number | null;
  top_risk_band?: string | null;

  top_action_code: string | null;

  estimated_profit_uplift: number | null;

  headline: string | null;
  summary_text?: string | null;
};

type ControlTowerApi = {
  items?: ControlTowerRow[];
};

type AlertRow = {
  location_id: number;
  location_name: string;
  region?: string | null;
  risk_type: string;
  severity_score?: number | null;
  impact_estimate?: number | null;
  headline?: string | null;
};

type AlertsApi = {
  items?: AlertRow[];
};

// const CONTROL_TOWER_DAY = data?.as_of?.split("T")[0] ?? new Date().toISOString().split("T")[0];
const API_BASE = process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

function formatCurrency(value: unknown) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatCurrency0(value: unknown) {
  return `$${Number(value ?? 0).toFixed(0)}`;
}

function formatPercent(value: unknown) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

function humanizeCode(value?: string | null) {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function riskBadgeClasses(value?: string | null) {
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

function actionBadgeClasses(value?: string | null) {
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

function severityBadgeClasses(value?: string | null) {
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

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="h-6 w-56 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-96 rounded bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="h-3 w-32 rounded bg-muted/40" />
            <div className="mt-3 h-7 w-40 rounded bg-muted/30" />
            <div className="mt-3 h-7 w-[120px] rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RestaurantOverviewPage() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [data, setData] = React.useState<OverviewApi | null>(null);
  const [controlTower, setControlTower] = React.useState<ControlTowerRow[]>([]);
  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>("all");
  const [alerts, setAlerts] = React.useState<AlertRow[]>([]);
  const activeTenantId = data?.tenant_id;
  const CONTROL_TOWER_DAY = data?.as_of?.split("T")[0] ?? new Date().toISOString().split("T")[0];


  const fetchLocations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/locations", {
        cache: "no-store",
        signal,
      });
      if (!r.ok) return;

      const j = await r.json();
      const raw = (j?.locations ?? []) as any[];

      const mapped: LocationOpt[] = raw
        .map((x) => {
          const id = String(x.location_id ?? x.id ?? "");
          const code = String(x.location_code ?? x.code ?? "");
          const name = String(x.name ?? x.location_name ?? "");
          const label = code ? `${code} — ${name || "Location"}` : name || "Location";
          return { id, label };
        })
        .filter((x) => x.id);

      const seen = new Set<string>();
      const uniq: LocationOpt[] = [];
      for (const m of mapped) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        uniq.push(m);
      }

      setLocations(uniq);
    } catch (e: any) {
      if (e?.name !== "AbortError") setLocations([]);
    }
  }, []);

  const fetchOverview = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setErr(null);

      const qs =
        locationId !== "all"
          ? `?location_id=${encodeURIComponent(locationId)}`
          : "";

      const res = await fetch(`/api/restaurant/overview${qs}`, {
        cache: "no-store",
        signal,
      });

      if (!res.ok) throw new Error(`Restaurant overview HTTP ${res.status}`);

      const json = (await res.json()) as OverviewApi;

      if (!json?.ok) {
        throw new Error(json?.error ?? "Overview API returned ok=false");
      }

      if (!Array.isArray(json.kpis)) json.kpis = [];
      if (!json.series) json.series = {};

      setData(json);
    },
    [locationId]
  );

  const fetchControlTower = React.useCallback(
  async (signal?: AbortSignal) => {
    if (!activeTenantId) return;

    const qs = new URLSearchParams({
      tenant_id: activeTenantId,
      day: CONTROL_TOWER_DAY,
      limit: "100",
    });

    const res = await fetch(`${API_BASE}/api/dashboard/control-tower?${qs.toString()}`, {
      cache: "no-store",
      signal,
    });

    if (!res.ok) throw new Error(`Control Tower HTTP ${res.status}`);

    const json = (await res.json()) as ControlTowerApi;
    const rows = json?.items ?? [];

    setControlTower(
      locationId === "all"
        ? rows
        : rows.filter((row) => String(row.location_id) === String(locationId))
    );
  },
  [activeTenantId, locationId]
  );

const fetchAlerts = React.useCallback(
  async (signal?: AbortSignal) => {
    if (!activeTenantId) return;

    const qs = new URLSearchParams({
      tenant_id: activeTenantId,
      day: CONTROL_TOWER_DAY,
      limit: "20",
    });

    const res = await fetch(`${API_BASE}/api/dashboard/alerts?${qs.toString()}`, {
      cache: "no-store",
      signal,
    });

    if (!res.ok) throw new Error(`Alerts HTTP ${res.status}`);

    const json = (await res.json()) as AlertsApi;
    setAlerts(json?.items ?? []);
  },
  [activeTenantId]
);

const insights = controlTower
  .filter((row) => row.headline || row.summary_text)
  .map((row) => ({
    location_id: row.location_id,
    location_name: row.location_name,
    headline: row.headline ?? "AI insight",
    summary_text: row.summary_text ?? "No summary available.",
  }));

  React.useEffect(() => {
    const ac = new AbortController();
    fetchLocations(ac.signal);
    return () => ac.abort();
  }, [fetchLocations]);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        await Promise.all([
          fetchOverview(ac.signal),
          fetchControlTower(ac.signal),
          fetchAlerts(ac.signal),
        ]);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load restaurant overview");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [fetchOverview, fetchControlTower, fetchAlerts]);

  if (loading) return <Skeleton />;

  if (err) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">
          Restaurant Overview
        </div>
        <div className="mt-2 text-sm text-danger">{err}</div>
        <div className="mt-3">
          <Link
            href="/restaurant/data"
            className="text-sm font-semibold text-foreground hover:underline"
          >
            Go to Data →
          </Link>
        </div>
      </div>
    );
  }

  const asOfStr = data?.as_of ? new Date(data.as_of).toLocaleString() : "—";
  const locationLabel =
    locationId === "all"
      ? "All Locations"
      : locations.find((l) => l.id === locationId)?.label ??
        data?.location?.name ??
        "Location";

  const kpis = data?.kpis ?? [];
  const series = data?.series ?? {};

  const byCode = new Map(kpis.map((k) => [k.code, k]));
  const pick = (codes: string[]) =>
    codes.map((c) => byCode.get(c)).filter(Boolean) as RestaurantKpi[];

  const revenueDemand = pick(["REVENUE", "ORDERS", "CUSTOMERS", "ARPU"]);
  const unitEconomics = pick([
    "GROSS_MARGIN",
    "FOOD_COST_RATIO",
    "LABOR_COST_RATIO",
    "PRIME_COST_RATIO",
  ]);
  const profitability = pick([
    "COGS",
    "LABOR",
    "PRIME_COST",
    "GROSS_PROFIT",
    "FIXED_COSTS",
    "FIXED_COST_COVERAGE_RATIO",
    "BREAK_EVEN_REVENUE",
    "SAFETY_MARGIN",
  ]);
  const workingCapital = pick([
    "DAYS_INVENTORY_ON_HAND",
    "AR_DAYS",
    "AP_DAYS",
    "CASH_CONVERSION_CYCLE",
  ]);
  const stability = pick([
    "EBIT",
    "INTEREST_EXPENSE",
    "INTEREST_COVERAGE_RATIO",
  ]);

  const totalRevenue = controlTower.reduce(
    (sum, row) => sum + Number(row.revenue ?? 0),
    0
  );

  const totalOpportunity = controlTower.reduce(
    (sum, row) => sum + Number(row.estimated_profit_uplift ?? 0),
    0
  );

  const atRiskCount = controlTower.filter(
    (row) => row.top_risk_type && row.top_risk_type !== "healthy"
  ).length;

  const healthyCount = controlTower.filter(
    (row) => row.top_risk_type === "healthy"
  ).length;

  const HeaderCard = (
    <SectionCard
      title="Restaurant KPIs"
      subtitle="Executive view for Profit, Growth, Cash discipline, and AI operating insights."
    >
      <div className="relative pt-2">
        <div className="absolute right-0 top-0">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
            >
              <option value="all">All Locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 pr-[220px]">
          <div className="text-sm text-muted-foreground">
            As of: <span className="font-medium text-foreground">{asOfStr}</span>
          </div>
          <div className="text-sm font-semibold text-foreground">
            {locationLabel}
          </div>
        </div>
      </div>
    </SectionCard>
  );

  if (!kpis.length) {
    return (
      <div className="space-y-4">
        {HeaderCard}

        <SectionCard
          title="Get started"
          subtitle="No KPI rows available for this selection yet."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">
                  1) Load data
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Upload sales/labor/inventory or run ingestion.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">
                  2) Validate
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Confirm raw_daily has revenue/cogs/labor.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">
                  3) Re-check overview API
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Ensure /api/restaurant/overview returns kpis[].
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Link
              href="/restaurant/data"
              className="text-sm font-semibold text-foreground hover:underline"
            >
              Open Data setup →
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {HeaderCard}

      <SectionCard
        title="Revenue & demand"
        subtitle="Top-line performance and pricing power."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {revenueDemand.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Unit economics"
        subtitle="Core restaurant efficiency (margin + prime cost)."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {unitEconomics.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Profitability"
        subtitle="Revenue conversion into operating profit and break-even resilience."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profitability.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Working capital"
        subtitle="Inventory and cash efficiency over time."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workingCapital.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Financial stability"
        subtitle="Debt servicing and financial resilience."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stability.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title="Control tower summary"
        subtitle="Daily AI operating view for all selected locations."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalRevenue)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">
              Total Profit Opportunity
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalOpportunity)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Locations At Risk</div>
            <div className="mt-2 text-2xl font-semibold">{atRiskCount}</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Healthy Locations</div>
            <div className="mt-2 text-2xl font-semibold">{healthyCount}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="AI Control Tower"
        subtitle="Location-level risks, recommended actions, and profit opportunities."
      >
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Region</th>
                <th className="p-3 text-left">Revenue</th>
                <th className="p-3 text-left">Gross Margin</th>
                <th className="p-3 text-left">Top Risk</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Recommended Action</th>
                <th className="p-3 text-left">Profit Opportunity</th>
                <th className="p-3 text-left">Insight</th>
              </tr>
            </thead>

            <tbody>
              {controlTower.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-muted-foreground">
                    No location intelligence available for this selection.
                  </td>
                </tr>
              ) : (
                controlTower.map((row) => (
                  <tr
                    key={`${row.tenant_id}-${row.location_id}`}
                    className="border-t border-border"
                  >
                    <td className="p-3 font-medium">
                      <Link
                        href={`/restaurant/location/${row.location_id}`}
                        className="hover:underline"
                      >
                        {row.location_name}
                      </Link>
                    </td>
                    <td className="p-3">{row.region ?? "-"}</td>
                    <td className="p-3">{formatCurrency(row.revenue)}</td>
                    <td className="p-3">
                      {row.gross_margin != null
                        ? formatPercent(row.gross_margin)
                        : "-"}
                    </td>
                    <td className="p-3">
                      <span className={riskBadgeClasses(row.top_risk_type)}>
                        {humanizeCode(row.top_risk_type ?? "healthy")}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={severityBadgeClasses(row.top_risk_band)}>
                        {humanizeCode(row.top_risk_band ?? "info")}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={actionBadgeClasses(row.top_action_code)}>
                        {humanizeCode(
                          row.top_action_code ??
                            "maintain_current_operating_discipline"
                        )}
                      </span>
                    </td>
                    <td className="p-3 font-medium">
                      {formatCurrency0(row.estimated_profit_uplift)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.headline ??
                        "Location operating within healthy range"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Alert Center"
        subtitle="High-priority issues requiring operator attention."
      >
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Risk</th>
                <th className="p-3 text-left">Impact</th>
                <th className="p-3 text-left">Insight</th>
              </tr>
            </thead>

            <tbody>
              {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-muted-foreground">
                      No active alerts detected.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a, i) => (
                    <tr key={`${a.location_id}-${a.risk_type}-${i}`} className="border-t border-border">
                      <td className="p-3 font-medium">
                        <Link
                          href={`/restaurant/location/${a.location_id}`}
                          className="hover:underline"
                        >
                          {a.location_name}
                        </Link>
                      </td>

                      <td className="p-3">
                        <span className={riskBadgeClasses(a.risk_type)}>
                          {humanizeCode(a.risk_type)}
                        </span>
                      </td>

                      <td className="p-3 font-medium">
                        {formatCurrency0(a.impact_estimate)}
                      </td>

                      <td className="p-3 text-muted-foreground">
                        {a.headline ?? `Investigate ${humanizeCode(a.risk_type).toLowerCase()} at this location.`}
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
          title="AI Daily Insights"
          subtitle="Automatically generated operating insights for today."
        >
          <div className="space-y-3 text-sm">

            {insights.length === 0 ? (
              <div className="text-muted-foreground">
                No insights generated for today.
              </div>
            ) : (
              insights.map((i, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="font-medium">{i.headline}</div>

                  <div className="text-muted-foreground mt-1">
                    {i.summary_text}
                  </div>
                </div>
              ))
            )}

          </div>
        </SectionCard>
    </div>
  );
}