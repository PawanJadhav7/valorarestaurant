"use client";

import * as React from "react";
import { getDeptFromKpiCode } from "@/lib/dept-registry";
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";

export type Severity = "good" | "warn" | "risk";
export type Unit = "usd" | "pct" | "days" | "ratio" | "count" | "hours";

export type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

type TileTone = Severity | "neutral";

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

function fmtPct2(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtNumber(n: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(n);
}

function badgeStyles(sev: TileTone) {
  switch (sev) {
    case "risk":
      return "border-red-500/30 bg-red-500/10 !text-foreground";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10 !text-foreground";
    case "good":
      return "border-emerald-500/30 bg-emerald-500/10 !text-foreground";
    default:
      return "border-white/15 bg-white/5 !text-foreground";
  }
}

function cardStyles(sev: TileTone) {
  switch (sev) {
    case "risk":
      return "border-red-500/20 bg-red-500/5";
    case "warn":
      return "border-amber-500/20 bg-amber-500/5";
    case "good":
      return "border-emerald-500/20 bg-emerald-500/5";
    default:
      return "border-border bg-background/30";
  }
}

function badgeLabel(sev: TileTone) {
  switch (sev) {
    case "risk":
      return "Risk";
    case "warn":
      return "Watch";
    case "good":
      return "Good";
    default:
      return "No data";
  }
}

function sparkTone(sev: TileTone, delta?: number | null) {
  const dir = deltaDirection(delta);

  function sparkTone() {
    return "text-muted-foreground/60";
  }

  switch (sev) {
    case "risk":
      return "text-rose-400";
    case "warn":
      return "text-amber-400";
    case "good":
      return "text-emerald-400";
    default:
      return "text-muted-foreground/50";
  }
}

function Sparkline({
  values,
  height = 24,
}: {
  values?: (number | null)[];
  height?: number;
}) {
  const w = 120;
  const h = height;
  const pad = 2;

  const clean = (values ?? []).map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : null
  );
  const nums = clean.filter((v): v is number => v !== null);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const span = max - min || 1;

  const xStep = clean.length > 1 ? (w - pad * 2) / (clean.length - 1) : 0;

  const pts = clean.map((v, i) => {
    const x = pad + i * xStep;
    const y =
      v === null ? null : pad + (h - pad * 2) * (1 - (v - min) / span);
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
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-[120px] opacity-85">
      {d ? (
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      ) : null}
    </svg>
  );
}

function formatValue(kpi: Kpi): string {
  if (kpi.value === null) return "—";

  switch (kpi.unit) {
    case "usd":
      return Math.abs(kpi.value) >= 1000 ? fmtUsd0(kpi.value) : fmtUsd2(kpi.value);
    case "pct":
      return fmtPct2(kpi.value);
    case "days":
      return `${fmtNumber(kpi.value)} d`;
    case "hours":
      return `${fmtNumber(kpi.value)} h`;
    case "ratio":
      return `${fmtNumber(kpi.value)}×`;
    case "count":
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(kpi.value);
    default:
      return fmtNumber(kpi.value);
  }
}

function formatDelta(kpi: Kpi): string {
  const d = kpi.delta;
  if (d === null || d === undefined || kpi.value === null) return "—";
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(2)} pp`;
}

function deltaDirection(delta?: number | null): "up" | "down" | "flat" | "none" {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return "none";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}



export function RestaurantKpiTile({
  kpi,
  series,
  locationId,
  source = "overview",
  day,
}: {
  kpi: Kpi;
  series?: number[];
  locationId?: string | number | null;
  source?: string;
  day?: string | null;
}) {
  const noData = kpi.value === null;
  const tone: TileTone = noData ? "neutral" : (kpi.severity ?? "neutral");

  const value = formatValue(kpi);
  const deltaText = formatDelta(kpi);
  const dir = deltaDirection(kpi.delta);

  const deltaArrow =
    dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "flat" ? "→" : "—";
  const spark = (series ?? []).map((x) =>
    Number.isFinite(Number(x)) ? Number(x) : null
  );

  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-sm transition group relative",
        "hover:bg-background/40",
        cardStyles(tone),
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {kpi.label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
        </div>

        <div
          className={`shrink-0 rounded-xl border px-2.5 py-1 text-[11px] font-medium ${badgeStyles(
            tone
          )}`}
        >
          {badgeLabel(tone)}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end">
        <div className="rounded-lg bg-background/40 px-2.5 py-1 text-xs font-medium text-foreground">
          <span className="mr-1 opacity-70">{deltaArrow}</span>
          {deltaText}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Link
            href={`/restaurant/valora-intelligence/alerts?source=kpi&location_id=${locationId ?? ""}&day=${day ?? ""}&kpi_code=${kpi.code}&dept=${source}`}
            title="View alerts for this metric"
            className="rounded-lg border border-border/50 bg-background/30 p-1.5 hover:bg-background/60 text-muted-foreground hover:text-foreground transition"
          >
            <Bell className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/restaurant/valora-intelligence/actions?source=kpi&location_id=${locationId ?? ""}&day=${day ?? ""}&kpi_code=${kpi.code}&dept=${source}`}
            title="View recommended actions for this metric"
            className="rounded-lg border border-border/50 bg-background/30 p-1.5 hover:bg-background/60 text-muted-foreground hover:text-foreground transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className={sparkTone(tone, kpi.delta)}>
          <Sparkline values={spark} />
        </div>
      </div>
    </div>
  );
}
