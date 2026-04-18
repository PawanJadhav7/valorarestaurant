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
import { DashboardFilters } from "@/components/restaurant/DashboardFilters";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type AlertRow = {
  location_id: number;
  location_name: string;
  region?: string | null;
  risk_type: string;
  severity_score?: number | null;
  severity_band?: string | null;
  impact_estimate?: number | null;
  headline?: string | null;
};

type BriefRow = {
  location_id: string;
  location_name: string;
  headline: string | null;
  summary_text: string | null;
  recommended_actions_json?: any;
  risk_summary_json?: any;
  model_name?: string | null;
};

type ActionRow = {
  location_id: string;
  location_name: string;
  action_code: string;
  priority_rank: number;
  expected_roi: string | number;
  confidence_score: string | number;
  rationale_json?: any;
};

type OpportunityRow = {
  location_id: number;
  location_name: string;
  opportunity_type: string;
  action_code: string;
  estimated_profit_uplift: string | number;
  uplift_horizon_days: number;
  confidence_score: string | number;
  driver_metrics_json?: any;
  rationale_json?: any;
};

type MLInsightsApi = {
  ok: boolean;
  tenant_id?: string;
  day?: string;
  risks?: AlertRow[];
  briefs?: BriefRow[];
  actions?: ActionRow[];
  opportunities?: OpportunityRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: unknown) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatCurrency0(value: unknown) {
  return `$${Number(value ?? 0).toFixed(0)}`;
}

