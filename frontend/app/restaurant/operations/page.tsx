// app/restaurant/operations/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { SectionCard } from "@/components/valora/SectionCard";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";
import {
  OpsDriversPanel,
  type OpsDriver,
} from "@/components/restaurant/OpsDriversPanel";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { RefreshCcw } from "lucide-react";

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count" | "hours";

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
  id?: string;
  alert_id?: string;
  severity: Severity;
  title: string;
  detail?: string;
  rationale?: string;
  kpi_code?: string;
};

type ApiAction = {
  id?: string;
  action_id?: string;
  priority: 1 | 2 | 3;
  title: string;
  rationale: string;
  owner?: string;
};

type OpsResponse = {
  ok: boolean;
  as_of: string | null;
  refreshed_at: string;
  window: "7d" | "30d" | "90d" | "ytd" | string;
  location: { id: string; name: string };
  kpis: ApiKpi[];
  series: Record<string, any[]>;
  alerts: ApiAlert[];
  actions: ApiAction[];
  error?: string;
};

type ChartTone = "neutral" | "labor" | "overtime" | "dioh" | "waste";

type KpiSection = {
  title: string;
  subtitle: string;
  items: RestaurantKpi[];
};

function toneClass(tone: ChartTone) {
  switch (tone) {
    case "labor":
      return "text-sky-400";
    case "overtime":
      return "text-amber-400";
    case "dioh":
      return "text-violet-400";
    case "waste":
      return "text-rose-400";
    default:
      return "text-foreground";
  }
}

function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}

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

function SkeletonTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-4"
        >
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

