"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

export const dynamic = "force-dynamic";

function humanizeCode(code: string) {
  return (code ?? "")
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function difficultyColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score > 0.7) return "text-red-400";
  if (score > 0.4) return "text-amber-400";
  return "text-emerald-400";
}

function difficultyLabel(score: number | null) {
  if (score === null) return "Unknown";
  if (score > 0.7) return "Hard";
  if (score > 0.4) return "Medium";
  return "Easy";
}

export default function ActionsPage() {
  const searchParams = useSearchParams();
  const source     = searchParams.get("source") ?? "overview";
  const locationId = searchParams.get("location_id");
  const day        = searchParams.get("day");
  const actionCode = searchParams.get("action_code");

  const [loading, setLoading]             = React.useState(true);
  const [actions, setActions]             = React.useState<any[]>([]);
  const [briefs, setBriefs]               = React.useState<any[]>([]);
  const [opportunities, setOpportunities] = React.useState<any[]>([]);
  const [contextKpis, setContextKpis]     = React.useState<any[]>([]);
  const [error, setError]                 = React.useState<string | null>(null);
  const [asOf, setAsOf]                   = React.useState<string>(day ?? "");

  // Fetch latest date if no day param
  React.useEffect(() => {
    if (asOf.trim()) return;
    (async () => {
      try {
        const r = await fetch("/api/dashboard/latest-date", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (j?.latest_date) setAsOf(j.latest_date);
      } catch {}
    })();
  }, []);

  // Fetch ML data
  React.useEffect(() => {
    if (!asOf.trim()) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      as_of_date: asOf.trim().slice(0, 10),
      scope: source,
      limit: "20",
    });
    if (locationId) qs.set("location_id", locationId);
    (async () => {
      try {
        const r = await fetch(`/api/ml/alerts?${qs.toString()}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setActions(j?.actions ?? []);
        setBriefs(j?.briefs ?? []);
        setOpportunities(j?.opportunities ?? []);
        setContextKpis(j?.context_kpis ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load actions");
      } finally {
        setLoading(false);
      }
    })();
  }, [asOf, locationId, source]);

  const sourceLabel = source
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  // Filter to specific action if action_code param passed
  const filteredActions = actionCode
    ? actions.filter((a) => a.action_code === actionCode)
    : actions;

  const fmtPct = (v: number | null) =>
    v === null ? "—" : `${(v * 100).toFixed(0)}%`;

  return (
    <div className="space-y-4">

      {/* Header */}
      <SectionCard
        title="Recommended Actions"
        subtitle="AI-driven actions prioritized by ROI, difficulty, and time-to-impact."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Source: <span className="font-medium text-foreground">{sourceLabel}</span></span>
          <span>·</span>
          <span>Location: <span className="font-medium text-foreground">{locationId ? `#${locationId}` : "All Locations"}</span></span>
          {asOf && (
            <>
              <span>·</span>
              <span>As of: <span className="font-medium text-foreground">{asOf.slice(0, 10)}</span></span>
            </>
          )}
          <span>·</span>
          <Link
            href={`/restaurant/valora-intelligence/alerts?source=${source}${locationId ? `&location_id=${locationId}` : ""}&day=${asOf}`}
            className="rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold hover:bg-background/50"
          >
            ← View alerts
          </Link>
          <Link
            href={`/restaurant/valora-intelligence?source=${source}${locationId ? `&location_id=${locationId}` : ""}&day=${asOf}`}
            className="rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold hover:bg-background/50"
          >
            ← Back to Intelligence
          </Link>
        </div>

        {/* Context KPIs */}
        {contextKpis.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {contextKpis.map((k, i) => (
              <div key={i} className={`rounded-xl border p-3 ${k.severity === "risk" ? "border-red-500/30 bg-red-500/10" : k.severity === "warn" ? "border-amber-500/30 bg-amber-500/10" : "border-border/60 bg-background/20"}`}>
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {k.unit === "usd" ? fmtUsd(k.value) : k.unit === "pct" ? fmtPct(k.value) : k.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Loading */}
      {loading ? (
        <SectionCard title="Loading actions...">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-muted/20" />
            ))}
          </div>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Error">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</div>
        </SectionCard>
      ) : (
        <>
          {/* AI Brief */}
          {briefs.length > 0 && (
            <SectionCard
              title="AI Analysis"
              subtitle="Narrative context driving these recommendations."
            >
              {briefs.slice(0, 1).map((b, i) => (
                <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="text-sm font-semibold text-foreground">{b.headline}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.location_name}</div>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.summary_text}</div>
                  {b.recommended_actions_json?.recommendation && (
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                      {b.recommended_actions_json.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </SectionCard>
          )}

          {/* Ranked Actions */}
          <SectionCard
            title={`Action Plan ${filteredActions.length > 0 ? `(${filteredActions.length})` : ""}`}
            subtitle="Prioritized steps ranked by expected ROI and ease of execution."
          >
            {filteredActions.length ? (
              <div className="space-y-4">
                {filteredActions.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-background/20 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Priority badge */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-sm font-semibold text-foreground">
                          #{a.priority_rank ?? i + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {humanizeCode(a.action_code)}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {a.location_name}
                          </div>
                          {/* Rationale */}
                          {a.rationale_json && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {typeof a.rationale_json === "string"
                                ? a.rationale_json
                                : a.rationale_json?.summary ?? a.rationale_json?.rationale ?? ""}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="shrink-0 space-y-1 text-right">
                        {a.expected_roi !== null && (
                          <div>
                            <span className="text-xs text-muted-foreground">ROI </span>
                            <span className="text-sm font-semibold text-emerald-400">
                              +{fmtPct(a.expected_roi)}
                            </span>
                          </div>
                        )}
                        {a.time_to_impact_days !== null && (
                          <div className="text-xs text-muted-foreground">
                            {a.time_to_impact_days}d to impact
                          </div>
                        )}
                        {a.difficulty_score !== null && (
                          <div className={`text-xs font-medium ${difficultyColor(a.difficulty_score)}`}>
                            {difficultyLabel(a.difficulty_score)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action details from brief */}
                    {briefs[0]?.recommended_actions_json?.actions?.find(
                      (ba: any) => ba.action_code === a.action_code
                    ) && (() => {
                      const ba = briefs[0].recommended_actions_json.actions.find(
                        (ba: any) => ba.action_code === a.action_code
                      );
                      return (
                        <div className="mt-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                          {ba.description}
                          {ba.rationale_json?.estimated_uplift && (
                            <span className="ml-2 font-medium text-emerald-400">
                              Est. uplift: {fmtUsd(ba.rationale_json.estimated_uplift)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-6 text-center">
                <div className="text-sm font-semibold text-foreground">No actions available</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Actions will appear here once ML models detect opportunities.
                </div>
              </div>
            )}
          </SectionCard>

          {/* Profit Opportunities */}
          {opportunities.length > 0 && (
            <SectionCard
              title="Profit Opportunities"
              subtitle="Revenue and margin improvement opportunities identified."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {opportunities.map((o, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {humanizeCode(o.opportunity_type)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {o.location_name ?? `Location #${o.location_id}`}
                        </div>
                        {o.action_code && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            → {humanizeCode(o.action_code)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-400">
                          {fmtUsd(Number(o.impact_estimate ?? 0))}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. uplift</div>
                        {o.confidence_score && (
                          <div className="text-xs text-muted-foreground">
                            {fmtPct(o.confidence_score)} confidence
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/restaurant"
          className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-background/50"
        >
          ← Business Overview
        </Link>
        <Link
          href={`/restaurant/valora-intelligence/alerts?source=${source}${locationId ? `&location_id=${locationId}` : ""}&day=${asOf}`}
          className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-background/50"
        >
          View Alerts →
        </Link>
      </div>

    </div>
  );
}