function humanizeCode(value?: string | null) {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function riskBadgeClasses(value?: string | null) {
  switch (value) {
    case "revenue_decline":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "food_cost_high":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "labor_cost_high":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-orange-500/10 text-foreground border-orange-500/20";
    case "prime_cost_high":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "margin_compression":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-yellow-500/10 text-foreground border-yellow-500/20";
    case "negative_ebit":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "waste_spike":
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
      return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "medium":
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RestaurantOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlLocationId = searchParams.get("location_id");
  const urlDay = searchParams.get("day");

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<OverviewApi | null>(null);
  const [alerts, setAlerts] = React.useState<AlertRow[]>([]);
  const [briefs, setBriefs] = React.useState<BriefRow[]>([]);
  const [actions, setActions] = React.useState<ActionRow[]>([]);
  const [opportunities, setOpportunities] = React.useState<OpportunityRow[]>([]);
  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>(
    urlLocationId && urlLocationId.trim() ? urlLocationId : "all"
  );
  const [insightDate, setInsightDate] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<string>("30d");

  const activeTenantId = data?.tenant_id;

  const updateLocationInUrl = React.useCallback(
    (nextLocationId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextLocationId && nextLocationId !== "all") {
        params.set("location_id", nextLocationId);
      } else {
        params.delete("location_id");
      }
      if (insightDate) params.set("day", insightDate);
      else if (urlDay) params.set("day", urlDay);
      const qs = params.toString();
      router.replace(qs ? `/restaurant?${qs}` : "/restaurant", { scroll: false });
    },
    [router, searchParams, insightDate, urlDay]
  );

  const fetchLocations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/locations", { cache: "no-store", signal });
      if (!r.ok) return;
      const j = await r.json();
      const raw = (j?.locations ?? []) as any[];
      const mapped: LocationOpt[] = raw
        .map((x) => ({
          id: String(x.location_id ?? x.id ?? ""),
          location_id: String(x.location_id ?? x.id ?? ""),
          location_code: String(x.location_code ?? x.code ?? ""),
          location_name: x.location_name != null ? String(x.location_name) : undefined,
          name: x.name != null ? String(x.name) : undefined,
          city: x.city != null ? String(x.city) : undefined,
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
      const params = new URLSearchParams();
      if (locationId !== "all") params.set("location_id", locationId);
      if (insightDate) params.set("day", insightDate);
      params.set("range", dateRange);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/restaurant/overview${qs}`, { cache: "no-store", signal });
      if (!res.ok) throw new Error(`Restaurant overview HTTP ${res.status}`);
      const json = (await res.json()) as OverviewApi;
      if (!json?.ok) throw new Error(json?.error ?? "Overview API returned ok=false");
      if (!Array.isArray(json.kpis)) json.kpis = [];
      if (!json.series) json.series = {};
      setData(json);
    },
    [locationId, insightDate, dateRange]
  );

  const fetchLatestInsightDate = React.useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(`/api/dashboard/latest-date`, { cache: "no-store", signal });
    if (!res.ok) throw new Error(`Latest date HTTP ${res.status}`);
    const json = (await res.json()) as LatestDateApi;
    setInsightDate(json?.latest_date ?? null);
  }, []);

  const fetchMLInsights = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!insightDate) return;
      const normalizedDay = String(insightDate).slice(0, 10);
      const qs = new URLSearchParams({ day: normalizedDay, limit: "20" });
      if (locationId !== "all") qs.set("location_id", locationId);
      const res = await fetch(`/api/dashboard/ml-insights?${qs.toString()}`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) throw new Error(`ML Insights HTTP ${res.status}`);
      const json = (await res.json()) as MLInsightsApi;
      setAlerts(json?.risks ?? []);
      setBriefs(json?.briefs ?? []);
      setActions(json?.actions ?? []);
      setOpportunities(json?.opportunities ?? []);
    },
    [insightDate, locationId]
  );

  // Effects
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
        if (e?.name !== "AbortError") setErr(e?.message ?? "Failed to load overview");
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
        if (e?.name !== "AbortError") setErr(e?.message ?? "Failed to load latest date");
      }
    })();
    return () => ac.abort();
  }, [fetchLatestInsightDate]);

  React.useEffect(() => {
    if (!insightDate) return;
    const params = new URLSearchParams(searchParams.toString());
    if (locationId && locationId !== "all") params.set("location_id", locationId);
    else params.delete("location_id");
    params.set("day", insightDate);
    const qs = params.toString();
    router.replace(qs ? `/restaurant?${qs}` : "/restaurant", { scroll: false });
  }, [insightDate, locationId, router, searchParams]);

  React.useEffect(() => {
    if (!activeTenantId || !insightDate) return;
    const ac = new AbortController();
    (async () => {
      try {
        await fetchMLInsights(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") console.error("ML insights error:", e?.message);
      }
    })();
    return () => ac.abort();
  }, [activeTenantId, insightDate, fetchMLInsights]);

  React.useEffect(() => {
    const nextLocationId = urlLocationId && urlLocationId.trim() ? urlLocationId : "all";
    setLocationId((prev) => (prev === nextLocationId ? prev : nextLocationId));
  }, [urlLocationId]);

  const refreshOverview = React.useCallback(async () => {
    const ac = new AbortController();
    try {
      setLoading(true);
      setErr(null);
      await Promise.all([fetchOverview(ac.signal), fetchLatestInsightDate(ac.signal)]);
      await fetchMLInsights(ac.signal);
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e?.message ?? "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }, [fetchOverview, fetchLatestInsightDate, fetchMLInsights]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <Skeleton />;

  if (err) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Business Overview</div>
        <div className="mt-2 text-sm text-red-400">{err}</div>
        <div className="mt-3">
          <Link href="/restaurant/data" className="text-sm font-semibold text-foreground hover:underline">
            Go to Data →
          </Link>
        </div>
      </div>
    );
  }

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
    });
  }

  const pick = (codes: string[]) =>
    codes.map((c) => byCode.get(c)).filter(Boolean) as RestaurantKpi[];

  const revenueDemand   = pick(["REVENUE", "ORDERS", "CUSTOMERS", "ARPU"]);
  const unitEconomics   = pick(["GROSS_MARGIN", "FOOD_COST_RATIO", "LABOR_COST_RATIO", "PRIME_COST_RATIO"]);
  const profitability   = pick(["COGS", "LABOR", "PRIME_COST", "GROSS_PROFIT", "FIXED_COSTS", "FIXED_COST_COVERAGE_RATIO", "BREAK_EVEN_REVENUE", "SAFETY_MARGIN"]);
  const workingCapital  = pick(["DAYS_INVENTORY_ON_HAND", "AR_DAYS", "AP_DAYS", "CASH_CONVERSION_CYCLE"]);
  const stability       = pick(["EBIT", "INTEREST_EXPENSE", "INTEREST_COVERAGE_RATIO", "FREE_CASH_FLOW"]);

  const HeaderCard = (
    <SectionCard
      title="Business Overview"
      subtitle="Portfolio-level performance across revenue, cost, cash flow, and operating health."
    >
      <div className="pt-2">
        <DashboardFilters
          locations={locations}
          locationId={locationId}
          onLocationChange={(id) => {
            setLocationId(id);
            updateLocationInUrl(id);
          }}
          dateRange={dateRange as any}
          onDateRangeChange={setDateRange}
          insightDate={insightDate}
          onDateChange={setInsightDate}
          onRefresh={refreshOverview}
          loading={loading}
        />
      </div>
    </SectionCard>
  );

  if (!kpis.length) {
    return (
      <div className="space-y-4">
        {HeaderCard}
        <SectionCard
          title="No data available for this range"
          subtitle={`No data found for the selected date range.${
            insightDate
              ? ` Latest data available: ${new Date(insightDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}`
              : ""
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border/50 bg-background/20 p-4 text-sm text-muted-foreground">
              Try selecting a different date range or use the date picker to navigate to a date with available data.
            </div>
            {insightDate && (
              <button
                onClick={() => {
                  setDateRange("90d");
                  setInsightDate(insightDate);
                  refreshOverview();
                }}
                className="self-start rounded-xl border border-border/60 bg-background/40 px-4 py-2 text-sm font-semibold text-foreground hover:bg-background/60"
              >
                View latest available data ({new Date(insightDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}) →
              </button>
            )}
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {HeaderCard}

      {/* Sales Performance + Cost & Efficiency */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Sales Performance" subtitle="Revenue, orders, and demand trends">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {revenueDemand.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} locationId={locationId !== "all" ? locationId : null}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Cost & Efficiency" subtitle="Food, labor, and operating cost control">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {unitEconomics.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} locationId={locationId !== "all" ? locationId : null}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Profit Performance */}
      <SectionCard title="Profit Performance" subtitle="Profit generation and break-even strength">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profitability.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} locationId={locationId !== "all" ? locationId : null}
              />
          ))}
        </div>
      </SectionCard>

      {/* Cash & Inventory + Financial Health */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Cash & Inventory" subtitle="Inventory movement and cash efficiency">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {workingCapital.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} locationId={locationId !== "all" ? locationId : null}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Financial Health" subtitle="Debt coverage and financial stability">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {stability.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} locationId={locationId !== "all" ? locationId : null}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Attention Required + AI Recommendations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ATTENTION REQUIRED */}
        <SectionCard title="Attention Required" subtitle="Highest-priority issues needing action">
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No active risk alerts detected for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts
                .slice()
                .sort((a, b) => Number(b.impact_estimate ?? 0) - Number(a.impact_estimate ?? 0))
                .slice(0, 5)
                .map((a, i) => {
                  const href = `/restaurant/valora-intelligence/alerts?source=overview&location_id=${encodeURIComponent(
                    String(a.location_id)
                  )}&risk_type=${encodeURIComponent(a.risk_type)}&day=${encodeURIComponent(insightDate ?? "")}`;

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
                            {a.severity_band && (
                              <span className={severityBadgeClasses(a.severity_band)}>
                                {a.severity_band}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {a.headline ?? `Investigate ${humanizeCode(a.risk_type).toLowerCase()}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-right">
                            <div className="text-[11px] text-muted-foreground">Impact</div>
                            <div className="text-sm font-semibold">{formatCurrency0(a.impact_estimate)}</div>
                          </div>
                          <Link
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                          >
                            View details →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div className="flex justify-end">
                <Link
                  href={`/restaurant/valora-intelligence/alerts?source=overview${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(insightDate ?? "")}`}
                  className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                >
                  View all alerts →
                </Link>
              </div>
            </div>
          )}
        </SectionCard>

        {/* RECOMMENDED ACTIONS */}
        <SectionCard title="Recommended Actions" subtitle="AI-driven actions to improve performance">
          {actions.length === 0 && briefs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No recommendations available for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {/* AI Brief */}
              {briefs.slice(0, 1).map((b, i) => (
                <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-sm font-semibold text-foreground">{b.headline}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.location_name}</div>
                  <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">{b.summary_text}</div>
                  {b.model_name && (
                    <div className="mt-2 text-[10px] text-muted-foreground/60">
                      Generated by {b.model_name}
                    </div>
                  )}
                </div>
              ))}

              {/* Actions */}
              {actions.slice(0, 3).map((a, i) => {
                const href = `/restaurant/valora-intelligence/actions?source=overview&action_code=${encodeURIComponent(a.action_code)}&location_id=${encodeURIComponent(String(a.location_id))}&day=${encodeURIComponent(insightDate ?? "")}`;
                return (
                  <div
                    key={i}
                    onClick={() => window.location.assign(href)}
                    className="cursor-pointer rounded-2xl border border-border bg-card p-4 transition hover:bg-background/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {humanizeCode(a.action_code)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Priority #{a.priority_rank} · ROI {(Number(a.expected_roi) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <Link
                        href={href}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                      >
                        Take action →
                      </Link>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end">
                <Link
                  href={`/restaurant/valora-intelligence/actions?source=overview${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(insightDate ?? "")}`}
                  className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50"
                >
                  View all actions →
                </Link>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