function LineChart({
  title,
  subtitle,
  labels,
  values,
  valueFmt,
  tone = "neutral",
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  values: (number | null)[];
  valueFmt?: (n: number) => string;
  tone?: ChartTone;
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

  const toneCls = toneClass(tone);
  const gradId = `grad-${title.replaceAll(" ", "-").toLowerCase()}`;

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

async function safeJson(res: Response, label: string) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${label} returned non-JSON (${res.status}). BodyPreview=${text.slice(
        0,
        180
      )}`
    );
  }
}

function normalizeLabels(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function pickDayLabels(series: Record<string, any[]>) {
  return normalizeLabels(
    (series as any)["day"] ??
    (series as any)["DAY"] ??
    (series as any)["labels"]
  );
}

function toPctPoints(arr: any[]) {
  return (arr ?? []).map((x) => {
    const n = Number(x);
    if (!Number.isFinite(n)) return null;
    return n > 1 ? n : n * 100;
  });
}

function toNums(arr: any[]) {
  return (arr ?? []).map((x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  });
}

function normalizeOpsResponse(j: OpsResponse): OpsResponse {
  const alerts = (j.alerts ?? []).map((a: any, i: number) => ({
    ...a,
    id: String(a.id ?? a.alert_id ?? `${a.kpi_code ?? "alert"}-${i}`),
    detail: String(a.detail ?? a.rationale ?? ""),
  }));

  const actions = (j.actions ?? []).map((a: any, i: number) => ({
    ...a,
    id: String(a.id ?? a.action_id ?? `${a.title ?? "action"}-${i}`),
  }));

  return { ...j, alerts, actions };
}

function buildKpiSections(tileKpisAll: RestaurantKpi[]) {
  const byCode = new Map(tileKpisAll.map((k) => [k.code, k]));

  const preferredOrder = [
    "OPS_ORDERS",
    "OPS_CUSTOMERS",
    "OPS_AOV",
    "OPS_REVENUE_PER_CUSTOMER",

    "OPS_LABOR_RATIO",
    "OPS_LABOR_HOURS",
    "OPS_SALES_PER_LABOR_HOUR",
    "OPS_OVERTIME_PCT",

    "OPS_DIH",
    "OPS_INV_TURNS",
    "OPS_AVG_INVENTORY",
    "OPS_WASTE_PCT",

    "OPS_AVG_DAILY_REVENUE",
    "OPS_GROSS_MARGIN",
    "OPS_FOOD_COST_RATIO",
    "OPS_PRIME_COST_RATIO",
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

  const groups = [
    {
      title: "Demand & Order Value",
      subtitle: "Throughput, customer activity, and spend quality.",
      items: selected.slice(0, 4),
    },
    {
      title: "Labor Efficiency",
      subtitle: "Staffing productivity and labor cost pressure.",
      items: selected.slice(4, 8),
    },
    {
      title: "Inventory Health",
      subtitle: "Stock position, turns, waste, and inventory drag.",
      items: selected.slice(8, 12),
    },
    {
      title: "Margin & Control",
      subtitle: "Revenue quality and operating discipline signals.",
      items: selected.slice(12, 16),
    },
  ].filter((group) => group.items.length > 0);

  return groups as KpiSection[];
}

export default function OpsDashboardPage() {
  const [windowCode, setWindowCode] = React.useState<
    "7d" | "30d" | "90d" | "ytd"
  >("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("");

  const [data, setData] = React.useState<OpsResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [locations, setLocations] = React.useState<LocationRow[]>([]);

  const [laborDrivers, setLaborDrivers] = React.useState<OpsDriver[]>([]);
  const [invDrivers, setInvDrivers] = React.useState<OpsDriver[]>([]);
  const [driversLoading, setDriversLoading] = React.useState<boolean>(true);

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

  const locLabel =
    locationId === "all"
      ? "All Locations"
      : (() => {
        const l = locations.find((x) => x.location_id === locationId);
        return l ? l.name : "Location";
      })();

  const load = React.useCallback(async () => {
    setLoading(true);
    setDriversLoading(true);

    const sp = new URLSearchParams();
    sp.set("window", windowCode);
    if (asOf.trim()) sp.set("as_of", asOf.trim());
    if (locationId !== "all") sp.set("location_id", locationId);

    try {
      const [opsRes, ldRes, idRes] = await Promise.all([
        fetch(`/api/restaurant/ops?${sp.toString()}`, { cache: "no-store" }),
        fetch(`/api/restaurant/labor/drivers?${sp.toString()}`, {
          cache: "no-store",
        }),
        fetch(`/api/restaurant/inventory/drivers?${sp.toString()}`, {
          cache: "no-store",
        }),
      ]);

      const opsJsonRaw = (await safeJson(opsRes, "Ops API")) as OpsResponse;
      const opsJson = normalizeOpsResponse(opsJsonRaw);
      setData(opsJson);

      try {
        const ld = await safeJson(ldRes, "Labor Drivers API");
        setLaborDrivers(
          Array.isArray(ld?.drivers) ? (ld.drivers as OpsDriver[]) : []
        );
      } catch {
        setLaborDrivers([]);
      }

      try {
        const id = await safeJson(idRes, "Inventory Drivers API");
        setInvDrivers(
          Array.isArray(id?.drivers) ? (id.drivers as OpsDriver[]) : []
        );
      } catch {
        setInvDrivers([]);
      }
    } catch (e: any) {
      setData({
        ok: false,
        as_of: null,
        refreshed_at: new Date().toISOString(),
        window: windowCode,
        location: { id: "all", name: "All Locations" },
        kpis: [],
        series: {},
        alerts: [],
        actions: [],
        error: e?.message ?? String(e),
      });
      setLaborDrivers([]);
      setInvDrivers([]);
    } finally {
      setLoading(false);
      setDriversLoading(false);
    }
  }, [windowCode, locationId, asOf]);

  React.useEffect(() => {
    load();
  }, [load]);

  const ok = Boolean(data?.ok);
  const kpis = data?.kpis ?? [];
  const series = (data?.series ?? {}) as Record<string, any[]>;
  const alerts = data?.alerts ?? [];
  const actions = data?.actions ?? [];

  const tileKpisAll: RestaurantKpi[] = React.useMemo(() => {
    return (kpis ?? []).map((k) => {
      const v =
        k.unit === "pct" &&
          typeof k.value === "number" &&
          k.value > 1
          ? k.value / 100
          : k.value;
      return { ...(k as any), value: v } as RestaurantKpi;
    });
  }, [kpis]);

  const kpiSeriesKey: Record<string, string> = {
    OPS_ORDERS: "ORDERS",
    OPS_CUSTOMERS: "CUSTOMERS",
    OPS_AOV: "AVERAGE ORDER VALUE",
    OPS_REVENUE_PER_CUSTOMER: "REVENUE_PER_CUSTOMER",
    OPS_AVG_DAILY_REVENUE: "REVENUE",
    OPS_LABOR_RATIO: "LABOR_PCT",
    OPS_LABOR_HOURS: "LABOR_HOURS",
    OPS_SALES_PER_LABOR_HOUR: "SALES_PER_LABOR_HOUR",
    OPS_OVERTIME_PCT: "OVERTIME_PCT",
    OPS_DIH: "DIOH",
    OPS_INV_TURNS: "INV_TURNS",
    OPS_AVG_INVENTORY: "AVG_INVENTORY",
    OPS_WASTE_PCT: "WASTE_PCT",
    OPS_GROSS_MARGIN: "GROSS_MARGIN",
    OPS_FOOD_COST_RATIO: "FOOD_COST_PCT",
    OPS_PRIME_COST_RATIO: "PRIME_COST_PCT",
  };

  const kpiSections = React.useMemo(
    () => buildKpiSections(tileKpisAll),
    [tileKpisAll]
  );

  const asOfStr = data?.as_of
    ? new Date(data.as_of).toLocaleString()
    : "Latest available snapshot";
  const dayLabels = pickDayLabels(series);

  const laborPctTrend = toPctPoints((series as any)["LABOR_PCT"] ?? []);
  const overtimeTrend = toPctPoints((series as any)["OVERTIME_PCT"] ?? []);
  const diohTrend = toNums((series as any)["DIOH"] ?? []);
  const wasteTrend = toPctPoints((series as any)["WASTE_PCT"] ?? []);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Operations Intelligence Center"
        subtitle="Track labor, inventory, alerts, and recommended actions across your operating footprint."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              {/* <label className="mb-1 text-xs font-medium text-muted-foreground">
                Location
              </label> */}
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
              {/* <label className="mb-1 text-xs font-medium text-muted-foreground">
                Window
              </label> */}
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
              {/* <label className="mb-1 text-xs font-medium text-muted-foreground">
                Snapshot Date
              </label> */}
              <input
                type="date"
                value={asOf ? asOf.split("T")[0] : ""}
                onChange={(e) => {
                  setAsOf(e.target.value);
                }}
                onKeyDown={(e) => e.preventDefault()}
                className="h-10 min-w-[180px] rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            <button
              className="group flex h-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 disabled:opacity-50"
              onClick={load}
              disabled={loading}
              aria-label="Refresh operations dashboard"
            >
              <RefreshCcw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
            </button>
          </div>

          {!ok && data?.error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
              <div className="font-medium">Operations API Error</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {data.error}
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {loading ? (
        <SkeletonTiles />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {kpiSections.map((section) => (
            <SectionCard
              key={section.title}
              title={section.title}
              subtitle={section.subtitle}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {section.items.map((k) => (
                  <RestaurantKpiTile
                    key={k.code}
                    kpi={k}
                    series={(series as any)[kpiSeriesKey[k.code] ?? k.code]}
                  />
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {!loading ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <LineChart
            title="Labor Cost Rate Trend"
            subtitle="Monitor labor cost pressure over time."
            labels={dayLabels}
            values={laborPctTrend}
            valueFmt={(n) => fmtPct2(n)}
            tone="labor"
          />
          <LineChart
            title="Overtime Rate Trend"
            subtitle="Track overtime dependence and scheduling strain."
            labels={dayLabels}
            values={overtimeTrend}
            valueFmt={(n) => fmtPct2(n)}
            tone="overtime"
          />
          <LineChart
            title="Days Inventory on Hand Trend"
            subtitle="Follow inventory holding pressure and stock depth."
            labels={dayLabels}
            values={diohTrend}
            valueFmt={(n) => `${n.toFixed(1)} days`}
            tone="dioh"
          />
          <LineChart
            title="Waste Rate Trend"
            subtitle="Measure waste leakage across the selected period."
            labels={dayLabels}
            values={wasteTrend}
            valueFmt={(n) => fmtPct2(n)}
            tone="waste"
          />
        </div>
      ) : null}

      {!loading ? (
        <SectionCard
          title="Performance Insights"
          subtitle="Key labor and inventory drivers shaping current operations performance."
        >
          <OpsDriversPanel
            laborDrivers={laborDrivers}
            inventoryDrivers={invDrivers}
            loading={driversLoading}
          />
        </SectionCard>
      ) : null}

      {!loading ? (
        <SectionCard
          title="Valora Intelligence"
          subtitle="Priority issues and operator-ready actions based on current labor and inventory signals."
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Attention Required
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Prioritized issues detected from current labor and inventory signals.
                  </div>
                </div>

                <Link
                  href="/restaurant/insights/alerts"
                  className="text-xs font-semibold text-foreground hover:underline"
                >
                  View all alerts →
                </Link>
              </div>

              {alerts.length ? (
                <div className="space-y-2">
                  {alerts.slice(0, 8).map((a) => (
                    <div
                      key={a.id!}
                      className="rounded-xl border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {a.title}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {a.detail ?? ""}
                          </div>
                        </div>
                        <SeverityBadge severity={a.severity} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No issues need immediate attention for this window.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3">
                <div className="text-sm font-semibold text-foreground">
                  Recommended Actions
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Operator-ready next steps based on the strongest current signals.
                </div>
              </div>

              {actions.length ? (
                <div className="space-y-2">
                  {actions.slice(0, 3).map((a) => (
                    <div
                      key={a.id!}
                      className={`rounded-xl border p-3 ${a.priority === 1
                        ? "border-red-500/25 bg-red-500/8"
                        : a.priority === 2
                          ? "border-amber-500/25 bg-amber-500/8"
                          : "border-border bg-background/40"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-background text-xs">
                              {a.priority}
                            </span>
                            {a.title}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {a.rationale}
                          </div>
                        </div>
                        {a.owner ? (
                          <span className="shrink-0 rounded-xl border border-border/30 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground">
                            {a.owner}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No recommended actions are available for this window.
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* {!loading ? (
        <SectionCard
          title="Explore Operations Modules"
          subtitle="Open the detailed workflows behind today’s strongest operational signals."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Link
              href="/restaurant/labor"
              className="rounded-2xl border border-border/60 bg-background/25 p-4 transition hover:bg-background/50"
            >
              <div className="text-sm font-semibold text-foreground">
                Labor
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Review labor %, hours, overtime, and productivity trends.
              </div>
            </Link>

            <Link
              href="/restaurant/inventory"
              className="rounded-2xl border border-border/60 bg-background/25 p-4 transition hover:bg-background/50"
            >
              <div className="text-sm font-semibold text-foreground">
                Inventory
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Analyze DIOH, turns, stock pressure, and waste performance.
              </div>
            </Link>

            <Link
              href="/restaurant/insights/alerts"
              className="rounded-2xl border border-border/60 bg-background/25 p-4 transition hover:bg-background/50"
            >
              <div className="text-sm font-semibold text-foreground">
                Alerts
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Investigate critical exceptions and action-oriented follow-ups.
              </div>
            </Link>
          </div>
        </SectionCard>
      ) : null} */}
    </div>
  );
}