// app/restaurant/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import { DataFreshnessPill } from "@/components/restaurant/DataFreshnessPill";

import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";

/**
 * FINAL FIXES IN THIS VERSION:
 * 1) Header uses SectionCard styling (consistent with the rest of the page).
 * 2) Header formatting is stacked lines (exact format requested).
 * 3) Location dropdown uses stable {id,label} mapping from /api/restaurant/locations, deduped.
 * 4) Location change triggers overview refetch (existing effect).
 * 5) No hooks (useMemo/useEffect) are called after early returns (rules-of-hooks safe).
 */

type LocationOpt = { id: string; label: string };

type DataStatus = {
  ok: boolean;
  latest_day: string | null;
  last_ingested_at: string | null;
  rows_24h: string;
  last_source_file: string | null;
};

type OverviewApi = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  location?: { id: string; name: string };
  kpis: RestaurantKpi[];
  series?: Record<string, number[]>;
  notes?: string;
};

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="h-6 w-56 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-96 rounded bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
  const [status, setStatus] = React.useState<DataStatus | null>(null);

  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>("all");

  const fetchStatus = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/data-status", { cache: "no-store", signal });
      if (!r.ok) return;
      const j = (await r.json()) as DataStatus;
      setStatus(j);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        // non-critical
      }
    }
  }, []);

  // map /api/restaurant/locations response into stable {id,label}
  const fetchLocations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/locations", { cache: "no-store", signal });
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

      // de-dupe by id
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

      try {
        const qs = locationId !== "all" ? `?location_id=${encodeURIComponent(locationId)}` : "";
        const res = await fetch(`/api/restaurant/overview${qs}`, { cache: "no-store", signal });

        if (res.status === 404) {
          setData(null);
          return;
        }

        if (!res.ok) throw new Error(`Restaurant overview HTTP ${res.status}`);
        const json = (await res.json()) as OverviewApi;

        if (!Array.isArray((json as any).kpis)) {
          throw new Error("Invalid API: kpis must be an array");
        }

        setData(json);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr(e?.message ?? "Failed to load restaurant overview");
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  // Mount: status + locations
  React.useEffect(() => {
    const ac = new AbortController();
    fetchStatus(ac.signal);
    fetchLocations(ac.signal);
    return () => ac.abort();
  }, [fetchStatus, fetchLocations]);

  // Location change: overview
  React.useEffect(() => {
    const ac = new AbortController();
    fetchOverview(ac.signal);
    return () => ac.abort();
  }, [fetchOverview]);

  // Optional: refresh status every 60s
  React.useEffect(() => {
    const id = window.setInterval(() => fetchStatus(), 60_000);
    return () => window.clearInterval(id);
  }, [fetchStatus]);

  if (loading) return <Skeleton />;

  if (err) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Restaurant Overview</div>
        <div className="mt-2 text-sm text-danger">{err}</div>
        <div className="mt-3">
          <Link href="/restaurant/data" className="text-sm font-semibold text-foreground hover:underline">
            Go to Data →
          </Link>
        </div>
      </div>
    );
  }

  // ---- header computed values (safe for both empty + data state) ----
  const asOfStr = data?.as_of ? new Date(data.as_of).toLocaleString() : "—";

  const locationLabel =
    locationId === "all"
      ? "All Locations"
      : locations.find((l) => l.id === locationId)?.label ??
        data?.location?.name ??
        "Location";

  const refreshedStr = data?.refreshed_at ? new Date(data.refreshed_at).toLocaleString() : null;

  // Replace ONLY the HeaderCard block in your current app/restaurant/page.tsx
// (Everything else stays the same.)

const HeaderCard = (
  <SectionCard
    title="Restaurant KPIs"
    subtitle="Executive view for Profit, Growth, and Ops."
  >
    <div className="relative pt-2">
      
      {/* 🔹 Top-right location dropdown */}
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

      {/* 🔹 Stacked info (left aligned) */}
      <div className="space-y-2 pr-[220px]">
        <div className="text-sm text-muted-foreground">
          As of:{" "}
          <span className="font-medium text-foreground">{asOfStr}</span>
        </div>

        <div className="text-sm font-semibold text-foreground">
          {locationLabel}
        </div>
      </div>

    </div>
  </SectionCard>
);

  // ----- EMPTY STATE -----
  if (!data) {
    return (
      <div className="space-y-4">
        {HeaderCard}

        <SectionCard title="Get started" subtitle="No restaurant data connected yet.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">1) Upload CSV</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Add sales, labor, and inventory extracts. We’ll normalize into the restaurant model.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">2) Validate & map</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Map columns (location, day, revenue, COGS, labor, fixed costs) and confirm KPI readiness.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">3) Toast connector</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  After CSV MVP, connect Toast for continuous ingestion + automated refresh.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Link href="/restaurant/data" className="text-sm font-semibold text-foreground hover:underline">
              Open Data setup →
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ----- DATA STATE -----
  const kpis = data.kpis ?? [];
  const series = data.series ?? {};

  const byCode = new Map(kpis.map((k) => [k.code, k]));
  const pick = (codes: string[]) =>
    codes.map((c) => byCode.get(c)).filter(Boolean) as RestaurantKpi[];

  const spotlight = pick([
    "REVENUE",
    "GROSS_MARGIN",
    "FOOD_COST_RATIO",
    "LABOR_COST_RATIO",
    "PRIME_COST_RATIO",
    "SAFETY_MARGIN",
    "BREAK_EVEN_REVENUE",
    "CASH_CONVERSION_CYCLE",
  ]);

  const profitCost = pick([
    "COGS",
    "GROSS_PROFIT",
    "FIXED_COSTS",
    "FIXED_COST_COVERAGE_RATIO",
    "DAYS_INVENTORY_ON_HAND",
    "AVG_INVENTORY",
    "AR_DAYS",
    "AP_DAYS",
  ]);

  const growth = pick(["ORDERS", "ARPU", "CUSTOMER_CHURN", "CAC"]);
  const leverage = pick(["EBIT", "INTEREST_EXPENSE", "INTEREST_COVERAGE_RATIO"]);

  const used = new Set([...spotlight, ...profitCost, ...growth, ...leverage].map((k) => k.code));
  const remaining = kpis.filter((k) => !used.has(k.code));

  return (
    <div className="space-y-4">
      {HeaderCard}

      <SectionCard
        title="Executive spotlight"
        subtitle="High-signal KPIs tied to Menu Pricing Power, Inflation, Efficiency, Inventory health, and Cash cycle."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {spotlight.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Profit & cost structure"
        subtitle="Unit economics and break-even coverage (prime cost, fixed cost coverage, safety margin)."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profitCost.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/restaurant/costs" className="text-sm font-semibold text-foreground hover:underline">
            Go deeper: Costs →
          </Link>
          <span className="text-muted-foreground">•</span>
          <Link href="/restaurant/profit" className="text-sm font-semibold text-foreground hover:underline">
            Go deeper: Profit →
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Growth" subtitle="Demand, customer retention, acquisition efficiency.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {growth.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Leverage & credit" subtitle="Debt servicing capacity and interest stress.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {leverage.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      {remaining.length ? (
        <SectionCard title="Additional KPIs" subtitle="Automatically shown when new KPIs are added to the API.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {remaining.map((k) => (
              <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}