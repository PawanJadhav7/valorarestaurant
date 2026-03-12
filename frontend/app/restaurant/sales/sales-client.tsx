// app/restaurant/sales/sales-client.tsx
"use client";

import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
import { RestaurantKpiTile, type Kpi as RestaurantKpi } from "@/components/restaurant/KpiTile";
import { useRefreshState } from "@/components/restaurant/useRefreshState";
import { RefreshCcw } from "lucide-react";


/** ---------- Types ---------- */
type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

type TopItem = {
  item_name: string;
  quantity: string;      // API returns string
  revenue: string;       // API returns string
  share_pct: string;     // API returns string
};

type CategoryMix = {
  category: string;
  revenue: string;
  share_pct: string;
};

type ChannelMix = {
  order_channel: string;
  revenue: string;
  share_pct: string;
};


type SalesSeries = {
  day: string[];
  revenue: number[];
  orders: number[];
  aov: (number | null)[];
  gross_margin_pct: (number | null)[];
  discount_rate_pct: (number | null)[];
};

type SalesResponse = {
  ok: boolean;
  as_of: string | null;
  refreshed_at: string;
  window: "7d" | "30d" | "90d" | "ytd" | string;
  location: { id: string; name: string };
  kpis: Kpi[];
  series: SalesSeries;
  top_items?: TopItem[];
  category_mix?: CategoryMix[];
  channel_mix?: ChannelMix[];
  error?: string;
};

type LocationRow = { location_id: string; location_code: string; name: string };

type AovBucket = {
  bucket_from: number;
  bucket_to: number;
  orders: number;
  share_pct: number;
};

/** ---------- Formatting helpers ---------- */

function formatAsOf(ts?: string | null) {
  if (!ts) return "—";

  const d = new Date(ts);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d).replace(",", " •");
}

