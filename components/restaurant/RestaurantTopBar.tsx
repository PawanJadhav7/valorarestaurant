// components/restaurant/RestaurantTopBar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/valora/PageHeader";
import { DataFreshnessPill } from "@/components/restaurant/DataFreshnessPill";

export type LocationOpt = { id: string; name: string; rows: number };

export type DataStatus = {
  ok: boolean;
  latest_day: string | null;
  last_ingested_at: string | null;
  rows_24h?: string | null;
  last_source_file?: string | null;
};

type Props = {
  title: string;
  subtitle: React.ReactNode;
  locations: LocationOpt[];
  locationId: string;
  onLocationChange: (next: string) => void;

  // optional: show data health + freshness
  status?: DataStatus | null;

  // optional: show actions (defaults to Data + Ops)
  showActions?: boolean;
};

export function RestaurantTopBar({
  title,
  subtitle,
  locations,
  locationId,
  onLocationChange,
  status,
  showActions = true,
}: Props) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      meta={
        status ? (
          <DataFreshnessPill
            latestDay={status.latest_day}
            lastIngestedAt={status.last_ingested_at}
            rows24h={status.rows_24h ?? null}
            lastFile={status.last_source_file ?? null}
          />
        ) : null
      }
      right={
        <div className="flex flex-wrap items-center gap-2">
          {/* Location selector */}
          <select
            value={locationId}
            onChange={(e) => onLocationChange(e.target.value)}
            className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring/40"
            aria-label="Select location"
          >
            <option value="all">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* {showActions ? (
            <>
              <Link
                href="/restaurant/data"
                className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
              >
                Data →
              </Link>

              <Link
                href="/restaurant/ops"
                className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
              >
                Ops →
              </Link>
            </>
          ) : null} */}
        </div>
      }
    />
  );
}