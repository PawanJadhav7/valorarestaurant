"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";
import { useRefreshState } from "@/components/restaurant/useRefreshState";
import { PageScaffold } from "@/components/restaurant/PageScaffold";
import { ValoraIntelligence } from "@/components/restaurant/ValoraIntelligence";
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
  quantity: string;
  revenue: string;
  share_pct: string;
  gross_profit?: string;
  gross_margin_pct?: string;
  avg_unit_price?: string;
  action_flag?:
  | "high_revenue_low_margin"
  | "high_margin_low_revenue"
  | "healthy_driver";
};

type SalesSeries = {
  day: string[];
  revenue: number[];
  orders: number[];
  aov: (number | null)[];
  gross_margin_pct: (number | null)[];
  discount_rate_pct: (number | null)[];
  dine_in?: number[];
  delivery?: number[];
  takeaway?: number[];
};

type InsightSeverity = "good" | "warn" | "risk";

type InsightItem = {
  code: string;
  title: string;
  message: string;
  severity: InsightSeverity;
};

type AlertItem = {
  code: string;
  title: string;
  message: string;
  severity: "warn" | "risk";
};

type RecommendationItem = {
  code: string;
  title: string;
  action: string;
  rationale: string;
  priority: "high" | "medium" | "low";
};

type SalesInsights = {
  kpi_insights: InsightItem[];
  chart_insights: InsightItem[];
  alerts: AlertItem[];
  recommendations: RecommendationItem[];
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
  insights?: SalesInsights;
  error?: string;
};

type LocationRow = {
  location_id: string;
  location_code?: string;
  location_name?: string;
  name?: string;
};

type AovBucket = {
  bucket_from: number;
  bucket_to: number;
  orders: number;
  share_pct: number;
};

/** ---------- Formatting helpers ---------- */

