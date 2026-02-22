// app/restaurant/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import { RestaurantTopBar } from "@/components/restaurant/RestaurantTopBar";
import { BackendTest } from "./BackendTest";

import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";

type LocationOpt = { id: string; name: string; rows: number };

type DataStatus = {
  ok: boolean;
  latest_day: string | null;
  last_ingested_at: string | null;
  rows_24h: string;
  last_source_file: string | null;
};

type OverviewApi = {
  ok: boolean;
  as_of: string;
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
        // non-critical in MVP
      }
    }
  }, []);

  const fetchLocations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/locations", { cache: "no-store", signal });
      if (!r.ok) return;
      const j = await r.json();
      setLocations((j?.locations ?? []) as LocationOpt[]);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        // non-critical in MVP
      }
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

  // ---- Shared "alive" background wrapper (same as your good page) ----
  const Background = (
    <div
      aria-hidden
      className="fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.35), transparent 45%)," +
          "radial-gradient(circle at 80% 30%, rgba(236,72,153,0.25), transparent 50%)," +
          "radial-gradient(circle at 40% 90%, rgba(34,197,94,0.20), transparent 55%)," +
          "linear-gradient(180deg, rgba(0,0,0,0.04), transparent 40%)",
      }}
    />
  );

  if (loading) {
    return (
      <div className="relative">
        {Background}
        <Skeleton />
      </div>
    );
  }

  if (err) {
    return (
      <div className="relative">
        {Background}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">Restaurant Overview</div>
          <div className="mt-2 text-sm text-danger">{err}</div>
          <div className="mt-3">
            <Link href="/restaurant/data" className="text-sm font-semibold text-foreground hover:underline">
              Go to Data →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----- EMPTY STATE -----
  if (!data) {
    return (
      <div className="relative space-y-4">
        {Background}

        <RestaurantTopBar
          title="Restaurant KPIs"
          subtitle="Executive dashboard for Profit, Growth, and Ops. Start with CSV (1–2 days), then connect Toast."
          locations={locations}
          locationId={locationId}
          onLocationChange={setLocationId}
          status={status}
        />

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
  const asOf = data.as_of ? new Date(data.as_of).toLocaleString() : "—";
  const locationName = data.location?.name ?? "";

  const byCode = new Map(kpis.map((k) => [k.code, k]));
  const pick = (codes: string[]) => codes.map((c) => byCode.get(c)).filter(Boolean) as RestaurantKpi[];

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
    <div className="relative space-y-4">
      {Background}

      <RestaurantTopBar
        title="Restaurant KPIs"
        subtitle={
          <>
            Executive view for Profit, Growth, and Ops. As of: {asOf}
            {locationName ? ` • ${locationName}` : ""}
          </>
        }
        locations={locations}
        locationId={locationId}
        onLocationChange={setLocationId}
        status={status}
      />

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

      {/* <SectionCard title="Next steps" subtitle="Once CSV ingestion is stable, we turn on AI narratives + driver analysis.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-foreground">AI Insights</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Convert KPI changes into “why it happened” and “what to do next” (menu, staffing, promos, waste).
              </div>
              <div className="mt-3">
                <Link href="/restaurant/insights" className="text-sm font-semibold text-foreground hover:underline">
                  Open AI Insights →
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-foreground">Multi-location</div>
              <div className="mt-1 text-sm text-muted-foreground">
                MVP supports multi-location. Add a selector once location_id is consistently ingested.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-foreground">Toast integration</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Testing connectivity to Toast’s API for real-time data sync. This is sample UI; actual integration may differ.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl md:col-span-3">
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Backend connectivity (temporary)</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Test a backend POST and visualize a response. Remove once Toast connector is real.
                </div>
              </div>
              <BackendTest />
            </CardContent>
          </Card>
        </div>
      </SectionCard> */}
    </div>
  );
}