"use client";
import * as React from "react";
import { getDeptFromSource, DEPARTMENTS } from "@/lib/dept-registry";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Sparkles, CheckCircle, Clock, ChevronRight, AlertTriangle, TrendingDown, Package, Users, Settings } from "lucide-react";
import { SectionCard } from "@/components/valora/SectionCard";

type MlRisk = {
  location_id: number;
  location_name: string;
  risk_type: string;
  severity_band: string;
  severity_score: number;
  impact_estimate: number;
  recommended_action?: string;
  day?: string;
};

type MlBrief = {
  location_id: number;
  location_name: string;
  headline: string;
  summary_text: string;
  recommended_actions_json?: any;
  model_name?: string;
};

function humanizeCode(code: string) {
  return (code ?? "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function severityConfig(band: string) {
  switch (band?.toLowerCase()) {
    case "critical": return {
      bg: "bg-red-500/8 border-red-500/25",
      badge: "bg-red-500/15 text-red-400 border-red-500/20",
      dot: "bg-red-400",
      emoji: "🔴",
      label: "Critical",
      urgency: "Immediate action required",
      textColor: "text-red-400",
    };
    case "high": return {
      bg: "bg-amber-500/8 border-amber-500/25",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      dot: "bg-amber-400",
      emoji: "🟡",
      label: "High",
      urgency: "Action recommended today",
      textColor: "text-amber-400",
    };
    case "medium":
    case "watch": return {
      bg: "bg-blue-500/8 border-blue-500/25",
      badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      dot: "bg-blue-400",
      emoji: "🔵",
      label: "Watch",
      urgency: "Monitor this metric",
      textColor: "text-blue-400",
    };
    default: return {
      bg: "bg-background/20 border-border/60",
      badge: "bg-muted text-muted-foreground border-border",
      dot: "bg-muted-foreground",
      emoji: "⚪",
      label: "Info",
      urgency: "",
      textColor: "text-muted-foreground",
    };
  }
}

function riskIcon(risk_type: string) {
  if (risk_type?.includes("revenue") || risk_type?.includes("sales"))
    return <TrendingDown className="h-4 w-4" />;
  if (risk_type?.includes("inventory") || risk_type?.includes("waste"))
    return <Package className="h-4 w-4" />;
  if (risk_type?.includes("labor") || risk_type?.includes("workforce"))
    return <Users className="h-4 w-4" />;
  return <Settings className="h-4 w-4" />;
}

function RiskCard({ risk, asOf, source, locationId, onResolve, onSnooze }: {
  risk: MlRisk;
  asOf: string;
  source: string;
  locationId: string | null;
  onResolve: (risk: MlRisk) => void;
  onSnooze: (risk: MlRisk) => void;
}) {
  const cfg = severityConfig(risk.severity_band);
  const actionsHref = `/restaurant/valora-intelligence/actions?source=alert&location_id=${risk.location_id}&day=${asOf}&risk_type=${encodeURIComponent(risk.risk_type)}`;

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-sm ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Severity dot */}
          <div className="mt-1 flex-shrink-0">
            <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot} animate-pulse`} />
          </div>

          <div className="min-w-0">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
                {cfg.emoji} {cfg.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                {riskIcon(risk.risk_type)}
                {humanizeCode(risk.risk_type)}
              </span>
            </div>

            {/* Location + urgency */}
            <div className="text-sm font-semibold text-foreground">
              {risk.location_name}
            </div>
            {cfg.urgency && (
              <div className={`text-xs mt-0.5 ${cfg.textColor}`}>
                {cfg.urgency}
              </div>
            )}

            {/* Recommended action */}
            {risk.recommended_action && (
              <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                → {risk.recommended_action}
              </div>
            )}

            {/* Date */}
            {risk.day && (
              <div className="mt-2 text-[10px] text-muted-foreground/60">
                Detected: {risk.day.slice(0, 10)}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {/* Impact */}
          <div className="rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Impact</div>
            <div className="text-sm font-bold text-foreground">{fmtUsd(Number(risk.impact_estimate ?? 0))}</div>
          </div>

          {/* Actions */}
          <Link
            href={actionsHref}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${cfg.badge}`}
          >
            <Sparkles className="h-3 w-3" />
            View Actions
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border/20 pt-3">
        <button
          onClick={() => onResolve(risk)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/10"
        >
          <CheckCircle className="h-3 w-3" />
          Mark Resolved
        </button>
        <button
          onClick={() => onSnooze(risk)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/20 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-background/40"
        >
          <Clock className="h-3 w-3" />
          Snooze
        </button>
        <div className="ml-auto text-[10px] text-muted-foreground/50">
          Score: {(Number(risk.severity_score ?? 0) * 100).toFixed(0)}
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const source     = searchParams.get("source") ?? "overview";
  const locationId = searchParams.get("location_id");
  const day        = searchParams.get("day");
  const kpiCode    = searchParams.get("kpi_code");
  const kpiLabel   = searchParams.get("kpi_label");
  const riskType   = searchParams.get("risk_type");

  const [loading, setLoading]   = React.useState(true);
  const [risks, setRisks]       = React.useState<MlRisk[]>([]);
  const [briefs, setBriefs]     = React.useState<MlBrief[]>([]);
  const [error, setError]       = React.useState<string | null>(null);
  const [asOf, setAsOf]         = React.useState<string>(day ?? "");
  const [locationName, setLocationName] = React.useState<string>(
    locationId ? `Location ${locationId}` : "All Locations"
  );
  const [resolved, setResolved] = React.useState<Set<string>>(new Set());
  const [snoozed, setSnoozed]   = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (asOf.trim()) return;
    (async () => {
      try {
        const r = await fetch("/api/dashboard/latest-date", { cache: "no-store" });
        const j = await r.json();
        if (j?.latest_date) setAsOf(j.latest_date);
      } catch {}
    })();
  }, []);

  // Fetch location name
  React.useEffect(() => {
    if (!locationId) return;
    (async () => {
      try {
        const r = await fetch("/api/restaurant/locations", { cache: "no-store" });
        const j = await r.json();
        const loc = (j?.locations ?? []).find((l: any) => String(l.location_id) === String(locationId));
        if (loc?.location_name) setLocationName(loc.location_name);
      } catch {}
    })();
  }, [locationId]);

  React.useEffect(() => {
    if (!asOf.trim()) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ as_of_date: asOf.trim().slice(0, 10), limit: "30" });
    if (locationId) qs.set("location_id", locationId);
    (async () => {
      try {
        const r = await fetch(`/api/ml/alerts?${qs.toString()}`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        let fetchedRisks = j?.risks ?? [];
        // Filter by risk_type if coming from specific alert
        if (riskType) {
          fetchedRisks = fetchedRisks.filter((r: MlRisk) => r.risk_type === riskType);
        }
        setRisks(fetchedRisks);
        setBriefs(j?.briefs ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    })();
  }, [asOf, locationId, riskType]);

  const riskKey = (r: MlRisk) => `${r.location_id}-${r.risk_type}-${r.day}`;

  const handleResolve = (risk: MlRisk) => {
    setResolved((prev) => new Set([...prev, riskKey(risk)]));
    // TODO: call /api/whatif/feedback with response='actioned'
  };

  const handleSnooze = (risk: MlRisk) => {
    setSnoozed((prev) => new Set([...prev, riskKey(risk)]));
  };

  const visibleRisks = risks.filter(
    (r) => !resolved.has(riskKey(r)) && !snoozed.has(riskKey(r))
  );

  const criticalRisks = visibleRisks.filter((r) =>
    ["critical", "high"].includes(r.severity_band?.toLowerCase())
  );
  const watchRisks = visibleRisks.filter((r) =>
    !["critical", "high"].includes(r.severity_band?.toLowerCase())
  );

  const totalImpact = visibleRisks.reduce(
    (sum, r) => sum + Number(r.impact_estimate ?? 0), 0
  );



  // Resolve dept from URL params using central registry
  const deptParam = searchParams.get("dept");
  const deptInfo = getDeptFromSource(deptParam ?? source, kpiLabel);
  const sourceDept = deptInfo.url;
  const sourceDeptLabel = deptInfo.label;

  const locationLabel = locationName;
  
  const sourceLabel = kpiLabel
    ? (() => { try { return decodeURIComponent(kpiLabel); } catch { return kpiLabel; } })()
    : source === "kpi" ? "KPI Dashboard"
    : source === "alert" ? "Alert"
    : source === "overview" ? "Business Overview"
    : source.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());


  return (
    <div className="space-y-4">

      {/* Header */}
      <SectionCard
        title="Attention Required"
        subtitle="High-priority issues requiring operator attention and immediate action."
      >
        {/* Context bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
          <span className="rounded-lg border border-border/40 bg-background/30 px-2.5 py-1 font-medium text-foreground">
            📍 {locationLabel}
          </span>
          {asOf && (
            <>
              <span>·</span>
              <span className="rounded-lg border border-border/40 bg-background/30 px-2.5 py-1 font-medium text-foreground">
                📅 {asOf.slice(0, 10)}
              </span>
            </>
          )}
          <span>·</span>
          <span className="rounded-lg border border-border/40 bg-background/30 px-2.5 py-1 font-medium text-foreground">
            📅 Last 30 days
          </span>
          {kpiCode && (
            <>
              <span>·</span>
              <span className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 font-medium text-blue-400">
                📊 {humanizeCode(kpiCode)}
              </span>
            </>
          )}
          {riskType && (
            <>
              <span>·</span>
              <span className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 font-medium text-amber-400">
                ⚠️ {humanizeCode(riskType)}
              </span>
            </>
          )}
        </div>

        {/* Summary bar */}
        {!loading && visibleRisks.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/40 bg-background/20 p-3 text-center">
              <div className="text-lg font-bold text-foreground">{visibleRisks.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Alerts</div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
              <div className="text-lg font-bold text-red-400">{criticalRisks.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Critical/High</div>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{watchRisks.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Watch</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <div className="text-lg font-bold text-amber-400">{fmtUsd(totalImpact)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Impact</div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <div className="mt-4 flex flex-wrap items-center gap-2">

        </div>
      </SectionCard>

      {/* Loading */}
      {loading ? (
        <SectionCard title="Loading alerts...">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-muted/20" />
            ))}
          </div>
        </SectionCard>
      ) : error ? (
        <SectionCard title="Error">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-foreground">{error}</div>
        </SectionCard>
      ) : (
        <>
          {/* Critical + High */}
          {criticalRisks.length > 0 && (
            <SectionCard
              title={`Critical & High Priority (${criticalRisks.length})`}
              subtitle="These issues require immediate attention today."
            >
              <div className="space-y-3">
                {criticalRisks.map((r, i) => (
                  <RiskCard
                    key={i}
                    risk={r}
                    asOf={asOf}
                    source={source}
                    locationId={locationId}
                    onResolve={handleResolve}
                    onSnooze={handleSnooze}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Watch list */}
          {watchRisks.length > 0 && (
            <SectionCard
              title={`Watch List (${watchRisks.length})`}
              subtitle="Monitor these signals closely — no immediate action needed."
            >
              <div className="space-y-3">
                {watchRisks.map((r, i) => (
                  <RiskCard
                    key={i}
                    risk={r}
                    asOf={asOf}
                    source={source}
                    locationId={locationId}
                    onResolve={handleResolve}
                    onSnooze={handleSnooze}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Resolved/Snoozed summary */}
          {(resolved.size > 0 || snoozed.size > 0) && (
            <SectionCard title="Session Activity">
              <div className="flex gap-4 text-sm text-muted-foreground">
                {resolved.size > 0 && (
                  <span className="text-emerald-400">
                    ✓ {resolved.size} resolved this session
                  </span>
                )}
                {snoozed.size > 0 && (
                  <span>⏰ {snoozed.size} snoozed</span>
                )}
              </div>
            </SectionCard>
          )}

          {/* AI Brief */}
          {briefs.length > 0 && (
            <SectionCard
              title="AI Business Brief"
              subtitle="Narrative analysis generated from current risk signals."
            >
              {briefs.slice(0, 1).map((b, i) => (
                <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="text-sm font-semibold text-foreground">{b.headline}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.location_name}</div>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.summary_text}</div>
                  {b.model_name && (
                    <div className="mt-3 text-[10px] text-muted-foreground/50">
                      Generated by {b.model_name}
                    </div>
                  )}
                </div>
              ))}
            </SectionCard>
          )}

          {/* All clear */}
          {visibleRisks.length === 0 && briefs.length === 0 && (
            <SectionCard title="No Alerts Detected">
              <div className="rounded-2xl border border-border/40 bg-background/20 p-8 text-center min-h-[410px] flex flex-col items-center justify-center gap-3">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-semibold text-foreground">
                  No active alerts for {asOf.slice(0, 10)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  All metrics are within normal range for {locationLabel}.
                  Check back after the next insight run.
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Link
          href={sourceDept}
          className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-background/50"
        >
          ← {sourceDeptLabel}
        </Link>
        <Link
          href={`/restaurant/valora-intelligence/actions?source=${source}&location_id=${locationId ?? ""}&day=${asOf}&kpi_code=${kpiCode ?? ""}`}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
        >
          <Sparkles className="h-4 w-4" />
          View Recommended Actions →
        </Link>
      </div>
    </div>
  );
}