function prettifyLocationLabel(raw: string | null | undefined): string {
  if (!raw) return "Unknown Location";

  return raw
    .replace(/_[A-F0-9]{8,}$/i, "")
    .replace(/_LOCATION$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtUsd0(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtUsd2(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtShortDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

function tickStep(count: number) {
  if (count <= 7) return 1;
  if (count <= 30) return 3;
  if (count <= 90) return 7;
  return 14;
}

/** ---------- KPI severity rules ---------- */
function computeSeverity(
  k: Pick<Kpi, "code" | "delta" | "severity">
): Severity {
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

/** ---------- Item flag helpers ---------- */
function itemFlagBadge(flag?: string) {
  switch (flag) {
    case "high_revenue_low_margin":
      return "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "high_margin_low_revenue":
      return "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "healthy_driver":
      return "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium bg-green-500/10 text-foreground border-green-500/20";
    default:
      return "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium bg-muted text-foreground border-border/50";
  }
}

function itemFlagLabel(flag?: string) {
  switch (flag) {
    case "high_revenue_low_margin":
      return "Margin Risk";
    case "high_margin_low_revenue":
      return "Upside Opportunity";
    case "healthy_driver":
      return "Healthy Driver";
    default:
      return "Review";
  }
}

function getItemInsight(row: any) {
  const share = Number(row.share_pct ?? 0);
  const margin = Number(row.gross_margin_pct ?? 0);

  if (share >= 12 && margin < 55) {
    return {
      label: "Fix Pricing",
      color: "bg-red-500/15 text-red-400 border-red-500/30",
      icon: "🔴",
    };
  }

  if (share < 8 && margin >= 70) {
    return {
      label: "Promote",
      color: "bg-green-500/15 text-green-400 border-green-500/30",
      icon: "🟢",
    };
  }

  return {
    label: "Healthy",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: "⭐",
  };
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
  const body = rows
    .map((r) => cols.map((c) => safe(r[c])).join(","))
    .join("\n");
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

/** ---------- Color helpers ---------- */
const CHART_COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#22d3ee",
  "#f97316",
];

const AXIS_TEXT_CLASS = "text-muted-foreground";

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

/** ---------- Top items bar ---------- */
function TopItemsBarChart({
  rows,
  valueKey,
  labelKey,
  valueFmt,
}: {
  rows: any[];
  valueKey: string;
  labelKey: string;
  valueFmt?: (n: number) => string;
}) {
  const sortedRows = [...rows].sort(
    (a, b) => Number(b[valueKey] ?? 0) - Number(a[valueKey] ?? 0)
  );

  const max = sortedRows.length
    ? Math.max(...sortedRows.map((r) => Number(r[valueKey] ?? 0)))
    : 1;

  return (
    <div className="space-y-3">
      {sortedRows.length ? (
        sortedRows.map((r, idx) => {
          const v = Number(r[valueKey] ?? 0);
          const pct = max ? (v / max) * 100 : 0;
          const label = String(r[labelKey] ?? "row");
          const sharePct = Number(r.share_pct ?? 0);
          const qty = Number(r.quantity ?? 0);
          const marginPct = Number(r.gross_margin_pct ?? 0);
          const grossProfit = Number(r.gross_profit ?? 0);
          const actionFlag = r.action_flag;

          return (
            <div
              key={`${label}-${idx}`}
              className="rounded-xl border border-border/60 bg-background/20 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 text-xs font-semibold text-foreground">
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {label}
                      </div>
                      <span className={itemFlagBadge(actionFlag)}>
                        {itemFlagLabel(actionFlag)}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      Qty {qty.toFixed(0)} • Share {sharePct.toFixed(2)}% •
                      Margin {marginPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {valueFmt ? valueFmt(v) : v.toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Profit {fmtUsd2(grossProfit)}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2.5 w-full rounded-full bg-muted/60">
                <div
                  className="h-2.5 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <div className="text-lg">📊</div>
          <div className="text-sm">No item performance data</div>
        </div>
      )}
    </div>
  );
}

/** ---------- Charts ---------- */
function SalesOrdersTrend({
  title,
  subtitle,
  labels,
  sales,
  orders,
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  sales: number[];
  orders: number[];
}) {
  const w = 760;
  const h = 200;
  const padLeft = 84;
  const padRight = 84;
  const padTop = 18;
  const padBottom = 44;

  const salesClean = (sales ?? []).map((v) =>
    Number.isFinite(Number(v)) ? Number(v) : 0
  );
  const ordersClean = (orders ?? []).map((v) =>
    Number.isFinite(Number(v)) ? Number(v) : 0
  );

  const [hoveredSeries, setHoveredSeries] = React.useState<
    "sales" | "orders" | null
  >(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const salesMax = salesClean.length ? Math.max(...salesClean, 1) : 1;
  const ordersMax = ordersClean.length ? Math.max(...ordersClean, 1) : 1;

  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;
  const xStep = labels.length > 1 ? plotW / labels.length : plotW;
  const barW = Math.max(14, Math.min(34, xStep * 0.66));

  const salesColor = colorForLabel("Net Sales");
  const ordersColor = colorForLabel("Orders");

  const barPts = salesClean.map((v, i) => {
    const x = padLeft + i * xStep + (xStep - barW) / 2;
    const barH = (v / salesMax) * plotH * 0.92;
    const y = padTop + plotH - barH;
    return { x, y, v, barH };
  });

  const orderPts = ordersClean.map((v, i) => {
    const x = padLeft + i * xStep + xStep / 2;
    const y = padTop + plotH * (1 - (v * 0.92) / ordersMax);
    return { x, y, v };
  });

  const orderPath = orderPts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    )
    .join(" ");

  const ticks = 4;

  const yLeftTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = (salesMax / ticks) * (ticks - i);
    const y = padTop + (plotH / ticks) * i;
    return { value, y };
  });

  const yRightTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = Math.round((ordersMax / ticks) * (ticks - i));
    const y = padTop + (plotH / ticks) * i;
    return { value, y };
  });

  const step = tickStep(labels.length);

  const activeIndex = hoveredIndex ?? Math.max(0, labels.length - 1);
  const activeLabel = labels[activeIndex] ?? "";
  const activeSales = salesClean[activeIndex] ?? 0;
  const activeOrders = ordersClean[activeIndex] ?? 0;



  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/25 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {activeLabel ? fmtShortDate(activeLabel) : "—"}
          </span>
          <span className="mx-3">•</span>
          Net Sales:{" "}
          <span className="font-semibold text-foreground">
            {fmtUsd0(activeSales)}
          </span>
          <span className="mx-3">•</span>
          Orders:{" "}
          <span className="font-semibold text-foreground">{activeOrders}</span>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} className="h-[340px] w-full">
          <defs>
            <filter
              id="comboLineGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yLeftTicks.map((t, i) => (
            <line
              key={`grid-${i}`}
              x1={padLeft}
              y1={t.y}
              x2={w - padRight}
              y2={t.y}
              stroke="currentColor"
              className={AXIS_TEXT_CLASS}
              opacity="0.18"
            />
          ))}

          {yLeftTicks.map((t, i) => (
            <g key={`left-${i}`}>
              <rect
                x={padLeft - 72}
                y={t.y - 11}
                width={62}
                height={20}
                rx={6}
                fill="rgba(255,255,255,0.14)"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 16}
                y={t.y + 4}
                textAnchor="end"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className={AXIS_TEXT_CLASS}
              >
                {fmtUsd0(t.value)}
              </text>
            </g>
          ))}

          {yRightTicks.map((t, i) => (
            <g key={`right-${i}`}>
              <rect
                x={w - padRight + 10}
                y={t.y - 11}
                width={50}
                height={20}
                rx={6}
                fill="rgba(255,255,255,0.14)"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth="1"
              />
              <text
                x={w - padRight + 18}
                y={t.y + 4}
                textAnchor="start"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className={AXIS_TEXT_CLASS}
              >
                {t.value}
              </text>
            </g>
          ))}

          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={h - padBottom}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.24"
          />
          <line
            x1={w - padRight}
            y1={padTop}
            x2={w - padRight}
            y2={h - padBottom}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.24"
          />
          <line
            x1={padLeft}
            y1={h - padBottom}
            x2={w - padRight}
            y2={h - padBottom}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.24"
          />

          {barPts.map((p, i) => (
            <g key={`bar-${i}`}>
              <rect
                x={p.x}
                y={p.y}
                width={barW}
                height={p.barH}
                rx={8}
                fill={salesColor}
                opacity={
                  hoveredSeries === "orders"
                    ? 0.35
                    : hoveredIndex === i
                      ? 1
                      : 0.88
                }
                stroke={
                  hoveredIndex === i
                    ? "rgba(255,255,255,0.28)"
                    : "rgba(255,255,255,0.08)"
                }
                strokeWidth={hoveredIndex === i ? "1.2" : "1"}
                onMouseEnter={() => {
                  setHoveredSeries("sales");
                  setHoveredIndex(i);
                }}
                onMouseLeave={() => {
                  setHoveredSeries(null);
                  setHoveredIndex(null);
                }}
              />
            </g>
          ))}

          <path
            d={orderPath}
            fill="none"
            stroke={ordersColor}
            strokeWidth={hoveredSeries === "orders" ? "3.6" : "2.8"}
            opacity={hoveredSeries === "sales" ? "0.45" : "0.98"}
            filter={
              hoveredSeries === "orders" ? "url(#comboLineGlow)" : undefined
            }
          />

          {orderPts.map((p, i) => (
            <circle
              key={`pt-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 4.8 : 3.4}
              fill={ordersColor}
              opacity={hoveredSeries === "sales" ? 0.45 : 0.98}
              stroke={hoveredIndex === i ? "#ffffff" : "transparent"}
              strokeWidth="1.2"
              onMouseEnter={() => {
                setHoveredSeries("orders");
                setHoveredIndex(i);
              }}
              onMouseLeave={() => {
                setHoveredSeries(null);
                setHoveredIndex(null);
              }}
            />
          ))}

          {labels.map((label, i) => (
            <rect
              key={`hover-${i}`}
              x={padLeft + i * xStep}
              y={padTop}
              width={xStep}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {labels.map((label, i) => {
            if (i % step !== 0 && i !== labels.length - 1) return null;
            const x = padLeft + i * xStep + xStep / 2;
            return (
              <text
                key={`${label}-${i}`}
                x={x}
                y={h - padBottom + 22}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className={AXIS_TEXT_CLASS}
              >
                {fmtShortDate(label)}
              </text>
            );
          })}
        </svg>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: salesColor }}
            />
            Net Sales
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: ordersColor }}
            />
            Orders
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

function SalesCompositionStackedChart({
  labels,
  dineIn,
  delivery,
  takeaway,
}: {
  labels: string[];
  dineIn: number[];
  delivery: number[];
  takeaway: number[];
}) {
  const w = 900;
  const h = 340;
  const padLeft = 56;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 44;

  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;
  const slotW = plotW / Math.max(labels.length, 1);

  const maxTotal = Math.max(
    ...labels.map(
      (_, i) => (dineIn[i] ?? 0) + (delivery[i] ?? 0) + (takeaway[i] ?? 0)
    ),
    1
  );

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = (maxTotal / ticks) * (ticks - i);
    const y = padTop + (plotH / ticks) * i;
    return { value, y };
  });

  const step = tickStep(labels.length);

  return (
    <SectionCard
      title="Sales Composition Analysis"
      subtitle="Channel mix across the selected period."
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[340px] w-full">
        {yTicks.map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={padLeft}
            y1={t.y}
            x2={w - padRight}
            y2={t.y}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.18"
          />
        ))}

        {yTicks.map((t, i) => (
          <text
            key={`y-${i}`}
            x={padLeft - 10}
            y={t.y + 4}
            textAnchor="end"
            fontSize="12"
            fontWeight="700"
            fill="currentColor"
            className={AXIS_TEXT_CLASS}
          >
            {fmtUsd0(t.value)}
          </text>
        ))}

        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={h - padBottom}
          stroke="currentColor"
          className={AXIS_TEXT_CLASS}
          opacity="0.24"
        />
        <line
          x1={padLeft}
          y1={h - padBottom}
          x2={w - padRight}
          y2={h - padBottom}
          stroke="currentColor"
          className={AXIS_TEXT_CLASS}
          opacity="0.24"
        />

        {labels.map((label, i) => {
          const d = dineIn[i] ?? 0;
          const del = delivery[i] ?? 0;
          const t = takeaway[i] ?? 0;

          const x = padLeft + i * slotW + slotW * 0.2;
          const bw = slotW * 0.6;

          const dH = (d / maxTotal) * plotH;
          const delH = (del / maxTotal) * plotH;
          const tH = (t / maxTotal) * plotH;

          const base = h - padBottom;

          return (
            <g key={i}>
              <rect
                x={x}
                y={base - dH}
                width={bw}
                height={dH}
                fill="#6366f1"
                rx={6}
              />
              <rect
                x={x}
                y={base - dH - delH}
                width={bw}
                height={delH}
                fill="#10b981"
              />
              <rect
                x={x}
                y={base - dH - delH - tH}
                width={bw}
                height={tH}
                fill="#f59e0b"
                rx={6}
              />
            </g>
          );
        })}

        {labels.map((label, i) => {
          if (i % step !== 0 && i !== labels.length - 1) return null;
          const x = padLeft + i * slotW + slotW / 2;
          return (
            <text
              key={`${label}-${i}`}
              x={x}
              y={h - padBottom + 22}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="currentColor"
              className={AXIS_TEXT_CLASS}
            >
              {fmtShortDate(label)}
            </text>
          );
        })}
      </svg>
    </SectionCard>
  );
}

function Histogram({
  title,
  buckets,
}: {
  title: string;
  buckets: AovBucket[];
}) {
  if (!buckets?.length) {
    return (
      <SectionCard title={title}>
        <div className="py-10 text-center text-sm text-muted-foreground">
          No distribution data available
        </div>
      </SectionCard>
    );
  }

  const w = 900;
  const h = 340;
  const padLeft = 56;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 44;

  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const max = Math.max(...buckets.map((b) => b.orders), 1);
  const slotW = plotW / buckets.length;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = Math.round((max / ticks) * (ticks - i));
    const y = padTop + (plotH / ticks) * i;
    return { value, y };
  });

  const step = buckets.length <= 8 ? 1 : buckets.length <= 16 ? 2 : 3;

  return (
    <SectionCard title={title} subtitle="Distribution of order count by spend band.">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[340px] w-full">
        {yTicks.map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={padLeft}
            y1={t.y}
            x2={w - padRight}
            y2={t.y}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.18"
          />
        ))}

        {yTicks.map((t, i) => (
          <text
            key={`y-${i}`}
            x={padLeft - 10}
            y={t.y + 4}
            textAnchor="end"
            fontSize="12"
            fontWeight="700"
            fill="currentColor"
            className={AXIS_TEXT_CLASS}
          >
            {t.value.toLocaleString()}
          </text>
        ))}

        <line
          x1={padLeft}
          y1={padTop}
          x2={padLeft}
          y2={h - padBottom}
          stroke="currentColor"
          className={AXIS_TEXT_CLASS}
          opacity="0.24"
        />
        <line
          x1={padLeft}
          y1={h - padBottom}
          x2={w - padRight}
          y2={h - padBottom}
          stroke="currentColor"
          className={AXIS_TEXT_CLASS}
          opacity="0.24"
        />

        {buckets.map((b, i) => {
          const hgt = (b.orders / max) * plotH;
          const x = padLeft + i * slotW + slotW * 0.2;
          const bw = slotW * 0.6;
          const label =
            b.bucket_from <= 0 && b.bucket_to <= 20
              ? "Under $20"
              : b.bucket_to >= 999 || b.bucket_from >= 80
                ? `$${b.bucket_from}+`
                : `$${b.bucket_from}–$${b.bucket_to}`;

          return (
            <g key={i}>
              <rect
                x={x}
                y={h - padBottom - hgt}
                width={bw}
                height={hgt}
                fill="#6366f1"
                rx={6}
              />
              {(i % step === 0 || i === buckets.length - 1) && (
                <text
                  x={x + bw / 2}
                  y={h - padBottom + 22}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="currentColor"
                  className={AXIS_TEXT_CLASS}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </SectionCard>
  );
}

function PricingMarginChart({
  labels,
  margin,
  discount,
}: {
  labels: string[];
  margin: (number | null)[];
  discount: (number | null)[];
}) {
  const w = 760;
  const h = 200;
  const padLeft = 84;
  const padRight = 84;
  const padTop = 18;
  const padBottom = 44;

  const clean = (arr?: (number | null)[]) =>
    (arr ?? []).map((v) => (Number.isFinite(Number(v)) ? Number(v) : null));

  const marginClean = clean(margin);
  const discountClean = clean(discount).map((v) => v ?? 0);

  const [hoveredSeries, setHoveredSeries] = React.useState<
    "margin" | "discount" | null
  >(null);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const marginMax = Math.max(
    ...marginClean.filter((v): v is number => v !== null),
    1
  );
  const discountMax = Math.max(...discountClean, 1);

  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;
  const xStep = labels.length > 1 ? plotW / labels.length : plotW;
  const barW = Math.max(12, Math.min(30, xStep * 0.56));

  const marginColor = "#10b981";
  const discountColor = "#f59e0b";

  const barPts = discountClean.map((v, i) => {
    const x = padLeft + i * xStep + (xStep - barW) / 2;
    const barH = (v / discountMax) * plotH * 0.92;
    const y = padTop + plotH - barH;
    return { x, y, v, barH };
  });

  const marginPts = marginClean.map((v, i) => {
    const x = padLeft + i * xStep + xStep / 2;
    const y =
      v === null ? null : padTop + plotH * (1 - (v * 0.92) / marginMax);
    return { x, y, v };
  });

  const marginPath = marginPts
    .map((p, i) =>
      p.y === null
        ? ""
        : `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    )
    .filter(Boolean)
    .join(" ");

  const ticks = 4;

  const yLeftTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = (marginMax / ticks) * (ticks - i);
    const y = padTop + (plotH / ticks) * i;
    return { value, y };
  });

  const yRightTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = (discountMax / ticks) * (ticks - i);
    const y = padTop + (plotH / ticks) * i;
    return { value, y };
  });

  const step = tickStep(labels.length);

  const activeIndex = hoveredIndex ?? Math.max(0, labels.length - 1);
  const activeLabel = labels[activeIndex] ?? "";
  const activeMargin = marginClean[activeIndex];
  const activeDiscount = discountClean[activeIndex] ?? 0;
  const activeSpread =
    activeMargin == null ? null : Number(activeMargin) - Number(activeDiscount);

  return (
    <SectionCard
      title="Pricing & Margin Efficiency"
      subtitle="Track discount pressure against gross margin to evaluate pricing discipline."
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-border/60 bg-background/25 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {activeLabel ? fmtShortDate(activeLabel) : "—"}
          </span>
          <span className="mx-3">•</span>
          Gross Margin:{" "}
          <span className="font-semibold text-foreground">
            {activeMargin == null ? "—" : `${activeMargin.toFixed(2)}%`}
          </span>
          <span className="mx-3">•</span>
          Discount Rate:{" "}
          <span className="font-semibold text-foreground">
            {`${activeDiscount.toFixed(2)}%`}
          </span>
          <span className="mx-3">•</span>
          Spread:{" "}
          <span className="font-semibold text-foreground">
            {activeSpread == null
              ? "—"
              : `${activeSpread >= 0 ? "+" : ""}${activeSpread.toFixed(2)} pp`}
          </span>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} className="h-[340px] w-full">
          <defs>
            <filter
              id="pricingLineGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yLeftTicks.map((t, i) => (
            <line
              key={`grid-${i}`}
              x1={padLeft}
              y1={t.y}
              x2={w - padRight}
              y2={t.y}
              stroke="currentColor"
              className={AXIS_TEXT_CLASS}
              opacity="0.18"
            />
          ))}

          {yLeftTicks.map((t, i) => (
            <g key={`left-${i}`}>
              <rect
                x={padLeft - 72}
                y={t.y - 11}
                width={62}
                height={20}
                rx={6}
                fill="rgba(255,255,255,0.14)"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 16}
                y={t.y + 4}
                textAnchor="end"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className={AXIS_TEXT_CLASS}
              >
                {t.value.toFixed(0)}%
              </text>
            </g>
          ))}

          {yRightTicks.map((t, i) => (
            <g key={`right-${i}`}>
              <rect
                x={w - padRight + 10}
                y={t.y - 11}
                width={54}
                height={20}
                rx={6}
                fill="rgba(255,255,255,0.14)"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth="1"
              />
              <text
                x={w - padRight + 18}
                y={t.y + 4}
                textAnchor="start"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className={AXIS_TEXT_CLASS}
              >
                {t.value.toFixed(0)}%
              </text>
            </g>
          ))}

          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={h - padBottom}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.24"
          />
          <line
            x1={w - padRight}
            y1={padTop}
            x2={w - padRight}
            y2={h - padBottom}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.24"
          />
          <line
            x1={padLeft}
            y1={h - padBottom}
            x2={w - padRight}
            y2={h - padBottom}
            stroke="currentColor"
            className={AXIS_TEXT_CLASS}
            opacity="0.24"
          />

          {barPts.map((p, i) => (
            <rect
              key={`bar-${i}`}
              x={p.x}
              y={p.y}
              width={barW}
              height={p.barH}
              rx={8}
              fill={discountColor}
              opacity={
                hoveredSeries === "margin"
                  ? 0.35
                  : hoveredIndex === i
                    ? 1
                    : 0.86
              }
              stroke={
                hoveredIndex === i
                  ? "rgba(255,255,255,0.28)"
                  : "rgba(255,255,255,0.08)"
              }
              strokeWidth={hoveredIndex === i ? "1.2" : "1"}
              onMouseEnter={() => {
                setHoveredSeries("discount");
                setHoveredIndex(i);
              }}
              onMouseLeave={() => {
                setHoveredSeries(null);
                setHoveredIndex(null);
              }}
            />
          ))}

          <path
            d={marginPath}
            fill="none"
            stroke={marginColor}
            strokeWidth={hoveredSeries === "margin" ? "3.6" : "2.8"}
            opacity={hoveredSeries === "discount" ? "0.45" : "0.98"}
            filter={
              hoveredSeries === "margin" ? "url(#pricingLineGlow)" : undefined
            }
          />

          {marginPts.map((p, i) =>
            p.y === null ? null : (
              <circle
                key={`margin-${i}`}
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? 4.8 : 3.4}
                fill={marginColor}
                opacity={hoveredSeries === "discount" ? 0.45 : 0.98}
                stroke={hoveredIndex === i ? "#ffffff" : "transparent"}
                strokeWidth="1.2"
                onMouseEnter={() => {
                  setHoveredSeries("margin");
                  setHoveredIndex(i);
                }}
                onMouseLeave={() => {
                  setHoveredSeries(null);
                  setHoveredIndex(null);
                }}
              />
            )
          )}

          {labels.map((label, i) => (
            <rect
              key={`hover-${i}`}
              x={padLeft + i * xStep}
              y={padTop}
              width={xStep}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {labels.map((label, i) => {
            if (i % step !== 0 && i !== labels.length - 1) return null;
            const x = padLeft + i * xStep + xStep / 2;
            return (
              <text
                key={`${label}-${i}`}
                x={x}
                y={h - padBottom + 22}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className={AXIS_TEXT_CLASS}
              >
                {fmtShortDate(label)}
              </text>
            );
          })}
        </svg>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: marginColor }}
            />
            Gross Margin %
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: discountColor }}
            />
            Discount Rate %
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

