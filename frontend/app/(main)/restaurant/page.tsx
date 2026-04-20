"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Sparkles, TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { getLocationDisplayName } from "@/lib/location-label";
import { SectionCard } from "@/components/valora/SectionCard";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";
import { DashboardFilters } from "@/components/restaurant/DashboardFilters";

// ── Types ─────────────────────────────────────────────────────────────────────
type LocationOpt = {
  id: string; location_id: string; location_code?: string;
  location_name?: string; name?: string; city?: string; region?: string;
};
type OverviewApi = {
  ok: boolean; as_of: string | null; tenant_id?: string;
  location?: { id: string; name?: string }; allowed_location_ids?: number[];
  kpis: RestaurantKpi[]; series?: Record<string, number[]>; error?: string;
};
type LatestDateApi = { tenant_id?: string; latest_date?: string | null };
type RiskRow = {
  location_id: number; location_name: string; risk_type: string;
  severity_band?: string | null; severity_score?: number | null;
  impact_estimate?: number | null;
};
type ActionRow = {
  location_id: number; location_name: string; action_code: string;
  priority_rank: number; expected_roi: number | null; rationale_json?: any;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtUsd(n: unknown) {
  return `$${Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function humanize(code: string) {
  return (code ?? "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}
function severityConfig(band?: string | null) {
  switch (band?.toLowerCase()) {
    case "critical": return { dot: "bg-red-400", badge: "bg-red-500/10 text-red-400 border-red-500/20", emoji: "🔴" };
    case "high":     return { dot: "bg-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", emoji: "🟡" };
    case "medium":   return { dot: "bg-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", emoji: "🔵" };
    default:         return { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border", emoji: "⚪" };
  }
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function MiniSparkline({ values, color = "#10b981" }: { values: number[]; color?: string }) {
  if (!values?.length) return <div className="h-12 w-full rounded bg-muted/20" />;
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200; const h = 48;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const last = values[values.length - 1]; const prev = values[values.length - 2];
  const trend = last > prev ? "up" : last < prev ? "down" : "flat";
  return (
    <div className="flex items-end gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="flex-1 h-12" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      </svg>
      <div className={`text-xs font-semibold ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
        {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : trend === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </div>
    </div>
  );
}

// ── Location Bar ──────────────────────────────────────────────────────────────
function LocationBar({ name, value, max, rank }: { name: string; value: number; max: number; rank: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const colors = ["bg-emerald-400", "bg-blue-400", "bg-amber-400", "bg-purple-400", "bg-pink-400"];
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-xs text-muted-foreground truncate">{name}</div>
      <div className="flex-1 h-1.5 rounded-full bg-border/30">
        <div className={`h-1.5 rounded-full ${colors[rank % colors.length]}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-20 text-right text-xs font-semibold text-foreground">{fmtUsd(value)}</div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="h-6 w-56 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-96 rounded bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="h-3 w-32 rounded bg-muted/40" />
            <div className="mt-3 h-7 w-40 rounded bg-muted/30" />
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

  const [loading, setLoading]     = React.useState(true);
  const [err, setErr]             = React.useState<string | null>(null);
  const [data, setData]           = React.useState<OverviewApi | null>(null);
  const [risks, setRisks]         = React.useState<RiskRow[]>([]);
  const [actions, setActions]     = React.useState<ActionRow[]>([]);
  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>(
    urlLocationId?.trim() ? urlLocationId : "all"
  );
  const [insightDate, setInsightDate] = React.useState<string | null>(null);
  const [dateRange, setDateRange]     = React.useState<string>("30d");

  const updateLocationInUrl = React.useCallback((nextId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextId && nextId !== "all") params.set("location_id", nextId);
    else params.delete("location_id");
    if (insightDate) params.set("day", insightDate);
    const qs = params.toString();
    router.replace(qs ? `/restaurant?${qs}` : "/restaurant", { scroll: false });
  }, [router, searchParams, insightDate]);

  const fetchLocations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/locations", { cache: "no-store", signal });
      if (!r.ok) return;
      const j = await r.json();
      const mapped = ((j?.locations ?? []) as any[]).map((x) => ({
        id: String(x.location_id ?? ""), location_id: String(x.location_id ?? ""),
        location_name: x.location_name ?? undefined, name: x.name ?? undefined,
        city: x.city ?? undefined, region: x.region ?? undefined,
      })).filter((x) => x.id);
      const seen = new Set<string>(); const uniq: LocationOpt[] = [];
      for (const m of mapped) { if (!seen.has(m.id)) { seen.add(m.id); uniq.push(m); } }
      setLocations(uniq);
    } catch (e: any) { if (e?.name !== "AbortError") setLocations([]); }
  }, []);

  const fetchOverview = React.useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (locationId !== "all") params.set("location_id", locationId);
    if (insightDate) params.set("day", insightDate);
    params.set("range", dateRange);
    const res = await fetch(`/api/restaurant/overview?${params.toString()}`, { cache: "no-store", signal });
    if (!res.ok) throw new Error(`Overview HTTP ${res.status}`);
    const json = await res.json() as OverviewApi;
    if (!json?.ok) throw new Error(json?.error ?? "Overview failed");
    if (!Array.isArray(json.kpis)) json.kpis = [];
    if (!json.series) json.series = {};
    setData(json);
  }, [locationId, insightDate, dateRange]);

  const fetchLatestDate = React.useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/dashboard/latest-date", { cache: "no-store", signal });
    if (!res.ok) throw new Error(`Latest date HTTP ${res.status}`);
    const json = await res.json() as LatestDateApi;
    setInsightDate(json?.latest_date ?? null);
  }, []);

  const fetchMLInsights = React.useCallback(async (signal?: AbortSignal) => {
    if (!insightDate) return;
    const qs = new URLSearchParams({ as_of_date: insightDate.slice(0, 10), limit: "10" });
    if (locationId !== "all") qs.set("location_id", locationId);
    const res = await fetch(`/api/ml/alerts?${qs.toString()}`, { cache: "no-store", signal });
    if (!res.ok) return;
    const json = await res.json();
    setRisks(json?.risks ?? []);
    setActions(json?.actions ?? []);
  }, [insightDate, locationId]);

  React.useEffect(() => {
    const ac = new AbortController();
    fetchLocations(ac.signal);
    return () => ac.abort();
  }, [fetchLocations]);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true); setErr(null);
      try { await fetchOverview(ac.signal); }
      catch (e: any) { if (e?.name !== "AbortError") setErr(e?.message ?? "Failed"); }
      finally { setLoading(false); }
    })();
    return () => ac.abort();
  }, [fetchOverview]);

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try { await fetchLatestDate(ac.signal); }
      catch (e: any) { if (e?.name !== "AbortError") setErr(e?.message ?? "Failed"); }
    })();
    return () => ac.abort();
  }, [fetchLatestDate]);

  React.useEffect(() => {
    if (!insightDate) return;
    const params = new URLSearchParams(searchParams.toString());
    if (locationId !== "all") params.set("location_id", locationId);
    else params.delete("location_id");
    params.set("day", insightDate);
    router.replace(`/restaurant?${params.toString()}`, { scroll: false });
  }, [insightDate]);

  React.useEffect(() => {
    if (!insightDate) return;
    const ac = new AbortController();
    fetchMLInsights(ac.signal);
    return () => ac.abort();
  }, [fetchMLInsights]);

  React.useEffect(() => {
    const next = urlLocationId?.trim() ? urlLocationId : "all";
    setLocationId((prev) => prev === next ? prev : next);
  }, [urlLocationId]);

  const refreshAll = React.useCallback(async () => {
    const ac = new AbortController();
    try {
      setLoading(true); setErr(null);
      await Promise.all([fetchOverview(ac.signal), fetchLatestDate(ac.signal)]);
      await fetchMLInsights(ac.signal);
    } catch (e: any) { if (e?.name !== "AbortError") setErr(e?.message ?? "Failed"); }
    finally { setLoading(false); }
  }, [fetchOverview, fetchLatestDate, fetchMLInsights]);

  if (loading) return <Skeleton />;

  const kpis   = data?.kpis ?? [];
  const series = data?.series ?? {};

  const byCode = new Map(kpis.map((k) => [k.code, k]));
  // Ensure FREE_CASH_FLOW exists
  if (!byCode.has("FREE_CASH_FLOW")) {
    byCode.set("FREE_CASH_FLOW", { code: "FREE_CASH_FLOW", label: "Free Cash Flow", value: null, unit: "usd", delta: null });
  }
  const pick = (codes: string[]) => codes.map((c) => byCode.get(c)).filter(Boolean) as RestaurantKpi[];

  // 4 groups × 4 KPIs
  const salesGroup      = pick(["REVENUE", "ORDERS", "CUSTOMERS", "ARPU"]);
  const costGroup       = pick(["GROSS_MARGIN", "FOOD_COST_RATIO", "LABOR_COST_RATIO", "PRIME_COST_RATIO"]);
  const profitGroup     = pick(["GROSS_PROFIT", "EBIT", "PRIME_COST", "COGS"]);
  const financialGroup  = pick(["AR_DAYS", "AP_DAYS", "CASH_CONVERSION_CYCLE", "FREE_CASH_FLOW"]);

  // Performance Insights data
  const revSeries  = series["REVENUE"] ?? [];
  const locRevMap  = new Map<string, number>();
  locations.forEach((loc) => {
    const locKpiVal = kpis.find((k) => k.code === "REVENUE")?.value;
    if (locKpiVal) locRevMap.set(loc.location_name ?? loc.id, Number(locKpiVal));
  });
  const maxLocRev = Math.max(...Array.from(locRevMap.values()), 1);

  const ratios = [
    { label: "Gross Margin", value: byCode.get("GROSS_MARGIN")?.value, good: (v: number) => v >= 0.6, format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Food Cost %",  value: byCode.get("FOOD_COST_RATIO")?.value, good: (v: number) => v <= 0.32, format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Labor Cost %", value: byCode.get("LABOR_COST_RATIO")?.value, good: (v: number) => v <= 0.30, format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: "Prime Cost %", value: byCode.get("PRIME_COST_RATIO")?.value, good: (v: number) => v <= 0.62, format: (v: number) => `${(v * 100).toFixed(1)}%` },
  ];

  const HeaderCard = (
    <SectionCard title="Business Overview" subtitle="Portfolio-level performance across revenue, cost, cash flow, and operating health.">
      <div className="pt-2">
        <DashboardFilters
          locations={locations}
          locationId={locationId}
          onLocationChange={(id) => { setLocationId(id); updateLocationInUrl(id); }}
          dateRange={dateRange as any}
          onDateRangeChange={setDateRange}
          insightDate={insightDate}
          onDateChange={setInsightDate}
          onRefresh={refreshAll}
          loading={loading}
        />
      </div>
    </SectionCard>
  );

  if (!kpis.length) {
    return (
      <div className="space-y-4">
        {HeaderCard}
        <SectionCard title="No data available" subtitle={`No data found for the selected range.${insightDate ? ` Latest: ${new Date(insightDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}`}>
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border/50 bg-background/20 p-4 text-sm text-muted-foreground">
              Try selecting a different date range or use the date picker.
            </div>
            {insightDate && (
              <button onClick={() => { setDateRange("90d"); refreshAll(); }}
                className="self-start rounded-xl border border-border/60 bg-background/40 px-4 py-2 text-sm font-semibold hover:bg-background/60">
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

      {/* Row 1: Sales Performance + Cost & Efficiency */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Sales Performance" subtitle="Revenue, orders, and demand trends">
          <div className="grid grid-cols-2 gap-3">
            {salesGroup.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]}
                locationId={locationId !== "all" ? locationId : null} source="overview" />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Cost & Efficiency" subtitle="Food, labor, and operating cost control">
          <div className="grid grid-cols-2 gap-3">
            {costGroup.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]}
                locationId={locationId !== "all" ? locationId : null} source="overview" />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Profit Performance + Financial Health */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Profit Performance" subtitle="Profit generation and margin health">
          <div className="grid grid-cols-2 gap-3">
            {profitGroup.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]}
                locationId={locationId !== "all" ? locationId : null} source="overview" />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Financial Health" subtitle="Cash cycle, working capital, and free cash flow">
          <div className="grid grid-cols-2 gap-3">
            {financialGroup.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]}
                locationId={locationId !== "all" ? locationId : null} source="overview" />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Performance Insights */}
      <SectionCard title="Performance Insights" subtitle="Revenue trend, location comparison, and key ratio health">
        <div className="grid grid-cols-1 gap-0 divide-y divide-border xl:divide-y-0 xl:divide-x xl:grid-cols-3">

          {/* Revenue Trend Sparkline */}
          <div className="space-y-2 pb-6 xl:pb-0 xl:pr-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Revenue Trend
            </div>
            <MiniSparkline values={revSeries} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{dateRange === "7d" ? "7 days" : dateRange === "30d" ? "30 days" : dateRange === "90d" ? "90 days" : "Year to date"}</span>
              <span className="font-semibold text-foreground">{fmtUsd(revSeries[revSeries.length - 1])}</span>
            </div>
          </div>

          {/* Location Comparison */}
          <div className="space-y-2 py-6 xl:py-0 xl:px-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Location Comparison
            </div>
            {locations.length === 0 ? (
              <div className="text-xs text-muted-foreground">Select a date to see location breakdown</div>
            ) : (
              <div className="space-y-2">
                {locations.slice(0, 4).map((loc, i) => {
                  const rev = Number(byCode.get("REVENUE")?.value ?? 0) / Math.max(locations.length, 1);
                  return (
                    <LocationBar key={loc.id} name={loc.location_name ?? loc.id}
                      value={rev} max={maxLocRev} rank={i} />
                  );
                })}
              </div>
            )}
          </div>

          {/* Key Ratio Health */}
          <div className="space-y-2 pt-6 xl:pt-0 xl:pl-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Key Ratio Health
            </div>
            <div className="space-y-2">
              {ratios.map((r, i) => {
                const v = Number(r.value ?? 0);
                const isGood = r.good(v);
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">{r.label}</div>
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${isGood ? "bg-emerald-400" : "bg-red-400"}`} />
                      <div className={`text-xs font-semibold ${isGood ? "text-emerald-400" : "text-red-400"}`}>
                        {r.format(v)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Row 4: Valora Intelligence — unified card */}
      <SectionCard
        title="⚡ Valora Intelligence"
        subtitle="AI-powered alerts and recommended actions for your business."
      >
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-2 xl:divide-x xl:divide-border">

          {/* Left: Attention Required */}
          <div className="pb-4 xl:pb-0 xl:pr-6">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-foreground">Attention Required</span>
              {risks.length > 0 && (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  {risks.length}
                </span>
              )}
            </div>

            {risks.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/20 p-4 text-xs text-muted-foreground">
                No active alerts detected for this period.
              </div>
            ) : (
              <div className="space-y-2">
                {risks
                  .sort((a, b) => Number(b.impact_estimate ?? 0) - Number(a.impact_estimate ?? 0))
                  .slice(0, 3)
                  .map((r, i) => {
                    const cfg = severityConfig(r.severity_band);
                    const href = `/restaurant/valora-intelligence/alerts?source=overview&location_id=${r.location_id}&risk_type=${encodeURIComponent(r.risk_type)}&day=${insightDate ?? ""}&dept=overview`;
                    return (
                      <Link key={i} href={href}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/20 p-3 transition hover:bg-background/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{r.location_name}</div>
                            <div className="text-[10px] text-muted-foreground">{humanize(r.risk_type)}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold text-foreground">{fmtUsd(r.impact_estimate)}</div>
                          <div className="text-[10px] text-muted-foreground">impact</div>
                        </div>
                      </Link>
                    );
                  })}
                <Link
                  href={`/restaurant/valora-intelligence/alerts?source=overview${locationId !== "all" ? `&location_id=${locationId}` : ""}&day=${insightDate ?? ""}&dept=overview`}
                  className="block text-center rounded-xl border border-border/40 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background/40 transition"
                >
                  View all {risks.length} alerts →
                </Link>
              </div>
            )}
          </div>

          {/* Right: Recommended Actions */}
          <div className="pt-4 xl:pt-0 xl:pl-6 border-t border-border xl:border-t-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-foreground">Recommended Actions</span>
              {actions.length > 0 && (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {actions.length}
                </span>
              )}
            </div>

            {actions.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-background/20 p-4 text-xs text-muted-foreground">
                No recommendations available for this period.
              </div>
            ) : (
              <div className="space-y-2">
                {actions.slice(0, 3).map((a, i) => {
                  const href = `/restaurant/valora-intelligence/actions?source=overview&location_id=${a.location_id}&day=${insightDate ?? ""}&dept=overview`;
                  const tierEmoji = i === 0 ? "🏆" : i === 1 ? "⚖️" : "🌱";
                  return (
                    <Link key={i} href={href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/20 p-3 transition hover:bg-background/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{tierEmoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate">{humanize(a.action_code)}</div>
                          <div className="text-[10px] text-muted-foreground">{a.location_name}</div>
                        </div>
                      </div>
                      {a.expected_roi !== null && (
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold text-emerald-400">+{(Number(a.expected_roi) * 100).toFixed(0)}%</div>
                          <div className="text-[10px] text-muted-foreground">ROI</div>
                        </div>
                      )}
                    </Link>
                  );
                })}
                <Link
                  href={`/restaurant/valora-intelligence/actions?source=overview${locationId !== "all" ? `&location_id=${locationId}` : ""}&day=${insightDate ?? ""}&dept=overview`}
                  className="block text-center rounded-xl border border-border/40 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background/40 transition"
                >
                  View all {actions.length} actions →
                </Link>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
