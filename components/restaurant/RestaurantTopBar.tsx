// components/restaurant/RestaurantTopBar.tsx
"use client";

import * as React from "react";
import { PageHeader } from "@/components/valora/PageHeader";
import { DataFreshnessPill } from "@/components/restaurant/DataFreshnessPill";

export type LocationOpt = {
  id: string;
  name: string;
  rows?: number;
  location_code?: string;
};

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

  status?: DataStatus | null;
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
  const uniqueLocations = React.useMemo(() => {
    const seen = new Set<string>();
    const out: LocationOpt[] = [];

    for (const l of locations ?? []) {
      const id = String((l as any)?.id ?? (l as any)?.location_id ?? "");
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      out.push({
        id,
        name: String((l as any)?.name ?? "Location"),
        rows: (l as any)?.rows ?? undefined,
        location_code: String((l as any)?.location_code ?? ""),
      });
    }

    // stable ordering (by location_code then name)
    out.sort((a, b) => {
      const ac = (a.location_code ?? "").toUpperCase();
      const bc = (b.location_code ?? "").toUpperCase();
      if (ac && bc && ac !== bc) return ac.localeCompare(bc);
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return out;
  }, [locations]);

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
          <select
            value={locationId}
            onChange={(e) => onLocationChange(e.target.value)}
            className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring/40"
            aria-label="Select location"
          >
            <option key="all" value="all">
              All locations
            </option>

            {uniqueLocations.map((l) => {
              const label = l.location_code ? `${l.location_code} — ${l.name}` : l.name;
              return (
                <option key={`loc-${l.id}`} value={l.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      }
    />
  );
}