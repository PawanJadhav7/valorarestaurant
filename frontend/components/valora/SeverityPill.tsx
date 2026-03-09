"use client";

import * as React from "react";

type Severity = "good" | "warn" | "risk";

export function SeverityPill({ value }: { value: Severity }) {
  const cls =
    value === "risk"
      ? "border-danger/30 bg-danger/10 text-danger"
      : value === "warn"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
      : "border-success/30 bg-success/10 text-success";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {value.toUpperCase()}
    </span>
  );
}