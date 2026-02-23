// components/restaurant/KpiTile.tsx
"use client";

import * as React from "react";
import { Glass } from "@/components/ui/Glass";

export type Severity = "good" | "warn" | "risk";
export type Unit = "usd" | "pct" | "days" | "ratio" | "count";

export type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

function fmt(unit: Unit, v: number | null) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (unit === "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(v);
  }
  if (unit === "pct") return `${(v * 100).toFixed(1)}%`;
  if (unit === "ratio") return `${v.toFixed(2)}×`;
  if (unit === "days") return `${v.toFixed(1)}d`;
  return new Intl.NumberFormat("en-US").format(v);
}

function fmtDelta(unit: Unit, d?: number | null) {
  if (d === null || d === undefined || !Number.isFinite(d)) return null;
  const sign = d > 0 ? "+" : "";
  if (unit === "usd") {
    return `${sign}${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(d)}`;
  }
  if (unit === "pct") return `${sign}${(d * 100).toFixed(1)} pp`;
  if (unit === "ratio") return `${sign}${d.toFixed(2)}×`;
  if (unit === "days") return `${sign}${d.toFixed(1)}d`;
  return `${sign}${d}`;
}

function sevPill(sev: Severity) {
  // Uses built-in Tailwind colors so you *will* see it.
  if (sev === "risk") {
    return "border-red-500/35 bg-red-500/12 text-red-600 dark:text-red-400";
  }
  if (sev === "warn") {
    return "border-amber-400/40 bg-amber-400/12 text-amber-600 dark:text-amber-300";
  }
  return "border-emerald-500/35 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400";
}

function MiniSparkline({ values }: { values?: number[] }) {
  const w = 70;
  const h = 28;
  const pad = 2;

  const safe = (values ?? []).filter((n) => Number.isFinite(n));
  if (safe.length < 2) return <div className="h-7 w-[120px] rounded bg-muted/30" />;

  const min = Math.min(...safe);
  const max = Math.max(...safe);

  const x = (i: number) => (i * (w - 2 * pad)) / Math.max(1, safe.length - 1) + pad;
  const y = (v: number) => {
    const t = (v - min) / (max - min || 1);
    return pad + (1 - t) * (h - 2 * pad);
  };

  const d = safe
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-[120px] text-muted-foreground">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.25" opacity="0.9" />
    </svg>
  );
}

export function RestaurantKpiTile({ kpi, series }: { kpi: Kpi; series?: number[] }) {
  const sev: Severity = kpi.severity ?? "good";

  return (
    <Glass className="p-4">
      <div className="flex items-start justify-between gap-3">
        {/* LEFT */}
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{kpi.label}</div>

          <div className="mt-1 flex items-baseline gap-2 min-w-0">
            <div className="text-2xl font-semibold text-foreground whitespace-nowrap">
              {fmt(kpi.unit, kpi.value)}
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {fmtDelta(kpi.unit, kpi.delta) ?? "—"}
            </div>
          </div>

          {kpi.hint ? (
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{kpi.hint}</div>
          ) : null}
        </div>

        {/* RIGHT */}
        <div className="flex-shrink-0 w-[140px] flex flex-col items-end gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
              sevPill(sev),
            ].join(" ")}
          >
            {sev === "good" ? "GOOD" : sev === "warn" ? "MODERATE" : "SEVERE"}
          </span>

          {Array.isArray(series) && series.length >= 2 ? (
            <MiniSparkline values={series} />
          ) : (
            <div className="h-7 w-[120px] rounded bg-muted/30" />
          )}
        </div>
      </div>
    </Glass>
  );
}