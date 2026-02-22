"use client";

import * as React from "react";
// Update the import path to the correct relative location
// import { SeverityPill } from "../finance/SeverityPill";
import { SeverityPill } from "../valora/SeverityPill";

type Severity = "good" | "warn" | "risk";

export function KpiTile({
  label,
  value,
  delta,
  helper,
  severity,
  rightSlot,
  onClick,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  helper?: React.ReactNode;
  severity?: Severity;
  rightSlot?: React.ReactNode; // small thing in top-right (pill/sparkline/icon)
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";

  return (
    <div
      onClick={onClick}
      className={[
        "rounded-2xl border border-border bg-card p-4",
        clickable ? "cursor-pointer hover:bg-muted/20 transition" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-muted-foreground">{label}</div>

        <div className="flex items-center gap-2">
          {severity ? <SeverityPill value={severity} /> : null}
          {rightSlot}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{delta ?? "—"}</div>
      </div>

      {helper ? <div className="mt-2 text-[11px] text-muted-foreground">{helper}</div> : null}
    </div>
  );
}