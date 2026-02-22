"use client";

import * as React from "react";

type Props = {
  latestDay?: string | null;
  lastIngestedAt?: string | null;
  rows24h?: string | null;
  lastFile?: string | null;
};

function minutesAgo(iso?: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return null;
  return Math.max(0, Math.round(diff / 60000));
}

export function DataFreshnessPill({ latestDay, lastIngestedAt, rows24h, lastFile }: Props) {
  const mins = minutesAgo(lastIngestedAt);
  const r24 = Number(rows24h ?? "0");

  const tone =
    mins !== null && mins <= 1440 && r24 > 0
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : mins !== null && mins <= 2880
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : "border-rose-400/30 bg-rose-400/10 text-rose-200";

  return (
    <span
      title={[
        `latest_day=${latestDay ?? "—"}`,
        `last_ingested_at=${lastIngestedAt ?? "—"}`,
        `rows_24h=${rows24h ?? "—"}`,
        `file=${lastFile ?? "—"}`,
      ].join(" • ")}
      className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      <span>Data</span>
      <span className="opacity-80">•</span>
      <span>{mins === null ? "—" : `${mins}m ago`}</span>
    </span>
  );
}