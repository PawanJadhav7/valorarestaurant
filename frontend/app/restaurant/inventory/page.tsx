// app/restaurant/inventory/page.tsx
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

function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}

function fmtNum1(n: number) {
  return n.toFixed(1);
}

function fmtNum0(n: number) {
  return n.toFixed(0);
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

function buildInventoryKpiSections(tileKpisAll: RestaurantKpi[]) {
  const byCode = new Map(tileKpisAll.map((k) => [k.code, k]));

  return [
    {
      title: "Inventory Position",
      items: [
        byCode.get("AVG_INVENTORY") ??
          placeholderKpi("AVG_INVENTORY", "AVG INVENTORY VALUE", "usd"),
        byCode.get("DIOH") ??
          byCode.get("DAYS_INVENTORY_ON_HAND") ??
          placeholderKpi("DIOH", "DAYS INVENTORY ON HAND", "days"),
        byCode.get("INVENTORY_TURNS") ??
          placeholderKpi("INVENTORY_TURNS", "INVENTORY TURNS", "ratio"),
        byCode.get("ENDING_INVENTORY") ??
          placeholderKpi("ENDING_INVENTORY", "ENDING INVENTORY", "usd"),
      ],
    },
    {
      title: "Waste & Variance Control",
      items: [
        byCode.get("WASTE_AMOUNT") ??
          placeholderKpi("WASTE_AMOUNT", "WASTE AMOUNT", "usd"),
        byCode.get("WASTE_PCT") ??
          placeholderKpi("WASTE_PCT", "WASTE %", "pct"),
        byCode.get("SHRINKAGE_AMOUNT") ??
          placeholderKpi("SHRINKAGE_AMOUNT", "SHRINKAGE AMOUNT", "usd"),
        byCode.get("VARIANCE_PCT") ??
          placeholderKpi("VARIANCE_PCT", "VARIANCE %", "pct"),
      ],
    },
    {
      title: "Availability & Replenishment",
      items: [
        byCode.get("STOCKOUT_COUNT") ??
          placeholderKpi("STOCKOUT_COUNT", "STOCKOUT COUNT", "count"),
        byCode.get("LOW_STOCK_COUNT") ??
          placeholderKpi("LOW_STOCK_COUNT", "LOW STOCK COUNT", "count"),
        byCode.get("PURCHASES") ??
          placeholderKpi("PURCHASES", "PURCHASES", "usd"),
        byCode.get("COGS") ?? placeholderKpi("COGS", "COGS", "usd"),
      ],
    },
    {
      title: "Stock Efficiency",
      items: [
        byCode.get("INVENTORY_TO_SALES_RATIO") ??
          placeholderKpi(
            "INVENTORY_TO_SALES_RATIO",
            "INVENTORY TO SALES RATIO",
            "ratio"
          ),
        byCode.get("DEPLETION_RATE") ??
          placeholderKpi("DEPLETION_RATE", "DEPLETION RATE", "pct"),
        byCode.get("REORDER_BREACH_COUNT") ??
          placeholderKpi(
            "REORDER_BREACH_COUNT",
            "REORDER BREACH COUNT",
            "count"
          ),
        byCode.get("EXCESS_STOCK_VALUE") ??
          placeholderKpi("EXCESS_STOCK_VALUE", "EXCESS STOCK VALUE", "usd"),
      ],
    },
  ];
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
    () => buildInventoryKpiSections(tileKpis),
    [tileKpis]
  );
  const kpiSectionsByTitle = React.useMemo(
    () => new Map(kpiSections.map((section) => [section.title, section.items])),
    [kpiSections]
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <SkeletonGroup title="Inventory Position" />
      <SkeletonGroup title="Waste & Variance Control" />
      <SkeletonGroup title="Availability & Replenishment" />
      <SkeletonGroup title="Stock Efficiency" />
    </div>
  ) : tileKpis.length ? (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[
        {
          title: "Inventory Position",
          subtitle: "Core stock posture, turns, and on-hand value for the selected window.",
        },
        {
          title: "Waste & Variance Control",
          subtitle: "Loss, shrinkage, and count accuracy signals that need intervention.",
        },
        {
          title: "Availability & Replenishment",
          subtitle: "Stockout pressure and replenishment readiness across locations.",
        },
        {
          title: "Stock Efficiency",
          subtitle: "How effectively inventory is converting into sales and throughput.",
        },
      ].map((section) => {
        const items = kpiSectionsByTitle.get(section.title) ?? [];
        if (!items.length) return null;

        return (
          <SectionCard
            key={section.title}
            title={section.title}
            subtitle={section.subtitle}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((k) => (
                <RestaurantKpiTile
                  key={k.code}
                  kpi={k}
                  series={(series as any)[k.code] ?? []}
                  locationId={locationId !== "all" ? locationId : null}
                  day={asOf ? asOf.slice(0, 10) : null}
                />
              ))}
            </div>
          </SectionCard>
        );
      })}
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

  const performanceInsights =
    !loading ? (
      <SectionCard
        title="Performance Insights"
        subtitle="What changed across inventory health, waste pressure, and replenishment risk."
      >
        {mlRisks.length || mlBriefs.length ? (
          <div className="space-y-3">
            {mlRisks.slice(0, 3).map((a: any, i: number) => (
              <div
                key={`inventory-insight-risk-${i}`}
                className={[
                  "rounded-xl border p-3",
                  a.severity_band === "critical"
                    ? "border-rose-500/30 bg-rose-500/10"
                    : "border-amber-500/30 bg-amber-500/10",
                ].join(" ")}
              >
                <div className="text-sm font-semibold text-foreground">
                  {a.location_name}
                  {a.risk_type
                    ? ` - ${String(a.risk_type)
                      .split("_")
                      .map((word: string) =>
                        word ? word[0].toUpperCase() + word.slice(1) : word
                      )
                      .join(" ")}`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Impact: ${Number(a.impact_estimate ?? 0).toFixed(0)} ·
                  Severity: {a.severity_band}
                </div>
              </div>
            ))}

            {!mlRisks.length && mlBriefs.length
              ? mlBriefs.slice(0, 3).map((b: any, i: number) => (
                <div
                  key={`inventory-insight-brief-${i}`}
                  className="rounded-xl border border-border/60 bg-background/20 p-3"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {b.headline}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {b.summary_text}
                  </div>
                </div>
              ))
              : null}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
            No major inventory shifts detected for this selection.
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
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Attention Required</div>
            <div className="text-xs text-muted-foreground">Inventory exceptions, stock pressure, and waste issues.</div>
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
                  <Link href={`/restaurant/valora-intelligence/alerts?source=inventory${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
                    View all alerts →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No inventory issues detected for this window.
              </div>
            )}
          </div>
          <div className="space-y-3 xl:border-l xl:border-border/40 xl:pl-6">
            <div className="text-sm font-semibold text-foreground">Recommended Actions</div>
            <div className="text-xs text-muted-foreground">Steps to improve inventory health and reduce leakage.</div>
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
                  <Link href={`/restaurant/valora-intelligence/actions?source=inventory${locationId !== "all" ? `&location_id=${encodeURIComponent(locationId)}` : ""}&day=${encodeURIComponent(asOf ?? "")}`} className="rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold hover:bg-background/50">
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
