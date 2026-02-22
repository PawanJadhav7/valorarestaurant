// components/restaurant/DataHealthDot.tsx
"use client";

import * as React from "react";

type Props = {
  latestDay?: string | null;        // e.g. "2026-02-19T05:00:00.000Z"
  lastIngestedAt?: string | null;   // e.g. "2026-02-20T01:30:38.351Z"
  rows24h?: string | number | null; // e.g. "2"
  className?: string;

  /**
   * Restaurant-friendly defaults:
   * - Green if latest_day is today or yesterday OR rows_24h > 0
   * - Amber if latest_day is within last 3 days
   * - Red otherwise / missing
   */
  greenDays?: number; // default 1
  amberDays?: number; // default 3
};

function daysDiffFromToday(dateIso: string) {
  // compare date-only (local) to avoid time-of-day issues
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return null;

  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((a - b) / 86400000); // days ago (0 = today, 1 = yesterday)
}

function toInt(v: Props["rows24h"]) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function DataHealthDot({
  latestDay,
  lastIngestedAt,
  rows24h,
  className = "",
  greenDays = 1,
  amberDays = 3,
}: Props) {
  const rows = toInt(rows24h);
  const dayAge = latestDay ? daysDiffFromToday(latestDay) : null;

  // Decide status
  const status: "green" | "amber" | "red" = (() => {
    // If we ingested anything in last 24h, consider it healthy for daily-batch restaurants
    if (rows > 0) return "green";

    if (dayAge === null) return "red";
    if (dayAge <= greenDays) return "green";
    if (dayAge <= amberDays) return "amber";
    return "red";
  })();

  const label =
    status === "green"
      ? "Data healthy"
      : status === "amber"
      ? "Data stale (watch)"
      : "Data stale (action)";

  const dotCls =
    status === "green"
      ? "bg-emerald-400"
      : status === "amber"
      ? "bg-amber-400"
      : "bg-rose-400";

  const ringCls =
    status === "green"
      ? "bg-emerald-400/20"
      : status === "amber"
      ? "bg-amber-400/20"
      : "bg-rose-400/15";

  // Animation policy:
  // - Green: heartbeat (active, healthy)
  // - Amber: slow pulse (warning)
  // - Red: no animation (don’t “celebrate” broken data)
  const ringAnim =
    status === "green"
      ? "animate-[pulseRing_1.35s_ease-out_infinite]"
      : status === "amber"
      ? "animate-[pulseRing_2.4s_ease-out_infinite]"
      : "";

  const dotAnim = status === "green" ? "animate-[heartBeat_1.35s_ease-in-out_infinite]" : "";

  const meta =
    latestDay || lastIngestedAt
      ? `latest_day=${latestDay ?? "—"}, last_ingested_at=${lastIngestedAt ?? "—"}`
      : "No data yet";

  return (
    <>
      <span
        className={[
          "relative inline-flex h-3 w-3 items-center justify-center",
          className,
        ].join(" ")}
        title={`${label}\n${meta}`}
        aria-label={label}
        role="img"
      >
        {/* ring */}
        <span
          className={[
            "absolute inset-0 rounded-full",
            ringCls,
            ringAnim,
          ].join(" ")}
        />
        {/* dot */}
        <span className={["relative h-2 w-2 rounded-full", dotCls, dotAnim].join(" ")} />
      </span>

      {/* keyframes */}
      <style jsx global>{`
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.55; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          20%      { transform: scale(1.05); }
          35%      { transform: scale(0.92); }
          50%      { transform: scale(1.10); }
          70%      { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\$begin:math:display$pulseRing\_1\\\\\.35s\_ease\-out\_infinite\\$end:math:display$,
          .animate-\$begin:math:display$pulseRing\_2\\\\\.4s\_ease\-out\_infinite\\$end:math:display$,
          .animate-\$begin:math:display$heartBeat\_1\\\\\.35s\_ease\-in\-out\_infinite\\$end:math:display$ {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}