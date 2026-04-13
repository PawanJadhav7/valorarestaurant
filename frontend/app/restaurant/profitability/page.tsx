//frontend/app/restaurant/profitability/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
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

type ProfitResponse = {
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

type ChartTone = "revenue" | "ebitda" | "margin" | "contribution" | "prime";

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
    case "revenue":
      return "text-emerald-400";
    case "ebitda":
      return "text-sky-400";
    case "margin":
      return "text-violet-400";
    case "contribution":
      return "text-amber-400";
    case "prime":
      return "text-rose-400";
    default:
      return "text-foreground";
  }
}

function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function normalizeLabels(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => {
    const s = String(x);
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    }
    return s;
  });
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

  const clean = values.map((v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = Number(v as any);
    return Number.isFinite(n) ? n : null;
  });

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
  const gradId = `profit-grad-${title.replaceAll(" ", "-").toLowerCase()}`;

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
              strokeWidth="2.8"
              opacity="0.98"
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

export default function ProfitPage() {
  const [windowCode, setWindowCode] = React.useState<
    "7d" | "30d" | "90d" | "ytd"
  >("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("");

  const [data, setData] = React.useState<ProfitResponse | null>(null);
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
            name: String(x.location_name ?? x.name ?? "Location"),
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

      const res = await fetch(`/api/restaurant/profit?${sp.toString()}`, {
        cache: "no-store",
      });
      const text = await res.text();

      let json: ProfitResponse;
      try {
        json = JSON.parse(text) as ProfitResponse;
      } catch {
        throw new Error(
          `Profit API returned non-JSON (${res.status}). BodyPreview=${text.slice(
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

  const profitOutcomeKpis = [
    "PF_REVENUE",
    "PF_EBITDA",
    "PF_EBITDA_MARGIN",
    "PF_CONTRIBUTION_MARGIN_PCT",
  ]
    .map((code) => byCode.get(code))
    .filter(Boolean) as RestaurantKpi[];

  const profitHealthKpis = [
    "PF_BREAK_EVEN_RATIO",
    "PF_PRIME_COST_PCT",
    "PF_NET_PROFIT",
    "PF_NET_MARGIN",
  ]
    .map((code) => byCode.get(code))
    .filter(Boolean) as RestaurantKpi[];

  const usedCodes = new Set([
    ...profitOutcomeKpis.map((k) => k.code),
    ...profitHealthKpis.map((k) => k.code),
  ]);

  const fallbackKpis = tileKpis.filter((k) => !usedCodes.has(k.code));

  while (profitOutcomeKpis.length < 4 && fallbackKpis.length) {
    profitOutcomeKpis.push(fallbackKpis.shift()!);
  }
  while (profitHealthKpis.length < 4 && fallbackKpis.length) {
    profitHealthKpis.push(fallbackKpis.shift()!);
  }

  const dayLabels = normalizeLabels(series.day);
  const revenueTrend = toNums(series.REVENUE);
  const ebitdaTrend = toNums(series.EBITDA);
  const ebitdaMarginTrend = toNums(series.EBITDA_MARGIN);
  const contributionTrend = toNums(series.CONTRIBUTION_MARGIN_PCT);
  const primeTrend = toNums(series.PRIME_COST_PCT);

  const header = (
    <SectionCard
      title="Profit Intelligence"
      subtitle="Track profitability, margin quality, and break-even health across locations."
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
            <div className="font-medium">Profit API Error</div>
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
      <SkeletonGroup title="Profit Outcomes" />
      <SkeletonGroup title="Margin Health" />
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SectionCard
        title="Profit Outcomes"
        subtitle="Top-line and EBITDA performance for the selected window."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {profitOutcomeKpis.map((k) => (
            <RestaurantKpiTile
              key={k.code}
              kpi={k}
              series={(series as any)[k.code] ?? []}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Margin Health"
        subtitle="Break-even, prime cost, and profitability quality signals."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {profitHealthKpis.map((k) => (
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

  const performanceInsights =
    !loading ? (
      <SectionCard
        title="Performance Insights"
        subtitle="What changed across profitability, margin structure, and break-even health."
      >
        {alerts.length || actions.length ? (
          <div className="space-y-3">
            {alerts.slice(0, 3).map((a) => (
              <div
                key={`insight-${a.id}`}
                className={[
                  "rounded-xl border p-3",
                  a.severity === "risk"
                    ? "border-rose-500/30 bg-rose-500/10"
                    : a.severity === "warn"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-emerald-500/30 bg-emerald-500/10",
                ].join(" ")}
              >
                <div className="text-sm font-semibold text-foreground">
                  {a.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {a.detail}
                </div>
              </div>
            ))}

            {!alerts.length && actions.length
              ? actions.slice(0, 3).map((a) => (
                <div
                  key={`insight-action-${a.id}`}
                  className="rounded-xl border border-border/60 bg-background/20 p-3"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {a.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {a.rationale}
                  </div>
                </div>
              ))
              : null}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
            No major profitability shifts detected for this selection.
          </div>
        )}
      </SectionCard>
    ) : null;

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
            <div className="text-xs text-muted-foreground">Profitability exceptions and margin risks.</div>
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
                  <Link href={`/restaurant/valora-intelligence/alerts?source=profitability${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
                    View all alerts →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No profit exceptions detected for this window.
              </div>
            )}
          </div>

          {/* Recommended Actions */}
          <div className="space-y-3 xl:border-l xl:border-border/40 xl:pl-6">
            <div className="text-sm font-semibold text-foreground">Recommended Actions</div>
            <div className="text-xs text-muted-foreground">Priority actions to improve profitability.</div>
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
                  <Link href={`/restaurant/valora-intelligence/actions?source=profitability${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
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
          title="Revenue Trend"
          labels={dayLabels}
          values={revenueTrend}
          valueFmt={(n) => fmtUsd(n)}
          tone="revenue"
        />
        <LineChart
          title="EBITDA Trend"
          labels={dayLabels}
          values={ebitdaTrend}
          valueFmt={(n) => fmtUsd(n)}
          tone="ebitda"
        />
        <LineChart
          title="EBITDA Margin % Trend"
          labels={dayLabels}
          values={ebitdaMarginTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="margin"
        />
        <LineChart
          title="Contribution Margin % Trend"
          labels={dayLabels}
          values={contributionTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="contribution"
        />
        <LineChart
          title="Prime Cost % Trend"
          labels={dayLabels}
          values={primeTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="prime"
        />
      </>
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