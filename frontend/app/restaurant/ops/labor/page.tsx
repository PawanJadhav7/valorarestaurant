// app/restaurant/ops/labor/page.tsx
"use client";

import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
import { RestaurantKpiTile, type Kpi as RestaurantKpi } from "@/components/restaurant/KpiTile";

type Unit = "usd" | "pct" | "days" | "ratio" | "count" | "hours";
type Severity = "good" | "warn" | "risk";

type ApiKpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

type LocationRow = { location_id: string; location_code: string; name: string };

type LaborResponse = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  window?: string;
  location?: { id: string; name: string };
  kpis: ApiKpi[];
  series?: Record<string, number[]>;
  notes?: string;
  error?: string;
};

function SkeletonTiles({ n = 5 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30" />
      ))}
    </div>
  );
}

function formatAsOf(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default function LaborOpsPage() {
  const [windowCode, setWindowCode] = React.useState<"7d" | "30d" | "90d" | "ytd">("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("");

  const [data, setData] = React.useState<LaborResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [locations, setLocations] = React.useState<LocationRow[]>([]);

  // Load locations once
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/restaurant/locations", { cache: "no-store" });
        const j = await r.json();
        const raw = (j.locations ?? []) as any[];

        const mapped: LocationRow[] = raw
          .map((x) => ({
            location_id: String(x.location_id ?? x.id ?? ""),
            location_code: String(x.location_code ?? x.code ?? "LOC"),
            name: String(x.name ?? "Location"),
          }))
          .filter((x) => x.location_id);

        setLocations(mapped);
      } catch {
        setLocations([]);
      }
    })();
  }, []);

  const locationsUnique = React.useMemo(() => {
    const seen = new Set<string>();
    const out: LocationRow[] = [];
    for (const l of locations) {
      const id = String(l.location_id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(l);
    }
    return out;
  }, [locations]);

  const locLabel =
    locationId === "all"
      ? "All Locations"
      : (() => {
          const l = locations.find((x) => x.location_id === locationId);
          return l ? `${l.location_code} — ${l.name}` : "Location";
        })();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("window", windowCode);
      if (asOf.trim()) sp.set("as_of", asOf.trim());
      if (locationId !== "all") sp.set("location_id", locationId);

      const res = await fetch(`/api/restaurant/labor?${sp.toString()}`, { cache: "no-store" });
      const text = await res.text();

      let json: LaborResponse;
      try {
        json = JSON.parse(text) as LaborResponse;
      } catch {
        throw new Error(`Labor API returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 140)}`);
      }

      setData(json);
    } catch (e: any) {
      setData({
        ok: false,
        as_of: null,
        kpis: [],
        series: {},
        error: e?.message ?? String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [windowCode, locationId, asOf]);

  React.useEffect(() => {
    load();
  }, [load]);

  const ok = Boolean(data?.ok);
  const kpis = data?.kpis ?? [];
  const series = data?.series ?? {};
  const asOfLabel = formatAsOf(data?.as_of);

  // Convert API KPI -> RestaurantKpiTile shape
  const tileKpis: RestaurantKpi[] = React.useMemo(() => {
    return kpis.map((k) => {
      // normalize pct to 0..1 if backend sends 0..100
      const v = k.unit === "pct" && typeof k.value === "number" && k.value > 1 ? k.value / 100 : k.value;
      return { ...(k as any), value: v } as RestaurantKpi;
    });
  }, [kpis]);

  return (
    <div className="space-y-4">
      {/* Header (same premium pattern as Sales/Overview) */}
      <SectionCard title="Labor" subtitle="Labor cost control, overtime, and productivity for the selected window.">
        <div className="relative pt-2">
          {/* top-right controls */}
          <div className="absolute right-0 top-0 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Location</label>
              <select
                className="h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="all">All Locations</option>
                {locationsUnique.map((l) => (
                  <option key={l.location_id} value={l.location_id}>
                    {l.location_code} — {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Window</label>
              <select
                className="h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
                value={windowCode}
                onChange={(e) => setWindowCode(e.target.value as any)}
              >
                <option value="7d">7D</option>
                <option value="30d">30D</option>
                <option value="90d">90D</option>
                <option value="ytd">YTD</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">As of</label>
              <input
                className="h-9 w-[240px] rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                placeholder="(optional) 2026-02-18T19:00:00-05:00"
              />
            </div>

            <button
              className="h-9 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {/* left stacked info */}
          <div className="space-y-2 pr-[760px]">
            <div className="text-sm text-muted-foreground">Control labor %, reduce overtime, improve output per hour.</div>

            <div className="text-sm text-muted-foreground">
              As of: <span className="font-medium text-foreground">{asOfLabel}</span>
            </div>

            <div className="text-sm font-semibold text-foreground">{locLabel}</div>
          </div>

          {!ok && data?.error ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
              <div className="font-medium">Labor API Error</div>
              <div className="mt-1 text-xs text-muted-foreground">{data.error}</div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* KPI tiles */}
      {loading ? (
        <SkeletonTiles />
      ) : tileKpis.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {tileKpis.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={series[k.code]} />
          ))}
        </div>
      ) : (
        <SectionCard title="No labor data yet" subtitle="Connect a labor source to populate these KPIs.">
          <div className="text-sm text-muted-foreground">
            {data?.notes ??
              "Upload a CSV first (daily labor cost + labor hours), then we’ll add schedule/punch integration for overtime + adherence trends."}
          </div>
        </SectionCard>
      )}

      {/* MVP next steps */}
      <SectionCard title="Next" subtitle="What we’ll add once labor series exists.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/30 p-4">
            <div className="text-sm font-semibold text-foreground">Labor % Trend</div>
            <div className="mt-1 text-sm text-muted-foreground">Labor cost / Revenue over time (warn/risk thresholds).</div>
          </div>

          <div className="rounded-2xl border border-border bg-background/30 p-4">
            <div className="text-sm font-semibold text-foreground">Overtime Trend</div>
            <div className="mt-1 text-sm text-muted-foreground">OT hours and OT % of total hours with alerts.</div>
          </div>

          <div className="rounded-2xl border border-border bg-background/30 p-4">
            <div className="text-sm font-semibold text-foreground">Productivity</div>
            <div className="mt-1 text-sm text-muted-foreground">Sales per labor hour (SPLH) with driver hints.</div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}