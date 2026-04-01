// app/restaurant/labor/page.tsx
"use client";

import * as React from "react";
import { RefreshCcw } from "lucide-react";
import { SectionCard } from "@/components/valora/SectionCard";
import { PageScaffold } from "@/components/restaurant/PageScaffold";
import { KpiGroup } from "@/components/restaurant/KpiGroup";
import { ValoraIntelligence } from "@/components/restaurant/ValoraIntelligence";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";

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

function prettifyWindowLabel(windowCode: string) {
  switch (windowCode) {
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    case "ytd":
      return "Year to Date";
    default:
      return windowCode.toUpperCase();
  }
}

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

function SkeletonTiles({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted/30" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted/20" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((__, j) => (
              <div
                key={j}
                className="h-28 animate-pulse rounded-2xl border border-border bg-muted/20"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
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

function buildLaborKpiSections(tileKpisAll: RestaurantKpi[]) {
  const byCode = new Map(tileKpisAll.map((k) => [k.code, k]));

  const preferredOrder = [
    "LABOR_COST",
    "LABOR_COST_RATIO",
    "LABOR_HOURS",
    "OVERTIME_HOURS",

    "OVERTIME_PCT",
    "SALES_PER_LABOR_HOUR",
    "REVENUE_PER_LABOR_HOUR",
    "PRODUCTIVITY_INDEX",

    "SCHEDULED_HOURS",
    "ACTUAL_HOURS",
    "LABOR_VARIANCE_HOURS",
    "HEADCOUNT",

    "AVG_HOURLY_RATE",
    "LABOR_COST_PER_ORDER",
    "LABOR_COST_PER_CUSTOMER",
    "ABSENCE_RATE",
  ];

  const selected: RestaurantKpi[] = [];
  const used = new Set<string>();

  for (const code of preferredOrder) {
    const item = byCode.get(code);
    if (item && !used.has(item.code)) {
      selected.push(item);
      used.add(item.code);
    }
  }

  for (const item of tileKpisAll) {
    if (selected.length >= 16) break;
    if (!used.has(item.code)) {
      selected.push(item);
      used.add(item.code);
    }
  }

  return [
    {
      title: "Labor Cost Control",
      items: selected.slice(0, 4),
    },
    {
      title: "Productivity & Efficiency",
      items: selected.slice(4, 8),
    },
    {
      title: "Coverage & Utilization",
      items: selected.slice(8, 12),
    },
    {
      title: "Rate & Workforce Health",
      items: selected.slice(12, 16),
    },
  ].filter((group) => group.items.length > 0);
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">
              Location
            </label>
            <select
              className="h-10 min-w-[220px] rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locationsUnique.map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">
              Window
            </label>
            <select
              className="h-10 min-w-[130px] rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              value={windowCode}
              onChange={(e) => setWindowCode(e.target.value as any)}
            >
              <option value="7d">7D</option>
              <option value="30d">30D</option>
              <option value="90d">90D</option>
              <option value="ytd">YTD</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-muted-foreground">
              Snapshot Date
            </label>
            <input
              type="date"
              value={asOf ? asOf.split("T")[0] : ""}
              onChange={(e) => setAsOf(e.target.value)}
              onKeyDown={(e) => e.preventDefault()}
              className="h-10 min-w-[180px] rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <button
            className="group flex h-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 disabled:opacity-50"
            onClick={load}
            disabled={loading}
            aria-label="Refresh labor dashboard"
          >
            <RefreshCcw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
          </button>
        </div>
        
        {!ok && data?.error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
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
    <SkeletonTiles />
  ) : tileKpis.length ? (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {kpiSections.map((section) => (
        <KpiGroup key={section.title} title={section.title}>
          ...
        </KpiGroup>
      ))}
    </div>
  ) : (
    <SectionCard
      title="No labor data yet"
      subtitle="Connect a labor source to populate workforce metrics."
    >
      <div className="text-sm text-muted-foreground">
        {data?.notes ??
          "Upload labor cost and hours data first. After that, we can expand this page with staffing adherence, overtime alerts, and productivity insights."}
      </div>
    </SectionCard>
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

  const intelligence = (
    <ValoraIntelligence
      alerts={
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
          Labor-specific alerts will flow here next, including overtime spikes,
          labor cost breaches, and staffing variance exceptions.
        </div>
      }
      actions={
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
          Labor-focused recommended actions will appear here next, such as
          staffing adjustments, overtime reduction opportunities, and
          productivity improvements.
        </div>
      }
    />
  );

  const drilldown = (
    <SectionCard
      title="Explore Workforce Intelligence"
      subtitle="Next enhancements planned for workforce analytics."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">
            Staffing Variance
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Compare scheduled hours versus actual worked hours to identify
            under- and over-staffing.
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">
            Overtime Alerts
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Highlight locations or days where overtime crosses defined control
            thresholds.
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">
            Productivity Drivers
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Explain labor productivity changes using demand, staffing mix, and
            peak-hour pressure.
          </div>
        </div>
      </div>
    </SectionCard>
  );

  return (
    <PageScaffold
      header={header}
      kpiSection={kpiSection}
      charts={charts}
      intelligence={intelligence}
      drilldown={drilldown}
    />
  );
}