function fmtUsd0(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtUsd2(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
function fmtPct2(n: number) {
  return `${n.toFixed(2)}%`;
}
function fmtDelta(delta: number | null | undefined, unit: Unit) {
  if (delta === null || delta === undefined) return "—";
  const sign = delta > 0 ? "+" : "";
  if (unit === "pct") return `${sign}${delta.toFixed(2)} pp`;
  return `${sign}${delta.toFixed(2)}%`;
}

/** ---------- KPI severity rules (UI-side) ---------- */
function computeSeverity(k: Pick<Kpi, "code" | "delta" | "severity">): Severity {
  const d = k.delta ?? 0;

  switch (k.code) {
    case "SALES_REVENUE":
    case "SALES_ORDERS":
      if (d <= -10) return "risk";
      if (d < 0) return "warn";
      return "good";

    case "SALES_GROSS_MARGIN":
      if (d < -3) return "risk";
      if (d < 0) return "warn";
      return "good";

    case "SALES_DISCOUNT_RATE":
      if (d > 5) return "risk";
      if (d > 2) return "warn";
      return "good";

    case "SALES_AOV":
      if (d < -5) return "warn";
      return "good";

    default:
      return k.severity ?? "good";
  }
}

/** ---------- CSV download ---------- */
function downloadCsv(filename: string, rows: any[]) {
  const safe = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[,"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => safe(r[c])).join(",")).join("\n");
  const csv = [header, body].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ---------- Line chart tones ---------- */
type ChartTone = "neutral" | "revenue" | "orders" | "aov" | "margin" | "discount";

function toneClass(tone: ChartTone, sev?: Severity) {
  if (sev) {
    if (sev === "risk") return "text-rose-400";
    if (sev === "warn") return "text-amber-400";
    return "text-emerald-400";
  }
  switch (tone) {
    case "revenue":
      return "text-sky-400";
    case "orders":
      return "text-violet-400";
    case "aov":
      return "text-emerald-400";
    case "margin":
      return "text-teal-400";
    case "discount":
      return "text-amber-400";
    default:
      return "text-foreground";
  }
}

/** ---------- Color helpers (label-stable) ---------- */
const CHART_COLORS = [
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#a78bfa", // violet
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#f97316", // orange
];

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function colorForLabel(label: string) {
  const key = (label ?? "").trim().toLowerCase();
  const idx = hashString(key) % CHART_COLORS.length;
  return CHART_COLORS[idx];
}

/** ---------- Charts (SectionCard style) ---------- */
function LineChart({
  title,
  labels,
  values,
  valueFmt,
  height = 180,
  tone = "neutral",
  severity,
}: {
  title: string;
  labels: string[];
  values: (number | null)[];
  valueFmt?: (n: number) => string;
  height?: number;
  tone?: ChartTone;
  severity?: Severity;
}) {
  const w = 720;
  const h = height;
  const pad = 28;

  const clean = values.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  const nums = clean.filter((v): v is number => v !== null);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const span = max - min || 1;
  const xStep = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0;
  

  const pts = clean.map((v, i) => {
    const x = pad + i * xStep;
    const y = v === null ? null : pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  // Line path with gaps for nulls
  const dParts: string[] = [];
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.y === null) {
      started = false;
      continue;
    }
    dParts.push(`${started ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    started = true;
  }
  const d = dParts.join(" ");

  // Area fill path: reuse line but close to baseline
  const areaParts: string[] = [];
  started = false;
  let firstX: number | null = null;
  let lastX: number | null = null;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.y === null) {
      if (started && firstX !== null && lastX !== null) {
        areaParts.push(`L ${lastX.toFixed(2)} ${(h - pad).toFixed(2)}`);
        areaParts.push(`L ${firstX.toFixed(2)} ${(h - pad).toFixed(2)} Z`);
      }
      started = false;
      firstX = null;
      lastX = null;
      continue;
    }

    if (!started) {
      areaParts.push(`M ${p.x.toFixed(2)} ${(h - pad).toFixed(2)}`);
      areaParts.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      started = true;
      firstX = p.x;
      lastX = p.x;
    } else {
      areaParts.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      lastX = p.x;
    }
  }

  if (started && firstX !== null && lastX !== null) {
    areaParts.push(`L ${lastX.toFixed(2)} ${(h - pad).toFixed(2)}`);
    areaParts.push(`L ${firstX.toFixed(2)} ${(h - pad).toFixed(2)} Z`);
  }
  const areaD = areaParts.join(" ");

  // last non-null point
  let lastPt: { x: number; y: number; v: number } | null = null;
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    if (p.y !== null && p.v !== null) {
      lastPt = { x: p.x, y: p.y, v: p.v };
      break;
    }
  }
  const lastVal = lastPt?.v ?? null;

  const toneCls = toneClass(tone, severity);
  const gradId = `grad-${title.replaceAll(" ", "-").toLowerCase()}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-end justify-between">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{lastVal === null ? "—" : valueFmt ? valueFmt(lastVal) : lastVal.toFixed(2)}</div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className={`mt-3 h-[180px] w-full ${toneCls}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.20" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity="0.10" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" opacity="0.10" />

        {/* area fill */}
        {areaD ? <path d={areaD} fill={`url(#${gradId})`} /> : null}

        {/* line */}
        {d ? <path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.90" /> : null}

        {/* last point */}
        {lastPt ? <circle cx={lastPt.x} cy={lastPt.y} r="3.8" fill="currentColor" opacity="0.95" /> : null}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>{labels.length ? labels[0] : "—"}</div>
        <div>{labels.length ? labels[labels.length - 1] : "—"}</div>
      </div>
    </div>
  );
}

function Histogram({ title, buckets }: { title: string; buckets: AovBucket[] }) {
  const w = 760;
  const h = 240;
  const pad = 40;

  const maxOrders =
    buckets.length > 0
      ? Math.max(...buckets.map((b) => Number(b.orders ?? 0)))
      : 1;

  const n = buckets.length || 1;
  const barW = (w - pad * 2) / n;

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const hovered = hoverIdx === null ? null : buckets[hoverIdx] ?? null;

  if (!buckets.length) {
    return (
      <SectionCard title={title} subtitle="No AOV data available">
        <div className="py-10 text-center text-sm text-muted-foreground">
          No AOV distribution data for selected window.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={title}
      subtitle={
        <span className="text-xs text-muted-foreground">
          Order value distribution
        </span>
      }
    >
      <div className="relative">

        {/* Tooltip */}
        {hovered && (
          <div className="absolute right-2 top-2 rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-sm">
            <div className="font-medium">
              ${hovered.bucket_from} – ${hovered.bucket_to}
            </div>
            <div className="mt-1 text-muted-foreground">
              Orders: <span className="text-foreground">{hovered.orders}</span>
            </div>
            <div className="text-muted-foreground">
              Share:{" "}
              <span className="text-foreground">
                {hovered.share_pct.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-[240px] w-full">

          {/* Axes */}
          <line
            x1={pad}
            y1={h - pad}
            x2={w - pad}
            y2={h - pad}
            stroke="currentColor"
            opacity="0.12"
          />
          <line
            x1={pad}
            y1={pad}
            x2={pad}
            y2={h - pad}
            stroke="currentColor"
            opacity="0.12"
          />

          {/* Bars */}
          {buckets.map((b, i) => {
            const orders = Number(b.orders ?? 0);
            const bh =
              maxOrders > 0
                ? (orders / maxOrders) * (h - pad * 2)
                : 0;

            const x = pad + i * barW + 4;
            const y = h - pad - bh;
            const bw = Math.max(4, barW - 8);
            const isHover = hoverIdx === i;

            const bucketLabel = `${b.bucket_from}-${b.bucket_to}`;
            const color = colorForLabel(bucketLabel);

            return (
              <g key={`${bucketLabel}-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={bw}
                  height={bh}
                  fill={color}
                  opacity={isHover ? 1 : 0.75}
                  rx={8}
                  stroke="rgba(255,255,255,0.08)"
                  className="transition-all duration-300"
                />

                {/* Hover zone */}
                <rect
                  x={pad + i * barW}
                  y={pad}
                  width={barW}
                  height={h - pad * 2}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />

                {/* X-axis bucket label */}
                {i % Math.ceil(n / 6) === 0 && (
                  <text
                    x={pad + i * barW + barW / 2}
                    y={h - pad + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.5"
                  >
                    ${b.bucket_from}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="mt-3 text-xs text-muted-foreground">
          Distribution of order value (AOV) across selected window.
        </div>
      </div>
    </SectionCard>
  );
}

function DonutChart({
  title,
  subtitle,
  segments,
  valueFmt,
  onDownloadCsv,
}: {
  title: string;
  subtitle?: string;
  segments: { label: string; value: number; secondary?: string }[];
  valueFmt?: (n: number) => string;
  onDownloadCsv?: () => void;
}) {
  const size = 180;
  const r = 62;
  const c = 2 * Math.PI * r;

  const total = segments.reduce((a, s) => a + (Number.isFinite(s.value) ? s.value : 0), 0) || 1;
  let acc = 0;

  return (
    <SectionCard
      title={
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>

          {onDownloadCsv ? (
            <button className="h-9 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted" onClick={onDownloadCsv}>
              Download CSV
            </button>
          ) : null}
        </div>
      }
      subtitle={null as any}
    >
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:items-center">
        <div className="flex justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
              <circle r={r} fill="transparent" stroke="currentColor" opacity="0.08" strokeWidth="18" />
              {segments.map((s, i) => {
                const val = Math.max(0, Number(s.value) || 0);
                const frac = val / total;
                const dash = frac * c;
                const gap = c - dash;
                const offset = -acc * c;
                acc += frac;

                const color = colorForLabel(s.label);
                const opacity = Math.max(0.35, 0.95 - i * 0.10);

                return (
                  <circle
                    key={`${s.label}-${i}`}
                    r={r}
                    fill="transparent"
                    stroke={color}
                    strokeOpacity={opacity}
                    strokeWidth="18"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                  />
                );
              })}
              <circle r={r - 16} fill="transparent" />
            </g>
          </svg>
        </div>

        <div className="space-y-2">
          {segments.map((s, i) => {
            const val = Number(s.value || 0);
            const pct = (val / total) * 100;
            const color = colorForLabel(s.label);

            return (
              <div key={`${s.label}-${i}`} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{s.label}</div>
                    {s.secondary ? <div className="text-xs text-muted-foreground">{s.secondary}</div> : null}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color, opacity: 0.95 }} />
                    {pct.toFixed(2)}%
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{valueFmt ? valueFmt(val) : val.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function HorizontalBarChart({
  title,
  rows,
  valueKey,
  labelKey,
  valueFmt,
  onDownloadCsv,
}: {
  title: string;
  rows: any[];
  valueKey: string;
  labelKey: string;
  valueFmt?: (n: number) => string;
  onDownloadCsv?: () => void;
}) {
  const max = rows.length ? Math.max(...rows.map((r) => Number(r[valueKey] ?? 0))) : 1;

  return (
    <SectionCard
      title={
        <div className="flex items-end justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {onDownloadCsv ? (
            <button className="h-9 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted" onClick={onDownloadCsv}>
              Download CSV
            </button>
          ) : null}
        </div>
      }
      subtitle={null as any}
    >
      <div className="mt-3 space-y-2">
        {rows.length ? (
          rows.map((r, idx) => {
            const v = Number(r[valueKey] ?? 0);
            const pct = max ? (v / max) * 100 : 0;
            const label = String(r[labelKey] ?? "row");
            const accent = colorForLabel(label);

            return (
              <div key={`${label}-${idx}`} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{label}</div>
                    {r.category ? <div className="text-xs text-muted-foreground">{String(r.category)}</div> : null}
                  </div>
                  <div className="shrink-0 text-xs font-medium text-foreground">{valueFmt ? valueFmt(v) : v.toFixed(2)}</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: accent, opacity: 0.9 }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">No data.</div>
        )}
      </div>
    </SectionCard>
  );
}

function idx100(values: Array<number | null | undefined>) {
  const clean = values.map((v) => (Number.isFinite(Number(v)) ? Number(v) : null));
  const first = clean.find((v) => v !== null) ?? null;
  if (first === null || first === 0) return clean.map(() => null);
  return clean.map((v) => (v === null ? null : (v / first) * 100));
}

function fmtIdx(n: number) {
  return `${n.toFixed(0)} idx`;
}

function buildPath(pts: Array<{ x: number; y: number | null }>) {
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
  return dParts.join(" ");
}

function buildAreaPath(pts: Array<{ x: number; y: number | null }>, baselineY: number) {
  const areaParts: string[] = [];
  let started = false;
  let firstX: number | null = null;
  let lastX: number | null = null;

  for (const p of pts) {
    if (p.y === null) {
      if (started && firstX !== null && lastX !== null) {
        areaParts.push(`L ${lastX.toFixed(2)} ${baselineY.toFixed(2)}`);
        areaParts.push(`L ${firstX.toFixed(2)} ${baselineY.toFixed(2)} Z`);
      }
      started = false;
      firstX = null;
      lastX = null;
      continue;
    }

    if (!started) {
      areaParts.push(`M ${p.x.toFixed(2)} ${baselineY.toFixed(2)}`);
      areaParts.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      started = true;
      firstX = p.x;
      lastX = p.x;
    } else {
      areaParts.push(`L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      lastX = p.x;
    }
  }

  if (started && firstX !== null && lastX !== null) {
    areaParts.push(`L ${lastX.toFixed(2)} ${baselineY.toFixed(2)}`);
    areaParts.push(`L ${firstX.toFixed(2)} ${baselineY.toFixed(2)} Z`);
  }

  return areaParts.join(" ");
}

function lastNonNullPoint(
  pts: Array<{ x: number; y: number | null; v: number | null }>
): { x: number; y: number; v: number } | null {
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    if (p.y !== null && p.v !== null) return { x: p.x, y: p.y, v: p.v };
  }
  return null;
}

function CompareLineChart({
  title,
  subtitle,
  labels,
  aLabel,
  aValues,
  bLabel,
  bValues,
  valueFmt = fmtIdx,
  height = 220,
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  aLabel: string;
  aValues: Array<number | null>;
  bLabel: string;
  bValues: Array<number | null>;
  valueFmt?: (n: number) => string;
  height?: number;
}) {
  const w = 760;
  const h = height;
  const pad = 28;

  // Shared scale (min/max across both series)
  const cleanA = aValues.map((v) => (Number.isFinite(Number(v)) ? Number(v) : null));
  const cleanB = bValues.map((v) => (Number.isFinite(Number(v)) ? Number(v) : null));
  const nums = [...cleanA, ...cleanB].filter((v): v is number => v !== null);

  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const span = max - min || 1;

  const xStep = labels.length > 1 ? (w - pad * 2) / (labels.length - 1) : 0;

  const ptsA = cleanA.map((v, i) => {
    const x = pad + i * xStep;
    const y = v === null ? null : pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  const ptsB = cleanB.map((v, i) => {
    const x = pad + i * xStep;
    const y = v === null ? null : pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y, v };
  });

  const lineA = buildPath(ptsA.map((p) => ({ x: p.x, y: p.y })));
  const lineB = buildPath(ptsB.map((p) => ({ x: p.x, y: p.y })));

  const areaA = buildAreaPath(ptsA.map((p) => ({ x: p.x, y: p.y })), h - pad);
  const areaB = buildAreaPath(ptsB.map((p) => ({ x: p.x, y: p.y })), h - pad);

  const lastA = lastNonNullPoint(ptsA);
  const lastB = lastNonNullPoint(ptsB);

  const gradA = `gradA-${title.replaceAll(" ", "-").toLowerCase()}`;
  const gradB = `gradB-${title.replaceAll(" ", "-").toLowerCase()}`;

  // Use existing palette helper
  const colorA = colorForLabel(aLabel); // e.g. revenue
  const colorB = colorForLabel(bLabel); // e.g. orders

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>

        <div className="text-xs text-muted-foreground">
          {lastA ? (
            <span className="mr-3">
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorA, opacity: 0.95 }} />
              {aLabel}: <span className="text-foreground">{valueFmt(lastA.v)}</span>
            </span>
          ) : null}
          {lastB ? (
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colorB, opacity: 0.95 }} />
              {bLabel}: <span className="text-foreground">{valueFmt(lastB.v)}</span>
            </span>
          ) : null}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-[220px] w-full">
        <defs>
          <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.18" />
            <stop offset="70%" stopColor={colorA} stopOpacity="0.06" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.14" />
            <stop offset="70%" stopColor={colorB} stopOpacity="0.05" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* axes */}
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity="0.10" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" opacity="0.10" />

        {/* area fills (subtle, behind lines) */}
        {areaA ? <path d={areaA} fill={`url(#${gradA})`} /> : null}
        {areaB ? <path d={areaB} fill={`url(#${gradB})`} /> : null}

        {/* lines */}
        {lineA ? <path d={lineA} fill="none" stroke={colorA} strokeWidth="2.3" opacity="0.95" /> : null}
        {lineB ? <path d={lineB} fill="none" stroke={colorB} strokeWidth="2.3" opacity="0.90" /> : null}

        {/* last points */}
        {lastA ? <circle cx={lastA.x} cy={lastA.y} r="3.8" fill={colorA} opacity="0.95" /> : null}
        {lastB ? <circle cx={lastB.x} cy={lastB.y} r="3.8" fill={colorB} opacity="0.95" /> : null}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>{labels.length ? labels[0] : "—"}</div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorA, opacity: 0.95 }} />
            {aLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorB, opacity: 0.95 }} />
            {bLabel}
          </span>
        </div>
        <div>{labels.length ? labels[labels.length - 1] : "—"}</div>
      </div>
    </div>
  );
}

/** ---------- Sales Client ---------- */
export function SalesClient() {
  const [windowCode, setWindowCode] = React.useState<"7d" | "30d" | "90d" | "ytd">("30d");
  const [locationId, setLocationId] = React.useState<string>("all");
  const [asOf, setAsOf] = React.useState<string>("2026-02-18T19:00:00-05:00");

  const [data, setData] = React.useState<SalesResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { refreshState, startRefresh, finishRefresh, failRefresh, isRefreshing } = useRefreshState();

  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [aovBuckets, setAovBuckets] = React.useState<AovBucket[]>([]);

  

  // Load locations once
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/restaurant/locations", { cache: "no-store" });
        const j = await r.json();
        const raw = (j.locations ?? []) as any[];

        const mapped: LocationRow[] = raw.map((x) => ({
          location_id: String(x.location_id ?? x.id ?? ""),
          location_code: String(x.location_code ?? x.code ?? "LOC"),
          name: String(x.name ?? "Location"),
        }));

        setLocations(mapped.filter((x) => x.location_id));
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
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(l);
    }
    return out;
  }, [locations]);

  const load = React.useCallback(async () => {
  setLoading(true);
  startRefresh();

  try {
    const sp = new URLSearchParams();
    sp.set("window", windowCode);
    if (asOf.trim()) sp.set("as_of", asOf.trim());
    if (locationId !== "all") sp.set("location_id", locationId);

    const salesUrl = `/api/restaurant/sales?${sp.toString()}`;
    const histUrl = `/api/restaurant/sales/aov-histogram?${sp.toString()}&bucket_size=10&max_value=200`;

    const [salesRes, histRes] = await Promise.all([
      fetch(salesUrl, { cache: "no-store" }),
      fetch(histUrl, { cache: "no-store" }),
    ]);

    // --- Sales is required ---
    const salesText = await salesRes.text();
    if (!salesRes.ok) {
      throw new Error(`Sales API HTTP ${salesRes.status}. BodyPreview=${salesText.slice(0, 140)}`);
    }

    let salesJson: SalesResponse;
    try {
      salesJson = JSON.parse(salesText);
    } catch {
      throw new Error(`Sales API returned non-JSON (${salesRes.status}). BodyPreview=${salesText.slice(0, 140)}`);
    }
    setData(salesJson);

    // --- Histogram is OPTIONAL ---
    if (!histRes.ok) {
      // 404 is common when the route isn’t deployed yet
      setAovBuckets([]);
      return;
    }

    const histText = await histRes.text();
    let histJson: any;
    try {
      histJson = JSON.parse(histText);
    } catch {
      // If it returns HTML or anything non-JSON, don't crash the page
      setAovBuckets([]);
      return;
    }

    const bucketsRaw = (histJson?.buckets ?? []) as any[];
    const buckets: AovBucket[] = bucketsRaw.map((b) => ({
      bucket_from: Number(b.bucket_from),
      bucket_to: Number(b.bucket_to),
      orders: Number(b.orders),
      share_pct: Number(b.share_pct),
    }));
    setAovBuckets(buckets);
    finishRefresh();
  } catch (e: any) {
    failRefresh();
    setData({
      ok: false,
      as_of: null,
      refreshed_at: new Date().toISOString(),
      window: windowCode,
      location: { id: "all", name: "All Locations" },
      kpis: [],
      series: { day: [], revenue: [], orders: [], aov: [], gross_margin_pct: [], discount_rate_pct: [] },
      error: e?.message ?? String(e),
    });
    setAovBuckets([]);
    } finally {
    setLoading(false);
    }
  }, [windowCode, locationId, asOf, startRefresh, finishRefresh, failRefresh]);

  React.useEffect(() => {
    load();
  }, [load]);

  const ok = Boolean(data?.ok);
  const kpis = data?.kpis ?? [];
  const series = data?.series ?? { day: [], revenue: [], orders: [], aov: [], gross_margin_pct: [], discount_rate_pct: [] };

  const topItems = (data?.top_items ?? []).slice(0, 10);
  const categoryMix = data?.category_mix ?? [];
  const channelMix = data?.channel_mix ?? [];

  const locLabel =
    locationId === "all"
      ? "All Locations"
      : (() => {
          const l = locations.find((x) => x.location_id === locationId);
          return l ? `${l.location_code} — ${l.name}` : "Location";
        })();

  const ordersKpiVal = kpis.find((x) => x.code === "SALES_ORDERS")?.value ?? 0;
  const revenueKpiVal = kpis.find((x) => x.code === "SALES_REVENUE")?.value ?? 0;

  // Overview-style tiles using RestaurantKpiTile
  const tileKpis: RestaurantKpi[] = React.useMemo(() => {
    return (kpis ?? []).map((k) => {
      const sev = computeSeverity(k);
      // RestaurantKpiTile expects pct in 0..1 for pct unit
      const v = k.unit === "pct" && typeof k.value === "number" ? k.value / 100 : k.value;
      return { ...(k as any), value: v, severity: sev } as RestaurantKpi;
    });
  }, [kpis]);

  const tileSeriesByCode: Record<string, number[]> = React.useMemo(() => {
    const toNums = (arr: Array<number | null | undefined>) => arr.map((x) => (Number.isFinite(Number(x)) ? Number(x) : 0));
    return {
      SALES_REVENUE: toNums(series.revenue ?? []),
      SALES_ORDERS: toNums(series.orders ?? []),
      SALES_AOV: toNums(series.aov ?? []),
      SALES_GROSS_MARGIN: toNums(series.gross_margin_pct ?? []).map((x) => x / 100),
      SALES_DISCOUNT_RATE: toNums(series.discount_rate_pct ?? []).map((x) => x / 100),
    };
  }, [series]);

  const gmDelta = kpis.find((x) => x.code === "SALES_GROSS_MARGIN")?.delta ?? 0;
  const discDelta = kpis.find((x) => x.code === "SALES_DISCOUNT_RATE")?.delta ?? 0;
  const revDelta = (kpis.find((x) => x.code === "SALES_REVENUE")?.delta ?? null) as number | null;
  const ordDelta = (kpis.find((x) => x.code === "SALES_ORDERS")?.delta ?? null) as number | null;
  const aovDelta = (kpis.find((x) => x.code === "SALES_AOV")?.delta ?? null) as number | null;

  return (
    <div className="space-y-4">
      {/* Header (Overview-style) */}
      <SectionCard title="Sales" subtitle="Sales KPIs and mix analysis for the selected window.">
        <div className="space-y-3">
          {/* controls */}
            <div className="flex items-end gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Location</label>
                <select
                  className="h-9 min-w-[200px] rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
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

              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Window</label>
                <select
                  className="h-9 min-w-[110px] rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
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
                <label className="text-xs text-muted-foreground">Snapshot</label>
                <input
                  className="h-9 w-[240px] rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                  placeholder="2026-02-18T19:00:00-05:00"
                />
              </div>

              <button
                className="group h-9 rounded-xl border border-border bg-background px-4 text-sm hover:bg-muted disabled:opacity-70"
                onClick={load}
                disabled={loading}
              >
                <RefreshCcw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
              </button>
            </div>

            {/* header info */}
            <div className="text-sm text-muted-foreground">
              Last Updated:{" "}
              <span className="font-medium">{formatAsOf(data?.as_of)}</span>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="font-medium">{locLabel}</span>
            </div>
            

          {!ok && data?.error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
              <div className="font-medium">Sales API Error</div>
              <div className="mt-1 text-xs text-muted-foreground">{data.error}</div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* Summary strip */}
      {ok && !loading && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Orders:</span>{" "}
              <span className="font-semibold text-foreground">{Number(ordersKpiVal ?? 0).toFixed(0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Revenue:</span>{" "}
              <span className="font-semibold text-foreground">{fmtUsd0(Number(revenueKpiVal ?? 0))}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Days in Window:</span>{" "}
              <span className="font-semibold text-foreground">{series.day.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI tiles (Overview-style) */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {tileKpis.map((k) => (
            <RestaurantKpiTile key={k.code} kpi={k} series={tileSeriesByCode[k.code]} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && ok && series.day.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="text-sm font-semibold text-foreground">No data for selected window</div>
          <div className="mt-2 text-sm text-muted-foreground">Try expanding the window (90D / YTD) or adjusting As-of date.</div>
        </div>
      ) : null}

      {/* Charts (SectionCard style) */}
      {!loading && ok && series.day.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <CompareLineChart
              title="Demand vs Basket Performance"
              subtitle="Indexed (100) to compare Net Sales vs Orders movement in one view."
              labels={series.day}
              aLabel="Net Sales"
              aValues={idx100(series.revenue)}
              bLabel="Orders"
              bValues={idx100(series.orders)}
              valueFmt={fmtIdx}
            />
            <LineChart title="Net Sales Trend" labels={series.day} values={series.revenue.map((x) => x)} valueFmt={fmtUsd0} tone="revenue" />
            <LineChart title="Orders Trend" labels={series.day} values={series.orders.map((x) => x)} tone="orders" />
            <LineChart title="AOV Trend" labels={series.day} values={series.aov} valueFmt={fmtUsd2} tone="aov" />

            <Histogram title="AOV Distribution (Histogram)" buckets={aovBuckets} />
            

            <LineChart
              title="Gross Margin % Trend"
              labels={series.day}
              values={series.gross_margin_pct}
              valueFmt={fmtPct2}
              tone="margin"
              severity={computeSeverity({ code: "SALES_GROSS_MARGIN", delta: gmDelta })}
            />

            <LineChart
              title="Discount Rate % Trend"
              labels={series.day}
              values={series.discount_rate_pct}
              valueFmt={fmtPct2}
              tone="discount"
              severity={computeSeverity({ code: "SALES_DISCOUNT_RATE", delta: discDelta })}
            />
          </div>

          {/* ---------- Mix Section ---------- */}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">

            <DonutChart
              title="Category Mix"
              subtitle="Share of net revenue."
              segments={categoryMix.map((c, i) => ({
                label: String(c.category ?? `Category ${i + 1}`),
                value: Number(c.revenue ?? 0),
                secondary: `${Number(c.share_pct ?? 0).toFixed(2)}%`,
              }))}
              valueFmt={fmtUsd2}
              onDownloadCsv={() =>
                downloadCsv(`sales_category_mix_${windowCode}_${locationId}.csv`, categoryMix)
              }
            />

            <DonutChart
              title="Channel Mix"
              subtitle="Share of net revenue."
              segments={channelMix.map((c, i) => ({
                label: String(c.order_channel ?? `Channel ${i + 1}`),
                value: Number(c.revenue ?? 0),
                secondary: `${Number(c.share_pct ?? 0).toFixed(2)}%`,
              }))}
              valueFmt={fmtUsd2}
              onDownloadCsv={() =>
                downloadCsv(`sales_channel_mix_${windowCode}_${locationId}.csv`, channelMix)
              }
            />

          </div>

          {/* ---------- Top Items Section ---------- */}
          <div className="grid grid-cols-1 gap-3">

            <HorizontalBarChart
              title="Top Items (Revenue)"
              rows={topItems.map((x) => ({
                label: x.item_name,
                revenue_num: Number(x.revenue ?? 0),
                share_pct: x.share_pct,
                quantity: x.quantity,
              }))}
              valueKey="revenue_num"
              labelKey="label"
              valueFmt={fmtUsd2}
              onDownloadCsv={() =>
                downloadCsv(`sales_top_items_${windowCode}_${locationId}.csv`, topItems)
              }
            />

            <SectionCard
              title={
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Top Items (Detail)
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Item revenue is gross (qty×unit_price). KPI revenue is net.
                    </div>
                  </div>
                  <button
                    className="h-9 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted"
                    onClick={() =>
                      downloadCsv(`sales_top_items_detail_${windowCode}_${locationId}.csv`, topItems)
                    }
                  >
                    Download CSV
                  </button>
                </div>
              }
              subtitle={null as any}
            >
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3">Item</th>
                      <th className="py-2 pr-3">Qty</th>
                      <th className="py-2 pr-0 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.length ? (
                      topItems.map((it, idx) => (
                        <tr
                          key={`${it.item_name}-${idx}`}
                          className="border-b border-border/60"
                        >
                          <td className="py-2 pr-3">
                            <div className="font-medium text-foreground">
                              {it.item_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Number(it.share_pct ?? 0).toFixed(2)}% share
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {Number(it.quantity ?? 0).toFixed(0)}
                          </td>
                          <td className="py-2 pr-0 text-right font-medium text-foreground">
                            {fmtUsd2(Number(it.revenue ?? 0))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No items yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            <CompareLineChart
              title="Demand vs Basket Performance"
              subtitle="Indexed (100) to compare Net Sales vs Orders movement in one view."
              labels={series.day}
              aLabel="Net Sales"
              aValues={idx100(series.revenue)}
              bLabel="Orders"
              bValues={idx100(series.orders)}
              valueFmt={fmtIdx}
            />

          </div>
        </>
      ) : null}
    </div>
  );
}