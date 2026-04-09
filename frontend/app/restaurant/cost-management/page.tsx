//frontend/app/restaurant/cost-control/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { SectionCard } from "@/components/valora/SectionCard";
import { PageScaffold } from "@/components/restaurant/PageScaffold";
import { ValoraIntelligence } from "@/components/restaurant/ValoraIntelligence";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";
import { DashboardFilters } from "@/components/restaurant/DashboardFilters";
type Unit = "usd" | "pct" | "days" | "ratio" | "count";
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

type LocationRow = {
  location_id: string;
  location_code: string;
  name: string;
};

type ApiAlert = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
};

type ApiAction = {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  rationale: string;
  owner?: string;
};

type CostControlResponse = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  window?: string;
  location?: { id: string; name: string };
  kpis: ApiKpi[];
  series: Record<string, (number | null)[] | string[]>;
  alerts: ApiAlert[];
  actions: ApiAction[];
  error?: string;
};

type ChartTone = "food" | "labor" | "prime" | "waste" | "discount";

function SkeletonGroup({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30"
          />
        ))}
      </div>
    </SectionCard>
  );
}

function toneClass(tone: ChartTone) {
  switch (tone) {
    case "food":
      return "text-amber-400";
    case "labor":
      return "text-sky-400";
    case "prime":
      return "text-violet-400";
    case "waste":
      return "text-rose-400";
    case "discount":
      return "text-emerald-400";
    default:
      return "text-foreground";
  }
}

function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}

function normalizeLabels(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function toNums(arr: any): (number | null)[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  });
}

