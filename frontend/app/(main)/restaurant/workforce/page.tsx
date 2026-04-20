// app/restaurant/labor/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { SectionCard } from "@/components/valora/SectionCard";
import { PageScaffold } from "@/components/restaurant/PageScaffold";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";
import { DashboardFilters } from "@/components/restaurant/DashboardFilters";

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

type LocationRow = {
  location_id: string;
  location_code: string;
  name: string;
};

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

type ChartTone = "labor" | "overtime" | "productivity" | "hours";

function toneClass(tone: ChartTone) {
  switch (tone) {
    case "labor":
      return "text-sky-400";
    case "overtime":
      return "text-amber-400";
    case "productivity":
      return "text-emerald-400";
    case "hours":
      return "text-violet-400";
    default:
      return "text-foreground";
  }
}

function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}

function fmtNum1(n: number) {
  return n.toFixed(1);
}

function fmtNum0(n: number) {
  return n.toFixed(0);
}

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

function normalizeLabels(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function pickDayLabels(series: Record<string, any[]>) {
  return normalizeLabels(
    (series as any).day ?? (series as any).DAY ?? (series as any).labels
  );
}

function toNums(arr: any[]) {
  return (arr ?? []).map((x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  });
}

function toPctPoints(arr: any[]) {
  return (arr ?? []).map((x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return null;
    return n > 1 ? n : n * 100;
  });
}

function pickSeries(
  series: Record<string, number[]>,
  candidates: string[],
  pct = false
) {
  for (const key of candidates) {
    const value = (series as any)?.[key];
    if (Array.isArray(value) && value.length > 0) {
      return pct ? toPctPoints(value) : toNums(value);
    }
  }
  return [] as (number | null)[];
}

function LineChart({
  title,
  subtitle,
  labels,
  values,
  valueFmt,
  tone,
}: {
  title: string;
  subtitle?: string;
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
    dParts.push(
      `${started ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    );
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

  const gradId = `labor-grad-${title.replaceAll(" ", "-").toLowerCase()}`;

  return (
    <SectionCard
      title={title}
      subtitle={subtitle ?? null}
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
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={`h-[180px] w-full ${toneClass(tone)}`}
      >
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

function placeholderKpi(
  code: string,
  label: string,
  unit: Unit
): RestaurantKpi {
  return {
    code,
    label,
    unit,
    value: null,
    delta: null,
    severity: undefined,
  };
}

function buildLaborKpiSections(tileKpisAll: RestaurantKpi[]) {
  const byCode = new Map(tileKpisAll.map((k) => [k.code, k]));

  return [
    {
      title: "Labor Cost Control",
      items: [
        byCode.get("LABOR_COST") ??
        placeholderKpi("LABOR_COST", "LABOR COST", "usd"),
        byCode.get("LABOR_COST_RATIO") ??
        byCode.get("LABOR_PCT") ??
        placeholderKpi("LABOR_COST_RATIO", "LABOR COST %", "pct"),
        byCode.get("LABOR_HOURS") ??
        placeholderKpi("LABOR_HOURS", "LABOR HOURS", "hours"),
        byCode.get("OVERTIME_HOURS") ??
        placeholderKpi("OVERTIME_HOURS", "OVERTIME HOURS", "hours"),
      ],
    },
    {
      title: "Productivity & Efficiency",
      items: [
        byCode.get("OVERTIME_PCT") ??
        placeholderKpi("OVERTIME_PCT", "OVERTIME %", "pct"),
        byCode.get("SALES_PER_LABOR_HOUR") ??
        byCode.get("SPLH") ??
        placeholderKpi(
          "SALES_PER_LABOR_HOUR",
          "SALES PER LABOR HOUR",
          "ratio"
        ),
        byCode.get("REVENUE_PER_LABOR_HOUR") ??
        placeholderKpi(
          "REVENUE_PER_LABOR_HOUR",
          "REVENUE PER LABOR HOUR",
          "ratio"
        ),
        byCode.get("PRODUCTIVITY_INDEX") ??
        placeholderKpi("PRODUCTIVITY_INDEX", "PRODUCTIVITY INDEX", "ratio"),
      ],
    },
    {
      title: "Coverage & Utilization",
      items: [
        byCode.get("SCHEDULED_HOURS") ??
        placeholderKpi("SCHEDULED_HOURS", "SCHEDULED HOURS", "hours"),
        byCode.get("ACTUAL_HOURS") ??
        placeholderKpi("ACTUAL_HOURS", "ACTUAL HOURS", "hours"),
        byCode.get("LABOR_VARIANCE_HOURS") ??
        placeholderKpi(
          "LABOR_VARIANCE_HOURS",
          "LABOR VARIANCE HOURS",
          "hours"
        ),
        byCode.get("HEADCOUNT") ??
        placeholderKpi("HEADCOUNT", "HEADCOUNT", "count"),
      ],
    },
    {
      title: "Rate & Workforce Health",
      items: [
        byCode.get("AVG_HOURLY_RATE") ??
        placeholderKpi("AVG_HOURLY_RATE", "AVG HOURLY RATE", "usd"),
        byCode.get("LABOR_COST_PER_ORDER") ??
        placeholderKpi("LABOR_COST_PER_ORDER", "LABOR COST PER ORDER", "usd"),
        byCode.get("LABOR_COST_PER_CUSTOMER") ??
        placeholderKpi(
          "LABOR_COST_PER_CUSTOMER",
          "LABOR COST PER CUSTOMER",
          "usd"
        ),
        byCode.get("ABSENCE_RATE") ??
        placeholderKpi("ABSENCE_RATE", "ABSENCE RATE", "pct"),
      ],
    },
  ];
}

export default function LaborPage() {
  const [windowCode, setWindowCode] = React.useState<
    "7d" | "30d" | "90d" | "ytd"
  >("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("");

  const [data, setData] = React.useState<LaborResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [mlRisks, setMlRisks] = React.useState<any[]>([])
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

      const res = await fetch(`/api/restaurant/labor?${sp.toString()}`, {
        cache: "no-store",
      });
      const text = await res.text();

      let json: LaborResponse;
      try {
        json = JSON.parse(text) as LaborResponse;
      } catch {
        throw new Error(
          `Labor API returned non-JSON (${res.status}). BodyPreview=${text.slice(
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
  const series = (data?.series ?? {}) as Record<string, number[]>;
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

  const kpiSections = React.useMemo(
    () => buildLaborKpiSections(tileKpis),
    [tileKpis]
  );
  const kpiSectionsByTitle = React.useMemo(
    () => new Map(kpiSections.map((section) => [section.title, section.items])),
    [kpiSections]
  );

  const dayLabels = pickDayLabels(series);
  const laborPctTrend = pickSeries(
    series,
    ["LABOR_PCT", "LABOR_COST_RATIO", "LABOR_RATIO"],
    true
  );
  const overtimePctTrend = pickSeries(series, ["OVERTIME_PCT"], true);
  const productivityTrend = pickSeries(
    series,
    ["SALES_PER_LABOR_HOUR", "REVENUE_PER_LABOR_HOUR", "SPLH"],
    false
  );
  const laborHoursTrend = pickSeries(
    series,
    ["LABOR_HOURS", "ACTUAL_HOURS"],
    false
  );

  const hasAnyCharts =
    laborPctTrend.length > 0 ||
    overtimePctTrend.length > 0 ||
    productivityTrend.length > 0 ||
    laborHoursTrend.length > 0;

  const header = (
    <SectionCard
      title="Workforce Performance"
      subtitle="Track labor cost, overtime pressure, staffing utilization, and workforce productivity."
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
            <div className="font-medium">Labor API Error</div>
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
      <SkeletonGroup title="Labor Cost Control" />
      <SkeletonGroup title="Productivity & Efficiency" />
      <SkeletonGroup title="Coverage & Utilization" />
      <SkeletonGroup title="Rate & Workforce Health" />
    </div>
  ) : (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          {
            title: "Labor Cost Control",
            subtitle: "Core labor spend, rate pressure, and overtime load for the selected window.",
          },
          {
            title: "Productivity & Efficiency",
            subtitle: "Output per labor hour and overtime efficiency signals that affect margin.",
          },
          {
            title: "Coverage & Utilization",
            subtitle: "Scheduled versus actual deployment and staffing coverage posture.",
          },
          {
            title: "Rate & Workforce Health",
            subtitle: "Compensation pressure and workforce reliability indicators.",
          },
        ].map((section) => (
          <SectionCard
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(kpiSectionsByTitle.get(section.title) ?? []).map((k) => (
                <RestaurantKpiTile
                  key={k.code}
                  kpi={k}
                  series={(series as any)[k.code] ?? []}
                locationId={locationId !== "all" ? locationId : null}
                  day={asOf ? asOf.slice(0, 10) : null} source="workforce"
                />
              ))}
            </div>
          </SectionCard>
        ))}
      </div>

      {!tileKpis.length ? (
        <SectionCard
          title="No labor data yet"
          subtitle="Connect a labor source to populate workforce metrics."
        >
          <div className="text-sm text-muted-foreground">
            {data?.notes ??
              "Upload labor cost and hours data first. After that, we can expand this page with staffing adherence, overtime alerts, and productivity insights."}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );

  const charts = !loading && hasAnyCharts ? (
    <>
      {laborPctTrend.length > 0 ? (
        <LineChart
          title="Labor Cost Rate Trend"
          subtitle="Labor cost as a share of sales over time."
          labels={dayLabels}
          values={laborPctTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="labor"
        />
      ) : null}

      {overtimePctTrend.length > 0 ? (
        <LineChart
          title="Overtime Rate Trend"
          subtitle="Track overtime pressure and schedule strain."
          labels={dayLabels}
          values={overtimePctTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="overtime"
        />
      ) : null}

      {productivityTrend.length > 0 ? (
        <LineChart
          title="Sales per Labor Hour Trend"
          subtitle="Productivity generated from deployed labor hours."
          labels={dayLabels}
          values={productivityTrend}
          valueFmt={(n) => fmtNum1(n)}
          tone="productivity"
        />
      ) : null}

      {laborHoursTrend.length > 0 ? (
        <LineChart
          title="Labor Hours Trend"
          subtitle="Total labor hours deployed across the selected window."
          labels={dayLabels}
          values={laborHoursTrend}
          valueFmt={(n) => fmtNum0(n)}
          tone="hours"
        />
      ) : null}
    </>
  ) : null;

  const intelligence =
    !loading ? (
      <SectionCard
        title="Valora Intelligence"
        subtitle="What needs attention and what actions to take."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Attention Required</div>
            <div className="text-xs text-muted-foreground">Labor cost exceptions, overtime pressure, and staffing risks.</div>
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
                  <Link href={`/restaurant/valora-intelligence/alerts?source=workforce${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
                    View all alerts →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No labor issues detected for this window.
              </div>
            )}
          </div>
          <div className="space-y-3 xl:border-l xl:border-border/40 xl:pl-6">
            <div className="text-sm font-semibold text-foreground">Recommended Actions</div>
            <div className="text-xs text-muted-foreground">AI-driven steps to improve labor efficiency.</div>
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
                  <Link href={`/restaurant/valora-intelligence/actions?source=workforce${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
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

  const performanceInsights =
    !loading ? (
      <SectionCard
        title="Performance Insights"
        subtitle="What changed across labor cost, overtime, and workforce productivity."
      >
        {(() => {
          const insights = [];
          const kpis = data?.kpis ?? [];
          const laborRatio = kpis.find((k: any) => k.code === "LABOR_LABOR_RATIO" || k.code === "LABOR_PCT");
          const overtime = kpis.find((k: any) => k.code === "LABOR_OVERTIME_PCT");
          if (laborRatio && Number(laborRatio.value) > 0.32) {
            insights.push({ title: "Labor cost above target", message: `Labor ratio of ${(Number(laborRatio.value) * 100).toFixed(1)}% exceeds the 30% benchmark. Review scheduling and overtime.`, severity: "warn" });
          }
          if (overtime && Number(overtime.value) > 0.15) {
            insights.push({ title: "Overtime pressure detected", message: `Overtime rate of ${(Number(overtime.value) * 100).toFixed(1)}% is elevated. Consider schedule rebalancing.`, severity: "warn" });
          }
          if (insights.length === 0) {
            insights.push({ title: "Workforce running efficiently", message: "Labor cost and overtime are within healthy ranges for this period.", severity: "good" });
          }
          return (
            <div className="space-y-3">
              {insights.map((item: any, i: number) => (
                <div key={i} className={`rounded-xl border p-3 ${item.severity === "risk" ? "border-red-500/30 bg-red-500/10" : item.severity === "warn" ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                  <div className="text-sm font-semibold text-foreground">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.message}</div>
                </div>
              ))}
            </div>
          );
        })()}
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
