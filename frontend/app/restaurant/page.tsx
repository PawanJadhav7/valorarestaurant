//frontend/app/restaurant/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocationDisplayName } from "@/lib/location-label";
import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";
import { RefreshCcw } from "lucide-react";

type LocationOpt = {
  id: string;
  location_id: string;
  location_code?: string;
  location_name?: string;
  name?: string;
  city?: string;
  region?: string;
};

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

type LatestDateApi = {
  tenant_id?: string;
  latest_date?: string | null;
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
  alerts?: ControlTowerRow[]; // Added alerts property
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
  alerts?: AlertRow[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

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
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-foreground border-green-500/20";
    case "stockout_risk":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "waste_spike":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "inventory_stress":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-foreground border-blue-500/20";
    case "labor_productivity_drop":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-foreground border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-foreground";
  }
}

function actionBadgeClasses(value?: string | null) {
  switch (value) {
    case "maintain_current_operating_discipline":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-foreground border-green-500/20";
    case "prevent_stockouts":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "reduce_kitchen_waste":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "rebalance_inventory":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-foreground border-blue-500/20";
    case "optimize_staffing":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-foreground border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-foreground";
  }
}

function severityBadgeClasses(value?: string | null) {
  switch (value) {
    case "critical":
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "high":
    case "warn":
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "watch":
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-foreground border-blue-500/20";
    default:
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-green-500/10 text-foreground border-green-500/20";
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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition hover:bg-background/40">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

export default function RestaurantOverviewPage() {

  const router = useRouter();
  const searchParams = useSearchParams();

  const urlLocationId = searchParams.get("location_id");
  const urlDay = searchParams.get("day");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [data, setData] = React.useState<OverviewApi | null>(null);
  const [controlTower, setControlTower] = React.useState<ControlTowerRow[]>([]);
  const [alerts, setAlerts] = React.useState<AlertRow[]>([]);
  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>(
    urlLocationId && urlLocationId.trim() ? urlLocationId : "all"
  );
  const [insightDate, setInsightDate] = React.useState<string | null>(null);

  const activeTenantId = data?.tenant_id;

  const insightDateLabel = insightDate
    ? new Date(insightDate).toLocaleDateString()
    : "—";

  const updateLocationInUrl = React.useCallback(
    (nextLocationId: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextLocationId && nextLocationId !== "all") {
        params.set("location_id", nextLocationId);
      } else {
        params.delete("location_id");
      }

      if (insightDate) {
        params.set("day", insightDate);
      } else if (urlDay) {
        params.set("day", urlDay);
      }

      const qs = params.toString();
      router.replace(qs ? `/restaurant?${qs}` : "/restaurant", { scroll: false });
    },
    [router, searchParams, insightDate, urlDay]
  );

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
        .map((x) => ({
          id: String(x.location_id ?? x.id ?? ""),
          location_id: String(x.location_id ?? x.id ?? ""),
          location_code: String(x.location_code ?? x.code ?? ""),
          location_name:
            x.location_name != null ? String(x.location_name) : undefined,
          name: x.name != null ? String(x.name) : undefined,
          city:   x.city   != null ? String(x.city)   : undefined,
          region: x.region != null ? String(x.region) : undefined,
        }))
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

  const fetchLatestInsightDate = React.useCallback(
    async (signal?: AbortSignal) => {
      const res = await fetch(`/api/dashboard/latest-date`, {
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        throw new Error(`Latest date HTTP ${res.status}`);
      }

      const json = (await res.json()) as LatestDateApi;
      setInsightDate(json?.latest_date ?? null);
    },
    []
  );

  const fetchControlTower = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!insightDate) return;

      const normalizedDay = String(insightDate).slice(0, 10);

      const qs = new URLSearchParams({
        day: normalizedDay,
        limit: "100",
      });

      const res = await fetch(`/api/dashboard/control-tower?${qs.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!res.ok) throw new Error(`Control Tower HTTP ${res.status}`);

      const json = (await res.json()) as ControlTowerApi;
      const rows = json?.alerts ?? [];

      setControlTower(
        locationId === "all"
          ? rows
          : rows.filter((row) => String(row.location_id) === String(locationId))
      );
    },
    [insightDate, locationId]
  );

  const fetchAlerts = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!insightDate) return;

      const normalizedDay = String(insightDate).slice(0, 10);

      const qs = new URLSearchParams({
        day: normalizedDay,
        limit: "20",
      });

      const res = await fetch(`/api/dashboard/alerts?${qs.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!res.ok) throw new Error(`Alerts HTTP ${res.status}`);

      const json = (await res.json()) as AlertsApi;
      const rows = json?.alerts ?? [];

      setAlerts(
        locationId === "all"
          ? rows
          : rows.filter((row) => String(row.location_id) === String(locationId))
      );
    },
    [insightDate, locationId]
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
      setLoading(true);
      setErr(null);

      try {
        await fetchOverview(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load restaurant overview");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [fetchOverview]);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        await fetchLatestInsightDate(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load latest AI snapshot date");
        }
      }
    })();

    return () => ac.abort();
  }, [fetchLatestInsightDate]);

  React.useEffect(() => {
    if (!insightDate) return;

    const params = new URLSearchParams(searchParams.toString());

    if (locationId && locationId !== "all") {
      params.set("location_id", locationId);
    } else {
      params.delete("location_id");
    }

    params.set("day", insightDate);

    const qs = params.toString();
    router.replace(qs ? `/restaurant?${qs}` : "/restaurant", { scroll: false });
  }, [insightDate, locationId, router, searchParams]);

  React.useEffect(() => {
    if (!activeTenantId || !insightDate) return;

    const ac = new AbortController();

    (async () => {
      try {
        await Promise.all([fetchControlTower(ac.signal), fetchAlerts(ac.signal)]);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load AI dashboard data");
        }
      }
    })();

    return () => ac.abort();
  }, [activeTenantId, insightDate, fetchControlTower, fetchAlerts]);

  React.useEffect(() => {
    const nextLocationId =
      urlLocationId && urlLocationId.trim() ? urlLocationId : "all";

    setLocationId((prev) => (prev === nextLocationId ? prev : nextLocationId));
  }, [urlLocationId]);

  const refreshOverview = React.useCallback(async () => {
    const ac = new AbortController();

    try {
      setLoading(true);
      setErr(null);

      await Promise.all([
        fetchOverview(ac.signal),
        fetchLatestInsightDate(ac.signal),
      ]);
      await Promise.all([
        fetchControlTower(ac.signal),
        fetchAlerts(ac.signal),
      ]);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr(e?.message ?? "Failed to refresh business overview");
      }
    } finally {
      setLoading(false);
    }
  }, [
    fetchOverview,
    fetchLatestInsightDate,
    fetchControlTower,
    fetchAlerts,
  ]);

  if (loading) return <Skeleton />;

  if (err) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">
          Business Overview
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

  const asOfStr = data?.as_of
    ? new Date(data.as_of).toLocaleDateString()
    : "—";
  const locationLabel =
    locationId === "all"
      ? "All Locations"
      : getLocationDisplayName(
        locations.find((l) => l.id === locationId) ?? {
          location_name: data?.location?.name,
          location_id: locationId,
        }
      );

  const kpis = data?.kpis ?? [];
  const series = data?.series ?? {};

  const byCode = new Map(kpis.map((k) => [k.code, k]));
  if (!byCode.has("FREE_CASH_FLOW")) {
    byCode.set("FREE_CASH_FLOW", {
      code: "FREE_CASH_FLOW",
      label: "Free Cash Flow",
      value: null,
      unit: "usd",
      delta: null,
      severity: undefined,
      hint: "Cash available after operating costs and financing obligations",
    });
  }
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
    "FREE_CASH_FLOW",
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
      title="Business Overview"
      subtitle="Portfolio-level performance across revenue, cost, cash flow, and operating health."
    >
      <div className="pt-2">
        <div className="flex flex-wrap items-center gap-4">
          <select
            title="Select location"
            aria-label="Select location"
            value={locationId}
            onChange={(e) => {
              const nextLocationId = e.target.value;
              setLocationId(nextLocationId);
              updateLocationInUrl(nextLocationId);
            }}
            className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
          >
            <option value="all">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {getLocationDisplayName(l)}
              </option>
            ))}
          </select>

          <select
            title="Select date range"
            aria-label="Select date range"
            value="30d"
            onChange={() => { }}
            className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>

          <input
            type="date"
            title="Select insight date"
            aria-label="Select insight date"
            value={insightDate ? String(insightDate).slice(0, 10) : ""}
            onChange={() => { }}
            onKeyDown={(e) => e.preventDefault()}
            className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
          />

          <button
            onClick={refreshOverview}
            disabled={loading}
            className="group flex h-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 disabled:opacity-50"
            aria-label="Refresh business overview"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading
                  ? "animate-spin"
                  : "transition-transform duration-300 group-hover:rotate-180"
                }`}
            />
          </button>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Sales Performance"
          subtitle="Revenue, orders, and demand trends"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {revenueDemand.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Cost & Efficiency"
          subtitle="Food, labor, and operating cost control"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {unitEconomics.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Profit Performance"
        subtitle="Profit generation and break-even strength"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profitability.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Cash & Inventory"
          subtitle="Inventory movement and cash efficiency"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {workingCapital.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Financial Health"
          subtitle="Debt coverage and financial stability"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {stability.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">

          {/* ALERTS */}
          <SectionCard
            title="Attention Required"
            subtitle={`Highest-priority issues needing action`}
          >
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No alerts for selected location
              </div>
            ) : (
              <div className="space-y-3">
                {alerts
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(b.impact_estimate ?? 0) - Number(a.impact_estimate ?? 0)
                  )
                  .slice(0, 5)
                  .map((a, i) => {

                    const href = `/restaurant/insights/alerts?source=overview&location_id=${encodeURIComponent(
                      String(a.location_id)
                    )}&risk_type=${encodeURIComponent(a.risk_type)}&day=${encodeURIComponent(
                      insightDate ?? ""
                    )}`;

                    return (
                      <div
                        key={`${a.location_id}-${a.risk_type}-${i}`}
                        onClick={() => window.location.assign(href)}
                        className="cursor-pointer rounded-2xl border border-border bg-card p-4 transition hover:bg-background/40"
                      >
                        <div className="flex flex-col gap-3 xl:flex-row xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-foreground">
                                {a.location_name}
                              </div>
                              <span className={riskBadgeClasses(a.risk_type)}>
                                {humanizeCode(a.risk_type)}
                              </span>
                            </div>

                            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {a.headline ??
                                `Investigate ${humanizeCode(a.risk_type).toLowerCase()}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-right">
                              <div className="text-[11px] text-muted-foreground">Impact</div>
                              <div className="text-sm font-semibold">
                                {formatCurrency0(a.impact_estimate)}
                              </div>
                            </div>

                            <Link
                              href={href}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                            >
                              View details
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                <div className="flex justify-end">
                  <Link
                    href={`/restaurant/insights/alerts?source=overview${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""
                      }&day=${encodeURIComponent(insightDate ?? "")}`}
                    className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                  >
                    View all alerts
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>

          {/* AI INSIGHTS */}
          <SectionCard
            title="AI Recommendations"
            subtitle={`Top actions to improve performance`}
          >
            {insights.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No recommendations available
              </div>
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 3).map((i) => {
                  const href = `/restaurant/insights/ai-insights?source=overview&location_id=${encodeURIComponent(
                    String(i.location_id)
                  )}&day=${encodeURIComponent(insightDate ?? "")}`;

                  return (
                    <div
                      key={i.location_id}
                      onClick={() => window.location.assign(href)}
                      className="cursor-pointer rounded-2xl border border-border bg-card p-4 transition hover:bg-background/40"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {i.headline}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            {i.location_name}
                          </div>

                          <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {i.summary_text}
                          </div>
                        </div>

                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                        >
                          View insight
                        </Link>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end">
                  <Link
                    href={`/restaurant/insights/ai-insights?source=overview${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""
                      }&day=${encodeURIComponent(insightDate ?? "")}`}
                    className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                  >
                    View all insights
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* CONTROL TOWER */}
        <SectionCard
          title="Control Tower"
          subtitle="Portfolio-level risks, actions, and opportunities"
        >
          <div className="space-y-5">

            {/* METRICS */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
              <MetricCard label="Profit Opportunity" value={formatCurrency(totalOpportunity)} />
              <MetricCard label="At Risk" value={atRiskCount} />
              <MetricCard label="Healthy" value={healthyCount} />
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Location</th>
                    <th className="p-3 text-left">Rev</th>
                    <th className="p-3 text-left">Risk</th>
                    <th className="p-3 text-left">Severity</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Upside</th>
                    <th className="p-3 text-left">Insight</th>
                  </tr>
                </thead>

                <tbody>
                  {controlTower
                    .slice()
                    .sort(
                      (a, b) =>
                        Number(b.estimated_profit_uplift ?? 0) -
                        Number(a.estimated_profit_uplift ?? 0)
                    )
                    .slice(0, 5)
                    .map((row) => {
                      const href = `/restaurant/insights/ai-insights?source=overview&location_id=${encodeURIComponent(
                        String(row.location_id)
                      )}&day=${encodeURIComponent(insightDate ?? "")}`;

                      return (
                        <tr
                          key={row.location_id}
                          onClick={() => window.location.assign(href)}
                          className="cursor-pointer border-t border-border transition hover:bg-background/30 odd:bg-background/20"
                        >
                          <td className="p-3 font-medium">{row.location_name}</td>
                          <td className="p-3">{formatCurrency(row.revenue)}</td>
                          <td className="p-3">
                            <span className={riskBadgeClasses(row.top_risk_type)}>
                              {humanizeCode(row.top_risk_type)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={severityBadgeClasses(row.top_risk_band)}>
                              {humanizeCode(row.top_risk_band)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={actionBadgeClasses(row.top_action_code)}>
                              {humanizeCode(row.top_action_code)}
                            </span>
                          </td>
                          <td className="p-3 font-medium">
                            {formatCurrency0(row.estimated_profit_uplift)}
                          </td>
                          <td className="p-3">
                            <div className="line-clamp-2 max-w-[320px] text-muted-foreground">
                              {row.headline}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Link
                href={`/restaurant/insights/ai-insights?source=overview${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""
                  }&day=${encodeURIComponent(insightDate ?? "")}`}
                className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
              >
                View full analysis
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}