function LineChart({
  title,
  labels,
  values,
  valueFmt,
  tone,
}: {
  title: string;
  labels: string[];
  values: (number | null)[];
  valueFmt?: (n: number) => string;
  tone: ChartTone;
}) {
  const w = 720;
  const h = 180;
  const pad = 28;

  const clean = values.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : null
  );
  const nums = clean.filter((v): v is number => v !== null);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const span = max - min || 1;

  const xStep = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0;

  const pts = clean.map((v, i) => {
    const x = pad + i * xStep;
    const y =
      v === null ? null : pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  const dParts: string[] = [];
  let started = false;
  for (const p of pts) {
    if (p.y === null) {
      started = false;
      continue;
    }
    dParts.push(`${started ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    started = true;
  }
  const d = dParts.join(" ");

  let lastVal: number | null = null;
  for (let i = pts.length - 1; i >= 0; i--) {
    if (pts[i].v !== null) {
      lastVal = pts[i].v as number;
      break;
    }
  }

  const toneCls = toneClass(tone);
  const gradId = `cost-grad-${title.replaceAll(" ", "-").toLowerCase()}`;

  return (
    <SectionCard
      title={title}
      subtitle={null}
      right={
        <div className="text-xs text-muted-foreground">
          {lastVal === null
            ? "—"
            : valueFmt
              ? valueFmt(lastVal)
              : lastVal.toFixed(2)}
        </div>
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} className={`h-[180px] w-full ${toneCls}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke="currentColor"
          opacity="0.10"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={h - pad}
          stroke="currentColor"
          opacity="0.10"
        />

        {d ? (
          <>
            <path
              d={`${d} L ${(w - pad).toFixed(2)} ${(h - pad).toFixed(
                2
              )} L ${pad.toFixed(2)} ${(h - pad).toFixed(2)} Z`}
              fill={`url(#${gradId})`}
              opacity="0.9"
            />
            <path
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              opacity="0.92"
            />
          </>
        ) : null}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>{labels.length ? labels[0] : "—"}</div>
        <div>{labels.length ? labels[labels.length - 1] : "—"}</div>
      </div>
    </SectionCard>
  );
}

function severityCardClass(severity: Severity) {
  switch (severity) {
    case "risk":
      return "border-red-500/30 bg-red-500/10";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10";
    default:
      return "border-emerald-500/30 bg-emerald-500/10";
  }
}

export default function CostControlPage() {
  const [windowCode, setWindowCode] = React.useState<
    "7d" | "30d" | "90d" | "ytd">("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("");

  const [data, setData] = React.useState<CostControlResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [locations, setLocations] = React.useState<LocationRow[]>([]);

  const [mlRisks, setMlRisks] = React.useState<any[]>([]);
  const [mlBriefs, setMlBriefs] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/restaurant/locations", {
          cache: "no-store",
        });
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

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("window", windowCode);
      if (asOf.trim()) sp.set("as_of", asOf.trim());
      if (locationId !== "all") sp.set("location_id", locationId);

      const res = await fetch(`/api/restaurant/cost-control?${sp.toString()}`, {
        cache: "no-store",
      });
      const text = await res.text();

      let json: CostControlResponse;
      try {
        json = JSON.parse(text) as CostControlResponse;
      } catch {
        throw new Error(
          `Cost Control API returned non-JSON (${res.status}). BodyPreview=${text.slice(
            0,
            140
          )}`
        );
      }

      setData(json);
    } catch (e: any) {
      setData({
        ok: false,
        as_of: null,
        kpis: [],
        series: {},
        alerts: [],
        actions: [],
        error: e?.message ?? String(e),
      });
    } finally {
      setLoading(false);
    }
  }, [windowCode, locationId, asOf]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (asOf.trim()) return;
    (async () => {
      try {
        const r = await fetch("/api/dashboard/latest-date", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (j?.latest_date) setAsOf(j.latest_date);
      } catch { }
    })();
  }, []);

  React.useEffect(() => {
    if (!asOf.trim()) return;
    const day = asOf.trim().slice(0, 10);
    const qs = new URLSearchParams({ day, limit: "10" });
    if (locationId !== "all") qs.set("location_id", locationId);
    (async () => {
      try {
        const r = await fetch(`/api/dashboard/ml-insights?${qs.toString()}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        setMlRisks(j?.risks ?? []);
        setMlBriefs(j?.briefs ?? []);
      } catch { }
    })();
  }, [asOf, locationId]);

  const ok = Boolean(data?.ok);
  const kpis = data?.kpis ?? [];
  const series = data?.series ?? {};
  const alerts = data?.alerts ?? [];
  const actions = data?.actions ?? [];

  const tileKpis: RestaurantKpi[] = React.useMemo(() => {
    return kpis.map((k) => {
      const v =
        k.unit === "pct" &&
          typeof k.value === "number" &&
          k.value > 1
          ? k.value / 100
          : k.value;
      return { ...(k as any), value: v } as RestaurantKpi;
    });
  }, [kpis]);

  const byCode = React.useMemo(
    () => new Map(tileKpis.map((k) => [k.code, k])),
    [tileKpis]
  );

  const costDisciplineKpis = [
    "CC_FOOD_COST_PCT",
    "CC_LABOR_COST_PCT",
    "CC_PRIME_COST_PCT",
    "CC_WASTE_PCT",
  ]
    .map((code) => byCode.get(code))
    .filter(Boolean) as RestaurantKpi[];

  const leakageControlKpis = [
    "CC_DISCOUNT_PCT",
    "CC_STOCKOUTS",
    "CC_VOID_PCT",
    "CC_COMP_PCT",
  ]
    .map((code) => byCode.get(code))
    .filter(Boolean) as RestaurantKpi[];

  const usedCodes = new Set([
    ...costDisciplineKpis.map((k) => k.code),
    ...leakageControlKpis.map((k) => k.code),
  ]);

  const fallbackKpis = tileKpis.filter((k) => !usedCodes.has(k.code));

  while (costDisciplineKpis.length < 4 && fallbackKpis.length) {
    costDisciplineKpis.push(fallbackKpis.shift()!);
  }
  while (leakageControlKpis.length < 4 && fallbackKpis.length) {
    leakageControlKpis.push(fallbackKpis.shift()!);
  }

  const dayLabels = normalizeLabels(series.day);
  const foodTrend = toNums(series.FOOD_COST_PCT);
  const laborTrend = toNums(series.LABOR_COST_PCT);
  const primeTrend = toNums(series.PRIME_COST_PCT);
  const wasteTrend = toNums(series.WASTE_PCT);
  const discountTrend = toNums(series.DISCOUNT_PCT);

  const header = (
    <SectionCard
      title="Cost Control Intelligence"
      subtitle="Monitor controllable cost pressure, leakage, and margin discipline across locations."
    >
      <div className="space-y-3">
        <DashboardFilters
          locations={locationsUnique.map((l) => ({
            id: l.location_id,
            location_id: l.location_id,
            location_name: l.name,
          }))}
          locationId={locationId}
          onLocationChange={setLocationId}
          dateRange={windowCode as any}
          onDateRangeChange={(v) => setWindowCode(v as any)}
          insightDate={asOf || null}
          onDateChange={setAsOf}
          onRefresh={load}
          loading={loading}
        />

        {!ok && data?.error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
            <div className="font-medium">Cost Control API Error</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {data.error}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );

  const kpiSection = loading ? (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SkeletonGroup title="Cost Discipline" />
      <SkeletonGroup title="Leakage & Controls" />
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SectionCard
        title="Cost Discipline"
        subtitle="Core controllable cost structure across the selected window."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {costDisciplineKpis.map((k) => (
            <RestaurantKpiTile
              key={k.code}
              kpi={k}
              series={(series as any)[k.code] ?? []}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Leakage & Controls"
        subtitle="Discount, waste, stock pressure, and other margin leakage signals."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {leakageControlKpis.map((k) => (
            <RestaurantKpiTile
              key={k.code}
              kpi={k}
              series={(series as any)[k.code] ?? []}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const intelligence =
    !loading ? (
      <SectionCard
        title="Valora Intelligence"
        subtitle="What needs attention and what actions to take."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Attention Required */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Attention Required</div>
            <div className="text-xs text-muted-foreground">Critical cost alerts and exceptions.</div>
            {mlRisks.length ? (
              <div className="space-y-3">
                {mlRisks.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className={`rounded-xl border p-3 ${a.severity_band === "critical" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {a.location_name} — {(a.risk_type ?? "").split("_").map((w: string) => w[0]?.toUpperCase() + w.slice(1)).join(" ")}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Impact: ${Number(a.impact_estimate ?? 0).toFixed(0)} · Severity: {a.severity_band}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${a.severity_band === "critical" ? "border-red-500/20 bg-red-500/10" : "border-amber-500/20 bg-amber-500/10"}`}>
                        {a.severity_band}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Link href={`/restaurant/valora-intelligence/alerts?source=cost-management${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
                    View all alerts →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No critical cost issues detected for this period.
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          <div className="space-y-3 xl:border-l xl:border-border/40 xl:pl-6">
            <div className="text-sm font-semibold text-foreground">Recommended Actions</div>
            <div className="text-xs text-muted-foreground">AI-driven cost reduction actions.</div>
            {mlBriefs.length ? (
              <div className="space-y-3">
                {mlBriefs.slice(0, 1).map((b: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="text-sm font-semibold text-foreground">{b.headline}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{b.location_name}</div>
                    <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">{b.summary_text}</div>
                    {b.model_name && <div className="mt-2 text-[10px] text-muted-foreground/60">Generated by {b.model_name}</div>}
                  </div>
                ))}
                <div className="flex justify-end">
                  <Link href={`/restaurant/valora-intelligence/actions?source=cost-management${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
                    View all actions →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No recommended actions available yet.
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    ) : null;

  const charts =
    !loading ? (
      <>
        <LineChart
          title="Food Cost % Trend"
          labels={dayLabels}
          values={foodTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="food"
        />
        <LineChart
          title="Labor Cost % Trend"
          labels={dayLabels}
          values={laborTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="labor"
        />
        <LineChart
          title="Prime Cost % Trend"
          labels={dayLabels}
          values={primeTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="prime"
        />
        <LineChart
          title="Waste % Trend"
          labels={dayLabels}
          values={wasteTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="waste"
        />
        <LineChart
          title="Discount % Trend"
          labels={dayLabels}
          values={discountTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="discount"
        />
      </>
    ) : null;

  const performanceInsights =
    !loading ? (
      <SectionCard
        title="Performance Insights"
        subtitle="What changed across cost pressure, leakage, and controllable expense trends."
      >
        {alerts.length ? (
          <div className="space-y-3">
            {alerts.slice(0, 4).map((a) => (
              <div
                key={`insight-${a.id}`}
                className={`rounded-xl border p-3 ${severityCardClass(a.severity)}`}
              >
                <div className="text-sm font-semibold text-foreground">
                  {a.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {a.detail}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
            No major cost-control shifts detected for this selection.
          </div>
        )}
      </SectionCard>
    ) : null;


  return (
    <PageScaffold
      header={header}
      kpiSection={kpiSection}
      charts={charts}
      performanceInsights={performanceInsights}
      intelligence={intelligence}
    />
  );
}