// components/restaurant/OpsDriversPanel.tsx
"use client";

import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count" | "hours";

export type OpsDriver = {
  id: string;
  domain: "labor" | "inventory";
  severity: Severity;
  title: string;
  metric_code?: string;
  metric_label?: string;
  current?: number | null;
  unit?: Unit;
  delta?: number | null;
  contribution_pct?: number;
  rationale: string;
  next_steps: string[];
};

function sevPill(sev: Severity) {
  switch (sev) {
    case "risk":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
}

function sevDot(sev: Severity) {
  switch (sev) {
    case "risk":
      return "bg-rose-400";
    case "warn":
      return "bg-amber-400";
    default:
      return "bg-emerald-400";
  }
}

function fmtUnit(unit: Unit | undefined, v: number) {
  if (!unit) return v.toFixed(2);
  if (unit === "usd") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  if (unit === "pct") return `${v.toFixed(1)}%`;
  if (unit === "days") return `${v.toFixed(1)}d`;
  if (unit === "hours") return `${v.toFixed(1)}h`;
  if (unit === "count") return `${v.toFixed(0)}`;
  return v.toFixed(2);
}

function fmtDelta(unit: Unit | undefined, d: number) {
  const sign = d > 0 ? "+" : "";
  if (unit === "pct") return `${sign}${d.toFixed(1)} pp`;
  return `${sign}${d.toFixed(1)}`;
}

function clampPct(x: number) {
  return Math.max(0, Math.min(100, x));
}

export function OpsDriversPanel({
  laborDrivers,
  inventoryDrivers,
  loading,
}: {
  laborDrivers: OpsDriver[];
  inventoryDrivers: OpsDriver[];
  loading?: boolean;
}) {
  const all = React.useMemo(() => {
    const merged = [...(laborDrivers ?? []), ...(inventoryDrivers ?? [])];
    const order = { risk: 0, warn: 1, good: 2 } as const;
    merged.sort((a, b) => {
      const oa = order[a.severity];
      const ob = order[b.severity];
      if (oa !== ob) return oa - ob;
      return (b.contribution_pct ?? 0) - (a.contribution_pct ?? 0);
    });
    return merged.slice(0, 8); // keep it executive-clean
  }, [laborDrivers, inventoryDrivers]);

  return (
    <SectionCard
      title="Drivers"
      subtitle="What’s pushing Ops up/down right now — ranked by impact. (MVP heuristic; will become model-based later.)"
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : all.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {all.map((d) => {
            const pct = clampPct(Number(d.contribution_pct ?? 0));
            const current = typeof d.current === "number" ? d.current : null;
            const delta = typeof d.delta === "number" ? d.delta : null;

            return (
              <div key={d.id} className="rounded-2xl border border-border bg-background/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${sevDot(d.severity)}`} />
                      <div className="truncate text-sm font-semibold text-foreground">{d.title}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.domain === "labor" ? "Labor" : "Inventory"}
                      {d.metric_label ? <span> • {d.metric_label}</span> : null}
                    </div>
                  </div>

                  <div className={`shrink-0 rounded-xl border px-2 py-1 text-[11px] ${sevPill(d.severity)}`}>
                    {d.severity}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Impact score
                    <span className="ml-2 font-medium text-foreground">{pct}%</span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {current !== null ? (
                      <>
                        Now: <span className="font-medium text-foreground">{fmtUnit(d.unit, current)}</span>
                      </>
                    ) : (
                      <>Now: <span className="font-medium text-foreground">—</span></>
                    )}
                    {delta !== null ? (
                      <>
                        <span className="mx-2">•</span>
                        Δ <span className="font-medium text-foreground">{fmtDelta(d.unit, delta)}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-foreground/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-3 text-xs text-muted-foreground">{d.rationale}</div>

                {d.next_steps?.length ? (
                  <div className="mt-3 space-y-1">
                    {d.next_steps.slice(0, 3).map((s, idx) => (
                      <div key={idx} className="text-xs text-foreground/90">
                        <span className="mr-2 text-muted-foreground">•</span>
                        {s}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
          No drivers available yet. Once Labor/Inventory KPIs are present, we’ll rank the top contributors here.
        </div>
      )}
    </SectionCard>
  );
}