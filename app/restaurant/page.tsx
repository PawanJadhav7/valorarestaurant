// app/restaurant/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import { RestaurantKpiTile, type Kpi as RestaurantKpi } from "@/components/restaurant/KpiTile";

type LocationOpt = { id: string; label: string };

type OverviewApi = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  location?: { id: string; name: string };
  kpis: RestaurantKpi[];
  series?: Record<string, number[]>;
  notes?: string;
  error?: string;
};

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

  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>("all");

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

        if (!res.ok) throw new Error(`Restaurant overview HTTP ${res.status}`);

        const json = (await res.json()) as OverviewApi;

        if (!(json as any)?.ok) {
          throw new Error((json as any)?.error ?? "Overview API returned ok=false");
        }

        if (!Array.isArray((json as any).kpis)) (json as any).kpis = [];
        if (!(json as any).series) (json as any).series = {};

        setData(json);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr(e?.message ?? "Failed to load restaurant overview");
      } finally {
        setLoading(false);
      }
    },
    [locationId]
  );

  // Mount: locations
  React.useEffect(() => {
    const ac = new AbortController();
    fetchLocations(ac.signal);
    return () => ac.abort();
  }, [fetchLocations]);

  // Location change: overview
  React.useEffect(() => {
    const ac = new AbortController();
    fetchOverview(ac.signal);
    return () => ac.abort();
  }, [fetchOverview]);

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

  const asOfStr = data?.as_of ? new Date(data.as_of).toLocaleString() : "—";
  const locationLabel =
    locationId === "all"
      ? "All Locations"
      : locations.find((l) => l.id === locationId)?.label ?? data?.location?.name ?? "Location";

  const kpis = data?.kpis ?? [];
  const series = data?.series ?? {};

  const byCode = new Map(kpis.map((k) => [k.code, k]));
  const pick = (codes: string[]) => codes.map((c) => byCode.get(c)).filter(Boolean) as RestaurantKpi[];

  // Professional structure
  const revenueDemand = pick(["REVENUE", "ORDERS", "CUSTOMERS", "ARPU"]);

  const unitEconomics = pick(["GROSS_MARGIN", "FOOD_COST_RATIO", "LABOR_COST_RATIO", "PRIME_COST_RATIO"]);

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

  const workingCapital = pick(["DAYS_INVENTORY_ON_HAND", "AR_DAYS", "AP_DAYS", "CASH_CONVERSION_CYCLE"]);

  const stability = pick(["EBIT", "INTEREST_EXPENSE", "INTEREST_COVERAGE_RATIO"]);

  // Header
  const HeaderCard = (
    <SectionCard title="Restaurant KPIs" subtitle="Executive view for Profit, Growth, and Cash discipline.">
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
          <div className="text-sm font-semibold text-foreground">{locationLabel}</div>
        </div>
      </div>
    </SectionCard>
  );

  // Empty (no KPIs)
  if (!kpis.length) {
    return (
      <div className="space-y-4">
        {HeaderCard}

        <SectionCard title="Get started" subtitle="No KPI rows available for this selection yet.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">1) Load data</div>
                <div className="mt-1 text-sm text-muted-foreground">Upload sales/labor/inventory or run ingestion.</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">2) Validate</div>
                <div className="mt-1 text-sm text-muted-foreground">Confirm raw_daily has revenue/cogs/labor.</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-foreground">3) Re-check overview API</div>
                <div className="mt-1 text-sm text-muted-foreground">Ensure /api/restaurant/overview returns kpis[].</div>
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

  return (
    <div className="space-y-4">
      {HeaderCard}

      <SectionCard title="Revenue & demand" subtitle="Top-line performance and pricing power.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {revenueDemand.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Unit economics" subtitle="Core restaurant efficiency (margin + prime cost).">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {unitEconomics.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Profitability" subtitle="Revenue conversion into operating profit and break-even resilience.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profitability.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Working capital" subtitle="Inventory and cash efficiency over time.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workingCapital.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Financial stability" subtitle="Debt servicing and financial resilience.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stability.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}