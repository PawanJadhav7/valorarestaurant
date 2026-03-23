//frontend/app/restaurant/insights/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";

type AiLatestDateApi = {
  tenant_id?: string;
  latest_date?: string | null;
};

type AiInsightRow = {
  location_insight_id: number;
  as_of_date: string;
  tenant_id: string;
  location_id: number;
  insight_type: string;
  audience_type: string;
  headline: string;
  summary_text: string;
  recommendation_text?: string | null;
  top_risk_type?: string | null;
  top_action_code?: string | null;
  opportunity_type?: string | null;
  confidence_score?: number | null;
  priority_rank?: number | null;
};

type AiLocationInsightsApi = {
  tenant_id: string;
  as_of_date: string;
  audience_type: string;
  insight_type?: string | null;
  items: AiInsightRow[];
};

type LocationOpt = { id: string; label: string };

function humanizeCode(value?: string | null) {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function riskBadgeClasses(value?: string | null) {
  switch (value) {
    case "healthy":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
    case "stockout_risk":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "waste_spike":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
    case "inventory_stress":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "labor_productivity_drop":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-700 border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
  }
}

function actionBadgeClasses(value?: string | null) {
  switch (value) {
    case "maintain_current_operating_discipline":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
    case "prevent_stockouts":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "reduce_kitchen_waste":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
    case "rebalance_inventory":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
    case "optimize_staffing":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-purple-700 border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
  }
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="h-6 w-48 rounded bg-muted/40" />
        <div className="mt-2 h-4 w-72 rounded bg-muted/30" />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="h-4 w-44 rounded bg-muted/40" />
            <div className="mt-3 h-4 w-full rounded bg-muted/30" />
            <div className="mt-2 h-4 w-5/6 rounded bg-muted/30" />
            <div className="mt-4 h-8 w-52 rounded bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [latestDate, setLatestDate] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<AiInsightRow[]>([]);
  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>("all");

  const latestDateLabel = latestDate
    ? new Date(latestDate).toLocaleDateString()
    : "—";

  const fetchLocations = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/restaurant/locations", {
        cache: "no-store",
        signal,
      });
      if (!r.ok) return;

      const j = await r.json();
      const raw = (j?.locations ?? []) as any[];

      const mapped: LocationOpt[] = raw
        .map((x) => {
          const id = String(x.location_id ?? x.id ?? "");
          const code = String(x.location_code ?? x.code ?? "");
          const name = String(x.name ?? x.location_name ?? "");
          const label = code ? `${code} — ${name || "Location"}` : name || "Location";
          return { id, label };
        })
        .filter((x) => x.id);

      const seen = new Set<string>();
      const uniq: LocationOpt[] = [];
      for (const m of mapped) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        uniq.push(m);
      }

      setLocations(uniq);
    } catch (e: any) {
      if (e?.name !== "AbortError") setLocations([]);
    }
  }, []);

  const fetchLatestDate = React.useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/ai/latest-date", {
      cache: "no-store",
      signal,
    });

    if (!res.ok) {
      throw new Error(`Latest AI date HTTP ${res.status}`);
    }

    const json = (await res.json()) as AiLatestDateApi;
    setLatestDate(json?.latest_date ?? null);
  }, []);

  const fetchInsights = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!latestDate) return;

      const qs = new URLSearchParams({
        day: latestDate,
        audience_type: "operator",
      });

      const res = await fetch(`/api/ai/location-insights?${qs.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        throw new Error(`AI Insights HTTP ${res.status}`);
      }

      const json = (await res.json()) as AiLocationInsightsApi;
      const rows = json?.items ?? [];

      setInsights(
        locationId === "all"
          ? rows
          : rows.filter((row) => String(row.location_id) === String(locationId))
      );
    },
    [latestDate, locationId]
  );

  React.useEffect(() => {
    const ac = new AbortController();
    fetchLocations(ac.signal);
    return () => ac.abort();
  }, [fetchLocations]);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        await fetchLatestDate(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load latest AI snapshot");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [fetchLatestDate]);

  React.useEffect(() => {
    if (!latestDate) return;

    const ac = new AbortController();

    (async () => {
      try {
        await fetchInsights(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setErr(e?.message ?? "Failed to load AI insights");
        }
      }
    })();

    return () => ac.abort();
  }, [latestDate, fetchInsights]);

  if (loading) return <Skeleton />;

  if (err) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">AI Insights</div>
        <div className="mt-2 text-sm text-danger">{err}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="AI Insights"
        subtitle={`Persisted AI narratives with recommended actions. Snapshot available through ${latestDateLabel}.`}
      >
        <div className="flex items-center gap-2 pb-2">
          <label className="text-xs text-muted-foreground">Location</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
          >
            <option value="all">All Locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {insights.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No AI insights generated for the current snapshot.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {insights.map((row) => {
              const locationLabel =
                locations.find((l) => l.id === String(row.location_id))?.label ??
                `Location ${row.location_id}`;

              return (
                <Card key={row.location_insight_id} className="rounded-2xl">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-foreground">
                        {row.headline}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        — {locationLabel}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {row.summary_text}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {row.top_risk_type ? (
                        <span className={riskBadgeClasses(row.top_risk_type)}>
                          {humanizeCode(row.top_risk_type)}
                        </span>
                      ) : null}

                      {row.top_action_code ? (
                        <span className={actionBadgeClasses(row.top_action_code)}>
                          {humanizeCode(row.top_action_code)}
                        </span>
                      ) : null}

                      {row.opportunity_type ? (
                        <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20">
                          {humanizeCode(row.opportunity_type)}
                        </span>
                      ) : null}
                    </div>

                    {row.recommendation_text ? (
                      <div className="rounded-xl border border-border bg-background/50 p-3 text-sm text-foreground">
                        <span className="font-medium">Recommended action:</span>{" "}
                        {row.recommendation_text}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>Audience: {humanizeCode(row.audience_type)}</div>
                      <div>Insight type: {humanizeCode(row.insight_type)}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Next steps"
        subtitle="The insights layer is now connected to persisted AI outputs."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-foreground">
                KPI narratives
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Explain what changed, why it changed, and what action to take next.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-foreground">
                Driver analysis
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Extend supporting facts into deeper driver-level insight cards.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-foreground">
                Action workflows
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Add acknowledge, assign, and follow-up workflows for recommended actions.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Link
            href="/restaurant"
            className="text-sm font-semibold text-foreground hover:underline"
          >
            Back to Overview →
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}