/** ---------- Alerts / Recommendations ---------- */
function severityCardClass(severity: InsightSeverity | "warn" | "risk") {
  switch (severity) {
    case "risk":
      return "border-red-500/30 bg-red-500/10";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10";
    default:
      return "border-emerald-500/30 bg-emerald-500/10";
  }
}

function priorityBadgeClass(priority: "high" | "medium" | "low") {
  switch (priority) {
    case "high":
      return "border-red-500/20 bg-red-500/10";
    case "medium":
      return "border-amber-500/20 bg-amber-500/10";
    default:
      return "border-emerald-500/20 bg-emerald-500/10";
  }
}

/** ---------- Sales Client ---------- */
export function SalesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlLocationId = searchParams.get("location_id");
  const urlDay = searchParams.get("day");

  const initialWindow = (() => {
    const raw = (searchParams.get("window") ?? "7d").toLowerCase();
    return raw === "7d" || raw === "30d" || raw === "90d" || raw === "ytd"
      ? raw
      : "7d";
  })();

  const [windowCode, setWindowCode] = React.useState<
    "7d" | "30d" | "90d" | "ytd"
  >(initialWindow);

  const [locationId, setLocationId] = React.useState<string>(
    urlLocationId && urlLocationId.trim() ? urlLocationId : "all"
  );
  const [asOf, setAsOf] = React.useState<string>(urlDay?.trim() || "");

  const [data, setData] = React.useState<SalesResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const { startRefresh, finishRefresh, failRefresh } = useRefreshState();

  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [aovBuckets, setAovBuckets] = React.useState<AovBucket[]>([]);

  React.useEffect(() => {
    const nextLocationId =
      urlLocationId && urlLocationId.trim() ? urlLocationId : "all";

    setLocationId((prev) => (prev === nextLocationId ? prev : nextLocationId));
  }, [urlLocationId]);

  React.useEffect(() => {
    if (!urlDay || !urlDay.trim()) return;
    setAsOf((prev) => (prev === urlDay ? prev : urlDay));
  }, [urlDay]);

  const updateSalesUrl = React.useCallback(
    (
      nextLocationId: string,
      nextAsOf: string,
      nextWindow?: "7d" | "30d" | "90d" | "ytd"
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      const effectiveWindow = nextWindow ?? windowCode;
      params.set("window", effectiveWindow);

      if (nextLocationId && nextLocationId !== "all") {
        params.set("location_id", nextLocationId);
      } else {
        params.delete("location_id");
      }

      if (nextAsOf && nextAsOf.trim()) {
        params.set("day", nextAsOf.trim());
      } else {
        params.delete("day");
      }

      const qs = params.toString();
      router.replace(qs ? `/restaurant/sales?${qs}` : "/restaurant/sales", {
        scroll: false,
      });
    },
    [router, searchParams, windowCode]
  );

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/restaurant/locations", {
          cache: "no-store",
        });
        const j = await r.json();
        const raw = (j.locations ?? []) as any[];

        const mapped: LocationRow[] = raw.map((x) => ({
          location_id: String(x.location_id ?? x.id ?? ""),
          location_code:
            x.location_code != null ? String(x.location_code) : undefined,
          location_name:
            x.location_name != null ? String(x.location_name) : undefined,
          name: x.name != null ? String(x.name) : undefined,
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
      if (!id || seen.has(id)) continue;
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
      if (asOf.trim()) sp.set("day", asOf.trim());
      if (locationId !== "all") sp.set("location_id", locationId);

      const salesUrl = `/api/restaurant/sales?${sp.toString()}`;
      const histUrl = `/api/restaurant/sales/aov-histogram?${sp.toString()}&bucket_size=10&max_value=200`;

      const [salesRes, histRes] = await Promise.all([
        fetch(salesUrl, { cache: "no-store" }),
        fetch(histUrl, { cache: "no-store" }),
      ]);

      const salesText = await salesRes.text();
      if (!salesRes.ok) {
        throw new Error(
          `Sales API HTTP ${salesRes.status}. BodyPreview=${salesText.slice(
            0,
            140
          )}`
        );
      }

      let salesJson: SalesResponse;
      try {
        salesJson = JSON.parse(salesText);
      } catch {
        throw new Error(
          `Sales API returned non-JSON (${salesRes.status}). BodyPreview=${salesText.slice(
            0,
            140
          )}`
        );
      }
      setData(salesJson);

      if (!histRes.ok) {
        setAovBuckets([]);
        finishRefresh();
        return;
      }

      const histText = await histRes.text();
      let histJson: any;
      try {
        histJson = JSON.parse(histText);
      } catch {
        setAovBuckets([]);
        finishRefresh();
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
        series: {
          day: [],
          revenue: [],
          orders: [],
          aov: [],
          gross_margin_pct: [],
          discount_rate_pct: [],
          dine_in: [],
          delivery: [],
          takeaway: [],
        },
        insights: {
          kpi_insights: [],
          chart_insights: [],
          alerts: [],
          recommendations: [],
        },
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

  React.useEffect(() => {
    updateSalesUrl(locationId, asOf);
  }, [locationId, asOf, updateSalesUrl]);

  const ok = Boolean(data?.ok);
  const kpis = data?.kpis ?? [];
  const insights = data?.insights ?? {
    kpi_insights: [],
    chart_insights: [],
    alerts: [],
    recommendations: [],
  };

  const series: SalesSeries = data?.series ?? {
    day: [],
    revenue: [],
    orders: [],
    aov: [],
    gross_margin_pct: [],
    discount_rate_pct: [],
    dine_in: [],
    delivery: [],
    takeaway: [],
  };

  const topItems = (data?.top_items ?? []).slice(0, 10);

  const tileKpis: RestaurantKpi[] = React.useMemo(() => {
    return (kpis ?? []).map((k) => {
      const sev = computeSeverity(k);
      const v =
        k.unit === "pct" && typeof k.value === "number"
          ? k.value / 100
          : k.value;
      return { ...(k as any), value: v, severity: sev } as RestaurantKpi;
    });
  }, [kpis]);

  const salesKpisExtended: RestaurantKpi[] = React.useMemo(() => {
    const existing = [...tileKpis];

    const ensureKpi = (
      code: string,
      label: string,
      unit: "usd" | "pct" | "days" | "ratio" | "count",
      value: number | null = null
    ) => {
      if (existing.some((k) => k.code === code)) return;
      existing.push({
        code,
        label,
        value,
        unit,
        delta: null,
        severity: "good",
        hint: "",
      } as RestaurantKpi);
    };

    ensureKpi("SALES_REVENUE_PER_DAY", "Revenue / Day", "usd", null);
    ensureKpi("SALES_CONTRIBUTION_MARGIN", "Contribution Margin", "pct", null);
    ensureKpi(
      "SALES_DISCOUNT_DRIVEN_REVENUE",
      "Discount-Driven Revenue",
      "pct",
      null
    );

    return existing;
  }, [tileKpis]);

  const tileSeriesByCode: Record<string, number[]> = React.useMemo(() => {
    const toNums = (arr: Array<number | null | undefined>) =>
      arr.map((x) => (Number.isFinite(Number(x)) ? Number(x) : 0));

    return {
      SALES_REVENUE: toNums(series.revenue ?? []),
      SALES_ORDERS: toNums(series.orders ?? []),
      SALES_AOV: toNums(series.aov ?? []),
      SALES_GROSS_MARGIN: toNums(series.gross_margin_pct ?? []).map(
        (x) => x / 100
      ),
      SALES_DISCOUNT_RATE: toNums(series.discount_rate_pct ?? []).map(
        (x) => x / 100
      ),
      SALES_REVENUE_PER_DAY: [],
      SALES_CONTRIBUTION_MARGIN: [],
      SALES_DISCOUNT_DRIVEN_REVENUE: [],
    };
  }, [series]);

  const header = (
    <SectionCard
      title="Revenue & Demand Intelligence"
      subtitle="Analyze sales performance, demand patterns, and revenue drivers."
    >
      <div className="space-y-3">
        <div className="flex items-center gap-4 pt-2 flex-wrap">
          <select
            value={locationId}
            onChange={(e) => {
              const next = e.target.value;
              setLocationId(next);
              updateSalesUrl(next, asOf);
            }}
            className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
          >
            <option value="all">All Locations</option>
            {locationsUnique.map((l) => (
              <option key={l.location_id} value={l.location_id}>
                {prettifyLocationLabel(
                  l.location_name ||
                  l.name ||
                  l.location_code ||
                  String(l.location_id)
                )}
              </option>
            ))}
          </select>

          <select
            value={windowCode}
            onChange={(e) => {
              const next = e.target.value as "7d" | "30d" | "90d" | "ytd";
              setWindowCode(next);
              updateSalesUrl(locationId, asOf, next);
            }}
            className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
          </select>

          <input
            type="date"
            value={asOf ? asOf.split("T")[0] : ""}
            onChange={(e) => {
              const selected = e.target.value;
              setAsOf(selected);
              updateSalesUrl(locationId, selected);
            }}
            onKeyDown={(e) => e.preventDefault()}
            className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
          />

          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh sales dashboard"
            className="group flex h-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
          </button>

        </div>

        {!ok && data?.error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">
            <div className="font-medium">Sales API Error</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {data.error}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );

  const salesPrimaryKpis = salesKpisExtended.filter((k) =>
    [
      "SALES_REVENUE",
      "SALES_ORDERS",
      "SALES_AOV",
      "SALES_REVENUE_PER_DAY",
    ].includes(k.code)
  );

  const salesSecondaryKpis = salesKpisExtended.filter((k) =>
    [
      "SALES_GROSS_MARGIN",
      "SALES_DISCOUNT_RATE",
      "SALES_CONTRIBUTION_MARGIN",
      "SALES_DISCOUNT_DRIVEN_REVENUE",
    ].includes(k.code)
  );

  const kpiSection = loading ? (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="Revenue & Demand">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Margin & Pricing">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </SectionCard>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard
        title="Revenue & Demand"
        subtitle="Core topline demand and transaction performance."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {salesPrimaryKpis.map((k) => (
            <RestaurantKpiTile
              key={k.code}
              kpi={k}
              series={tileSeriesByCode[k.code] ?? []}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Margin & Pricing"
        subtitle="Commercial efficiency, discount pressure, and margin quality."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {salesSecondaryKpis.map((k) => (
            <RestaurantKpiTile
              key={k.code}
              kpi={k}
              series={tileSeriesByCode[k.code] ?? []}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );


  const noDataState =
    !loading && ok && series.day.length === 0 ? (
      <SectionCard
        title="No data for selected window"
        subtitle="Try expanding the time window or adjusting the snapshot date."
      >
        <div className="text-sm text-muted-foreground">
          Sales data is not available for the current selection.
        </div>
      </SectionCard>
    ) : null;


  const performanceInsights =
    !loading && ok ? (
      <SectionCard
        title="Performance Insights"
        subtitle="What changed across revenue, demand, pricing, and mix."
      >
        {insights.kpi_insights.length || insights.chart_insights.length ? (
          <div className="space-y-3">
            {[...insights.kpi_insights, ...insights.chart_insights].map((item, i) => (
              <div
                key={`${item.code}-${i}`}
                className={`rounded-xl border p-3 ${severityCardClass(item.severity)}`}
              >
                <div className="text-sm font-semibold text-foreground">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.message}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
            No major performance shifts detected for this selection.
          </div>
        )}
      </SectionCard>
    ) : null;

  const intelligence =
    !loading && ok ? (
      <SectionCard
        title="Valora Intelligence"
        subtitle="What needs attention and what actions to take."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">
              Attention Required
            </div>
            <div className="text-xs text-muted-foreground">
              Critical alerts and exceptions across the business.
            </div>

            {insights.alerts.length ? (
              <div className="space-y-3">
                {insights.alerts.map((a, i) => (
                  <div
                    key={`${a.code}-${i}`}
                    className={`rounded-xl border p-3 ${severityCardClass(a.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {a.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {a.message}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${a.severity === "risk"
                          ? "border-red-500/20 bg-red-500/10"
                          : "border-amber-500/20 bg-amber-500/10"
                          }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No critical issues detected for this selection.
              </div>
            )}
          </div>

          <div className="space-y-3 xl:border-l xl:border-border/40 xl:pl-6">
            <div className="text-sm font-semibold text-foreground">
              Recommended Actions
            </div>
            <div className="text-xs text-muted-foreground">
              AI-driven actions prioritized for execution and impact.
            </div>

            {insights.recommendations.length ? (
              <div className="space-y-3">
                {insights.recommendations.map((r, i) => (
                  <div
                    key={`${r.code}-${i}`}
                    className="rounded-xl border border-border/60 bg-background/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {r.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.action}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {r.rationale}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityBadgeClass(
                          r.priority
                        )}`}
                      >
                        {r.priority}
                      </span>
                    </div>
                  </div>
                ))}
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
    !loading && ok && series.day.length > 0 ? (
      <>
        <SalesOrdersTrend
          title="Sales and Orders Trend"
          subtitle="Track how revenue and order volume move together over time."
          labels={series.day}
          sales={series.revenue}
          orders={series.orders}
        />

        <PricingMarginChart
          labels={series.day}
          margin={series.gross_margin_pct}
          discount={series.discount_rate_pct}
        />

        <SalesCompositionStackedChart
          labels={series.day}
          dineIn={series.dine_in ?? []}
          delivery={series.delivery ?? []}
          takeaway={series.takeaway ?? []}
        />

        <Histogram title="Order Value Distribution" buckets={aovBuckets} />
      </>
    ) : null;

  const drilldown =
    !loading && ok ? (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Top Item Performance"
          subtitle="Best-selling items by revenue contribution."
        >
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <TopItemsBarChart
              rows={(topItems ?? []).map((x) => ({
                label: x.item_name,
                revenue_num: Number(x.revenue ?? 0),
                share_pct: Number(x.share_pct ?? 0),
                quantity: Number(x.quantity ?? 0),
                gross_profit: Number(x.gross_profit ?? 0),
                gross_margin_pct: Number(x.gross_margin_pct ?? 0),
                action_flag: x.action_flag,
              }))}
              valueKey="revenue_num"
              labelKey="label"
              valueFmt={fmtUsd2}
            />
          </div>
        </SectionCard>

        <SectionCard
          title={
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Top Item Details
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Revenue, quantity, and profitability breakdown.
                </div>
              </div>

              <button
                className="h-9 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted"
                onClick={() =>
                  downloadCsv(
                    `sales_top_items_detail_${windowCode}_${locationId}.csv`,
                    topItems
                  )
                }
              >
                Download CSV
              </button>
            </div>
          }
          subtitle={null as any}
        >
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2 pr-3 text-right">Revenue</th>
                  <th className="py-2 pr-3 text-right">Profit</th>
                  <th className="py-2 pr-3 text-right">Margin</th>
                  <th className="py-2 pr-0 text-right">Flag</th>
                </tr>
              </thead>
              <tbody>
                {(topItems ?? []).length ? (
                  (topItems ?? []).map((it, idx) => {
                    const insight = getItemInsight(it);

                    return (
                      <tr
                        key={`${it.item_name}-${idx}`}
                        className="border-b border-border/60"
                      >
                        <td className="py-2 pr-3">
                          <div className="font-medium text-foreground">
                            {it.item_name}
                          </div>

                          <div
                            className={`mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${insight.color}`}
                          >
                            <span>{insight.icon}</span>
                            {insight.label}
                          </div>
                        </td>

                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {Number(it.quantity ?? 0).toFixed(0)}
                        </td>

                        <td className="py-2 pr-3 text-right font-medium text-foreground">
                          {fmtUsd2(Number(it.revenue ?? 0))}
                        </td>

                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {fmtUsd2(Number(it.gross_profit ?? 0))}
                        </td>

                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {Number(it.gross_margin_pct ?? 0).toFixed(1)}%
                        </td>

                        <td className="py-2 pr-0 text-right">
                          <span className={itemFlagBadge(it.action_flag)}>
                            {itemFlagLabel(it.action_flag)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No top item data available for selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    ) : null;

  return (
    <PageScaffold
      header={header}
      kpiSection={
        <>
          {kpiSection}
          {noDataState}
        </>
      }
      charts={charts}
      performanceInsights={performanceInsights}
      intelligence={intelligence}
      drilldown={drilldown}
    />
  );
}