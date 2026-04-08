"use client";

import * as React from "react";
import { RefreshCcw } from "lucide-react";
import { getLocationDisplayName } from "@/lib/location-label";

export type DateRange = "7d" | "30d" | "90d" | "ytd";

export type LocationOpt = {
  id:             string;
  location_id:    string;
  location_code?: string;
  location_name?: string;
  name?:          string;
  city?:          string;
  region?:        string;
};

interface DashboardFiltersProps {
  // Location
  locations:      LocationOpt[];
  locationId:     string;
  onLocationChange: (locationId: string) => void;

  // Date range
  dateRange:      DateRange;
  onDateRangeChange: (range: DateRange) => void;

  // Insight date
  insightDate:    string | null;
  onDateChange:   (date: string) => void;

  // Refresh
  onRefresh:      () => void;
  loading?:       boolean;

  // Optional label above filters
  label?:         string;
}

export function DashboardFilters({
  locations,
  locationId,
  onLocationChange,
  dateRange,
  onDateRangeChange,
  insightDate,
  onDateChange,
  onRefresh,
  loading = false,
  label,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {label && (
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}

      {/* Location dropdown */}
      <select
        title="Select location"
        aria-label="Select location"
        value={locationId}
        onChange={(e) => onLocationChange(e.target.value)}
        className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
      >
        <option value="all">All Locations</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {getLocationDisplayName(l)}
          </option>
        ))}
      </select>

      {/* Date range dropdown */}
      <select
        title="Select date range"
        aria-label="Select date range"
        value={dateRange}
        onChange={(e) => {
          const range = e.target.value as DateRange;
          onDateRangeChange(range);
        }}
        className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
      >
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="90d">Last 90 Days</option>
        <option value="ytd">Year to Date</option>
      </select>

      {/* Date picker */}
      <input
        type="date"
        title="Select insight date"
        aria-label="Select insight date"
        value={insightDate ? String(insightDate).slice(0, 10) : ""}
        onChange={(e) => {
          if (e.target.value) onDateChange(e.target.value);
        }}
        onKeyDown={(e) => e.preventDefault()}
        className="h-10 rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-foreground/20 hover:bg-background/60"
      />

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh dashboard"
        className="group flex h-10 items-center justify-center rounded-2xl border border-border/60 bg-background/40 px-4 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-background/60 disabled:opacity-50"
      >
        <RefreshCcw
          className={`h-4 w-4 ${
            loading
              ? "animate-spin"
              : "transition-transform duration-300 group-hover:rotate-180"
          }`}
        />
      </button>
    </div>
  );
}
