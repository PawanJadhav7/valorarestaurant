// components/restaurant/KpiTile.tsx
"use client";

import * as React from "react";

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

function fmtUsd0(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtUsd2(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
function fmtPct2(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtNumber(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function sevBadge(sev: Severity | undefined) {
  switch (sev) {
    case "risk":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
}

function cardBg(sev: Severity | undefined) {
  switch (sev) {
    case "risk":
      return "border-red-500/20 bg-red-500/5";
    case "warn":
      return "border-amber-500/20 bg-amber-500/5";
    default:
      return "border-emerald-500/20 bg-emerald-500/5";
  }
}

function Sparkline({ values, height = 22 }: { values?: (number | null)[]; height?: number }) {
  const w = 120;
  const h = height;
  const pad = 2;

  const clean = (values ?? []).map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  const nums = clean.filter((v): v is number => v !== null);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const span = max - min || 1;

  const xStep = clean.length > 1 ? (w - pad * 2) / (clean.length - 1) : 0;

  const pts = clean.map((v, i) => {
    const x = pad + i * xStep;
    const y = v === null ? null : pad + (h - pad * 2) * (1 - (v - min) / span);
    return { x, y };
  });

  const d = pts
    .map((p, i) => {
      if (p.y === null) return "";
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[22px] w-[120px] opacity-80">
      {d ? <path d={d} fill="none" stroke="currentColor" strokeWidth="2" /> : null}
    </svg>
  );
}

function formatValue(kpi: Kpi): string {
  if (kpi.value === null) return "—";

  switch (kpi.unit) {
    case "usd":
      // use 0dp for big money, 2dp otherwise
      return Math.abs(kpi.value) >= 1000 ? fmtUsd0(kpi.value) : fmtUsd2(kpi.value);
    case "pct":
      // overview API uses pct as 0..1 (your route converts DB 0..100 to 0..1)
      return fmtPct2(kpi.value);
    case "days":
      return `${fmtNumber(kpi.value)} d`;
    case "ratio":
      return `${fmtNumber(kpi.value)}×`;
    case "count":
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(kpi.value);
    default:
      return fmtNumber(kpi.value);
  }
}

function formatDelta(kpi: Kpi): string {
  const d = kpi.delta;
  if (d === null || d === undefined) return "—";
  const sign = d > 0 ? "+" : "";

  // For overview, you mostly have null deltas today, but keep compatible.
  // If later you pass pct delta as fraction -> show %.
  if (kpi.unit === "pct") return `${sign}${(d * 100).toFixed(2)} pp`;
  return `${sign}${d.toFixed(2)}%`;
}

export function RestaurantKpiTile({ kpi, series }: { kpi: Kpi; series?: number[] }) {
  const sev = kpi.severity ?? "good";
  const value = formatValue(kpi);
  const deltaText = formatDelta(kpi);

  // series is number[]; convert to nullable for sparkline safety
  const spark = (series ?? []).map((x) => (Number.isFinite(Number(x)) ? Number(x) : null));

  return (
    <div className={`rounded-2xl border p-4 ${cardBg(sev)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{kpi.label}</div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
        </div>

        <div className={`shrink-0 rounded-xl border px-2 py-1 text-[11px] ${sevBadge(sev)}`}>
          {sev}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground line-clamp-2">{kpi.hint ?? ""}</div>
        <div className="text-xs font-medium text-foreground">{deltaText}</div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">trend</div>
        <div className="text-foreground">
          <Sparkline values={spark} />
        </div>
      </div>
    </div>
  );
}