// app/restaurant/inventory/page.tsx
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

type InventoryResponse = {
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

type ChartTone = "dioh" | "waste" | "stockout" | "variance";

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

function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}

function fmtNum1(n: number) {
  return n.toFixed(1);
}

function fmtNum0(n: number) {
  return n.toFixed(0);
}

function fmtUsd0(n: number) {
  return `$${n.toFixed(0)}`;
}

function toneClass(tone: ChartTone) {
  switch (tone) {
    case "dioh":
      return "text-violet-400";
    case "waste":
      return "text-rose-400";
    case "stockout":
      return "text-amber-400";
    case "variance":
      return "text-sky-400";
    default:
      return "text-foreground";
  }
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

  const gradId = `inventory-grad-${title.replaceAll(" ", "-").toLowerCase()}`;

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

function buildInventoryKpiSections(tileKpisAll: RestaurantKpi[]) {
  const byCode = new Map(tileKpisAll.map((k) => [k.code, k]));

  const preferredOrder = [
    "DIOH",
    "INVENTORY_TURNS",
    "AVG_INVENTORY",
    "ENDING_INVENTORY",

    "WASTE_AMOUNT",
    "WASTE_PCT",
    "SHRINKAGE_AMOUNT",
    "VARIANCE_PCT",

    "STOCKOUT_COUNT",
    "LOW_STOCK_COUNT",
    "PURCHASES",
    "COGS",

    "INVENTORY_TO_SALES_RATIO",
    "DEPLETION_RATE",
    "REORDER_BREACH_COUNT",
    "EXCESS_STOCK_VALUE",
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
      title: "Inventory Position",
      items: selected.slice(0, 4),
    },
    {
      title: "Waste & Variance Control",
      items: selected.slice(4, 8),
    },
    {
      title: "Availability & Replenishment",
      items: selected.slice(8, 12),
    },
    {
      title: "Stock Efficiency",
      items: selected.slice(12, 16),
    },
  ].filter((group) => group.items.length > 0);
}

export default function InventoryPage() {
  const [windowCode, setWindowCode] = React.useState<
    "7d" | "30d" | "90d" | "ytd"
  >("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("");

  const [data, setData] = React.useState<InventoryResponse | null>(null);
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

      const res = await fetch(`/api/restaurant/inventory?${sp.toString()}`, {
        cache: "no-store",
      });
      const text = await res.text();

      let json: InventoryResponse;
      try {
        json = JSON.parse(text) as InventoryResponse;
      } catch {
        throw new Error(
          `Inventory API returned non-JSON (${res.status}). BodyPreview=${text.slice(
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
    () => buildInventoryKpiSections(tileKpis),
    [tileKpis]
  );

  const dayLabels = pickDayLabels(series);
  const diohTrend = pickSeries(
    series,
    ["DIOH", "DAYS_INVENTORY_ON_HAND"],
    false
  );
  const wastePctTrend = pickSeries(
    series,
    ["WASTE_PCT"],
    true
  );
  const stockoutTrend = pickSeries(
    series,
    ["STOCKOUT_COUNT", "LOW_STOCK_COUNT"],
    false
  );
  const varianceTrend = pickSeries(
    series,
    ["VARIANCE_PCT", "SHRINKAGE_PCT"],
    true
  );

  const hasAnyCharts =
    diohTrend.length > 0 ||
    wastePctTrend.length > 0 ||
    stockoutTrend.length > 0 ||
    varianceTrend.length > 0;

  const header = (
    <SectionCard
      title="Inventory Health"
      subtitle="Monitor stock position, waste, replenishment risk, and inventory efficiency across locations."
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
            aria-label="Refresh inventory dashboard"
          >
            <RefreshCcw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
          </button>
        </div>

        {!ok && data?.error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
            <div className="font-medium">Inventory API Error</div>
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
          {section.items.map((k) => (
            <RestaurantKpiTile
              key={k.code}
              kpi={k}
              series={(series as any)[k.code]}
            />
          ))}
        </KpiGroup>
      ))}
    </div>
  ) : (
    <SectionCard
      title="No inventory data yet"
      subtitle="Connect an inventory source to populate inventory metrics."
    >
      <div className="text-sm text-muted-foreground">
        {data?.notes ??
          "Upload daily inventory snapshot, purchases, waste, and variance data first. Then we can expand this page with item-level depletion, stockout prediction, and replenishment intelligence."}
      </div>
    </SectionCard>
  );

  const charts = !loading && hasAnyCharts ? (
    <>
      {diohTrend.length > 0 ? (
        <LineChart
          title="Days Inventory on Hand Trend"
          subtitle="Monitor how long current stock can support demand."
          labels={dayLabels}
          values={diohTrend}
          valueFmt={(n) => `${fmtNum1(n)}d`}
          tone="dioh"
        />
      ) : null}

      {wastePctTrend.length > 0 ? (
        <LineChart
          title="Waste Rate Trend"
          subtitle="Track inventory loss through spoilage, overproduction, or handling issues."
          labels={dayLabels}
          values={wastePctTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="waste"
        />
      ) : null}

      {stockoutTrend.length > 0 ? (
        <LineChart
          title="Stockout Risk Trend"
          subtitle="Follow inventory availability pressure and stockout signals."
          labels={dayLabels}
          values={stockoutTrend}
          valueFmt={(n) => fmtNum0(n)}
          tone="stockout"
        />
      ) : null}

      {varianceTrend.length > 0 ? (
        <LineChart
          title="Inventory Variance Trend"
          subtitle="Compare expected versus actual stock movement and count accuracy."
          labels={dayLabels}
          values={varianceTrend}
          valueFmt={(n) => fmtPct2(n)}
          tone="variance"
        />
      ) : null}
    </>
  ) : null;

  const intelligence = (
    <ValoraIntelligence
      alerts={
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
          Inventory alerts will flow here next, including stockout risk, waste spikes, variance breaches, and excess inventory issues.
        </div>
      }
      actions={
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
          Inventory recommended actions will appear here next, such as reorder prioritization, waste reduction steps, stock balancing, and replenishment timing improvements.
        </div>
      }
    />
  );

  const drilldown = (
    <SectionCard
      title="Explore Inventory Intelligence"
      subtitle="Next enhancements planned for stock and replenishment analytics."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">
            DIOH Monitoring
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Track days inventory on hand against targets to avoid overstocking or shortages.
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">
            Waste Reduction
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Identify rising waste patterns and the categories driving avoidable loss.
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">
            Stockout Prevention
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Surface low-on-hand items and upcoming replenishment risks before service is affected.
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