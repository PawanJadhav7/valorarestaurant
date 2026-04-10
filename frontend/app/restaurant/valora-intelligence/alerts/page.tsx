//frontend/app/restaurant/valora-intelligence/alerts/page.tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

type MlRisk = {
  risk_id?: string;
  location_id: number;
  location_name: string;
  risk_type: string;
  severity_band: string;
  impact_estimate: number;
  recommended_action: string;
  day?: string;
  details_json?: any;
};

type MlBrief = {
  brief_id?: string;
  location_id: number;
  location_name: string;
  headline: string;
  summary_text: string;
  recommended_actions_json?: { actions?: any[] };
  model_name?: string;
  generated_at?: string;
};

type MlOpportunity = {
  opportunity_type: string;
  location_name: string;
  impact_estimate: number;
  confidence?: number;
};

function humanizeCode(code: string) {
  return (code ?? "")
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function severityColor(band: string) {
  switch (band?.toLowerCase()) {
    case "critical": return "border-red-500/30 bg-red-500/10";
    case "high":     return "border-red-500/20 bg-red-500/8";
    case "medium":   return "border-amber-500/30 bg-amber-500/10";
    default:         return "border-border/60 bg-background/20";
  }
}

function severityBadge(band: string) {
  switch (band?.toLowerCase()) {
    case "critical": return "border-red-500/20 bg-red-500/10 text-red-400";
    case "high":     return "border-red-500/20 bg-red-500/10 text-red-400";
    case "medium":   return "border-amber-500/20 bg-amber-500/10 text-amber-400";
    default:         return "border-border/60 bg-background/20 text-muted-foreground";
  }
}

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const source     = searchParams.get("source") ?? "overview";
  const locationId = searchParams.get("location_id");
  const day        = searchParams.get("day");

  const [loading, setLoading]           = React.useState(true);
  const [risks, setRisks]               = React.useState<MlRisk[]>([]);
  const [briefs, setBriefs]             = React.useState<MlBrief[]>([]);
  const [opportunities, setOpportunities] = React.useState<MlOpportunity[]>([]);
  const [error, setError]               = React.useState<string | null>(null);
  const [asOf, setAsOf]                 = React.useState<string>(day ?? "");
  const [contextKpis, setContextKpis] = React.useState<any[]>([]);

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

  // Fetch ML insights
  React.useEffect(() => {
    if (!asOf.trim()) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ day: asOf.trim().slice(0, 10), limit: "20" });
    if (locationId) qs.set("location_id", locationId);
    (async () => {
      try {
        const r = await fetch(`/api/ml/alerts?${qs.toString()}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setRisks(j?.risks ?? []);
        setBriefs(j?.briefs ?? []);
        setOpportunities(j?.opportunities ?? []);
        setContextKpis(j?.context_kpis ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    })();
  }, [asOf, locationId]);

  const sourceLabel = source
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

  const criticalRisks = risks.filter((r) =>
    ["critical", "high"].includes(r.severity_band?.toLowerCase())
  );
  const mediumRisks = risks.filter((r) =>
    r.severity_band?.toLowerCase() === "medium"
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <SectionCard
        title="Attention Required"
        subtitle="High-priority issues requiring operator attention and immediate action."
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
            href={`/restaurant/valora-intelligence/actions?source=${source}${locationId ? `&location_id=${locationId}` : ""}&day=${asOf}`}
            className="rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold hover:bg-background/50"
          >
            View all actions →
          </Link>
          <Link
            href={`/restaurant/valora-intelligence?source=${source}${locationId ? `&location_id=${locationId}` : ""}&day=${asOf}`}
            className="rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold hover:bg-background/50"
          >
            ← Back to Intelligence
          </Link>
        </div>
      </SectionCard>

      {/* Loading */}
      {loading ? (
        <SectionCard title="Alert Feed" subtitle="Loading alerts...">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/20" />
            ))}
          </div>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Alert Feed" subtitle="">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-foreground">
            {error}
          </div>
        </SectionCard>
      ) : (
        <>
          {/* Critical + High Alerts */}
          <SectionCard
            title={`Critical Alerts ${criticalRisks.length > 0 ? `(${criticalRisks.length})` : ""}`}
            subtitle="Highest-priority issues requiring immediate action."
          >
            {criticalRisks.length ? (
              <div className="space-y-3">
                {criticalRisks.map((a, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${severityColor(a.severity_band)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityBadge(a.severity_band)}`}>
                            {a.severity_band}
                          </span>
                          <div className="text-sm font-semibold text-foreground">
                            {a.location_name} — {humanizeCode(a.risk_type)}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Est. impact: <span className="font-medium text-foreground">${Number(a.impact_estimate ?? 0).toFixed(0)}</span>
                        </div>
                        {a.recommended_action && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Recommended: <span className="text-foreground">{a.recommended_action}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {a.day?.slice(0, 10)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
                No critical alerts detected for this period. Business is operating within normal parameters.
              </div>
            )}
          </SectionCard>

          {/* Medium Alerts */}
          {mediumRisks.length > 0 && (
            <SectionCard
              title={`Watch List (${mediumRisks.length})`}
              subtitle="Medium-priority signals to monitor closely."
            >
              <div className="space-y-3">
                {mediumRisks.map((a, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${severityColor(a.severity_band)}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityBadge(a.severity_band)}`}>
                            {a.severity_band}
                          </span>
                          <div className="text-sm font-semibold text-foreground">
                            {a.location_name} — {humanizeCode(a.risk_type)}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Est. impact: <span className="font-medium text-foreground">${Number(a.impact_estimate ?? 0).toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {a.day?.slice(0, 10)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* AI Brief */}
          {briefs.length > 0 && (
            <SectionCard
              title="AI Business Brief"
              subtitle="Narrative analysis generated from current risk signals."
            >
              <div className="space-y-4">
                {briefs.map((b, i) => (
                  <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="text-sm font-semibold text-foreground">{b.headline}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{b.location_name}</div>
                    <div className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.summary_text}</div>
                    {b.recommended_actions_json?.actions?.length ? (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-medium text-foreground">Recommended actions:</div>
                        {b.recommended_actions_json.actions.map((a: any, j: number) => (
                          <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="shrink-0 text-emerald-400">→</span>
                            <span>{a.title ?? a.action_code}
                              {a.expected_roi ? ` · +${(a.expected_roi * 100).toFixed(0)}% ROI` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {b.model_name && (
                      <div className="mt-3 text-[10px] text-muted-foreground/60">
                        Generated by {b.model_name} · {b.generated_at?.slice(0, 10)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Profit Opportunities */}
          {opportunities.length > 0 && (
            <SectionCard
              title="Profit Opportunities"
              subtitle="Identified opportunities to improve revenue and margins."
            >
              <div className="space-y-3">
                {opportunities.map((o, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {humanizeCode(o.opportunity_type)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{o.location_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-400">
                          +${Number(o.impact_estimate ?? 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. uplift</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Empty state */}
          {risks.length === 0 && briefs.length === 0 && opportunities.length === 0 && (
            <SectionCard title="All Clear" subtitle="">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                <div className="text-sm font-semibold text-foreground">No active alerts</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Business is operating within normal parameters for {asOf.slice(0, 10)}.
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between">
        <Link
          href="/restaurant"
          className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-background/50"
        >
          ← Business Overview
        </Link>
        <Link
          href={`/restaurant/valora-intelligence/actions?source=${source}${locationId ? `&location_id=${locationId}` : ""}&day=${asOf}`}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
        >
          View Recommended Actions →
        </Link>
      </div>

    </div>
  );
}
