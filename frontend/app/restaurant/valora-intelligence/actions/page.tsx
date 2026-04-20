"use client";
import * as React from "react";
import { getDeptFromSource, DEPARTMENTS } from "@/lib/dept-registry";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, Scale, Leaf, ChevronRight, Zap, Clock, TrendingUp, Eye } from "lucide-react";
import { SectionCard } from "@/components/valora/SectionCard";

function humanizeCode(code: string) {
  return (code ?? "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtPct(v: number | null) {
  return v === null ? "—" : `${(v * 100).toFixed(0)}%`;
}

type Action = {
  action_code: string;
  priority_rank: number;
  expected_roi: number | null;
  difficulty_score: number | null;
  time_to_impact_days: number | null;
  rationale_json: any;
  location_id: number;
  location_name: string;
  day: string;
};

type Tier = {
  rank: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  badgeColor: string;
  iconColor: string;
};

const TIERS: Tier[] = [
  {
    rank: 1,
    label: "Best",
    sublabel: "Highest ROI · Most Impact",
    icon: <Trophy className="h-4 w-4" />,
    borderColor: "border-emerald-500/30",
    bgColor: "bg-emerald-500/5",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    rank: 2,
    label: "Moderate",
    sublabel: "Balanced · Quick Win",
    icon: <Scale className="h-4 w-4" />,
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/5",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    rank: 3,
    label: "Least",
    sublabel: "Low Effort · Starter",
    icon: <Leaf className="h-4 w-4" />,
    borderColor: "border-border/40",
    bgColor: "bg-background/20",
    badgeColor: "bg-muted text-muted-foreground border-border/40",
    iconColor: "text-muted-foreground",
  },
];

function difficultyLabel(score: number | null) {
  if (score === null) return null;
  if (score > 0.7) return { label: "Hard", color: "text-red-400" };
  if (score > 0.4) return { label: "Medium", color: "text-amber-400" };
  return { label: "Easy", color: "text-emerald-400" };
}

function ActionTierCard({
  tier,
  action,
  onPreview,
}: {
  tier: Tier;
  action: Action | null;
  onPreview: (action: Action) => void;
}) {
  if (!action) {
    return (
      <div className={`rounded-2xl border p-5 ${tier.borderColor} bg-background/10`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tier.badgeColor}`}>
            {tier.icon}
            {tier.label}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">No action available for this tier.</div>
      </div>
    );
  }

  const diff = difficultyLabel(action.difficulty_score);
  const rationale = typeof action.rationale_json === "string"
    ? action.rationale_json
    : action.rationale_json?.summary ?? action.rationale_json?.rationale ?? "";

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-sm ${tier.borderColor} ${tier.bgColor}`}>
      {/* Tier badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tier.badgeColor}`}>
          {tier.icon}
          {tier.label}
        </span>
        <span className="text-[10px] text-muted-foreground">{tier.sublabel}</span>
      </div>

      {/* Action name */}
      <div className="text-sm font-bold text-foreground mb-1">
        {humanizeCode(action.action_code)}
      </div>
      <div className="text-xs text-muted-foreground mb-3">{action.location_name}</div>

      {/* Rationale */}
      {rationale && (
        <div className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">
          {rationale}
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {action.expected_roi !== null && (
          <div className="rounded-lg border border-border/30 bg-background/30 p-2 text-center">
            <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {fmtPct(action.expected_roi)}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">ROI</div>
          </div>
        )}
        {action.time_to_impact_days !== null && (
          <div className="rounded-lg border border-border/30 bg-background/30 p-2 text-center">
            <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-foreground">
              <Clock className="h-3 w-3" />
              {action.time_to_impact_days}d
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Impact</div>
          </div>
        )}
        {diff && (
          <div className="rounded-lg border border-border/30 bg-background/30 p-2 text-center">
            <div className={`text-xs font-bold ${diff.color}`}>{diff.label}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Effort</div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onPreview(action)}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:opacity-80 ${tier.badgeColor}`}
        >
          <Eye className="h-3 w-3" />
          Preview Impact
        </button>
        <Link
          href={`/restaurant/valora-intelligence/alerts?source=action&location_id=${action.location_id}&day=${action.day}`}
          className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-background/20 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-background/40"
        >
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── What-If Drawer ────────────────────────────────────────────────────────────
function WhatIfDrawer({
  action,
  locationId,
  day,
  tenantDay,
  onClose,
}: {
  action: Action;
  locationId: string | null;
  day: string;
  tenantDay: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [preview, setPreview] = React.useState<any>(null);
  const [feedback, setFeedback] = React.useState<"accepted" | "dismissed" | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/whatif/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action_code: action.action_code,
            location_id: action.location_id,
            day: tenantDay,
          }),
        });
        const j = await r.json();
        if (j.ok) setPreview(j);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [action.action_code, action.location_id, tenantDay]);

  const handleFeedback = async (response: "accepted" | "dismissed") => {
    if (!preview?.run_id) return;
    setFeedback(response);
    await fetch("/api/whatif/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: preview.run_id, response }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-foreground">
                What-If Preview
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {humanizeCode(action.action_code)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-background/40"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/20" />
              ))}
            </div>
          ) : !preview ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-muted-foreground">
              Unable to generate preview. Please try again.
            </div>
          ) : feedback ? (
            <div className={`rounded-2xl border p-6 text-center ${feedback === "accepted" ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/40 bg-background/20"}`}>
              <div className="text-2xl mb-2">{feedback === "accepted" ? "✅" : "✗"}</div>
              <div className="text-sm font-semibold text-foreground">
                {feedback === "accepted" ? "Action Accepted!" : "Action Dismissed"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {feedback === "accepted"
                  ? "Outcome will be measured in 7 days."
                  : "Noted for model improvement."}
              </div>
              <button onClick={onClose} className="mt-4 rounded-xl border border-border/60 px-4 py-2 text-xs font-semibold hover:bg-background/40">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Action description */}
              <div className="rounded-xl border border-border/40 bg-background/20 p-4">
                <div className="text-xs text-muted-foreground">{preview.description}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Applying <span className="font-semibold text-foreground">{(preview.pct_change * 100).toFixed(0)}%</span> change
                  at <span className="font-semibold text-foreground">{preview.location_name}</span>
                </div>
              </div>

              {/* Speedometer */}
              {preview.speedometer && (
                <SpeedometerGauge speedometer={preview.speedometer} />
              )}

              {/* Delta cards */}
              {preview.delta_cards && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Projected Changes
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {preview.delta_cards.map((card: any, i: number) => (
                      <DeltaCard key={i} card={card} />
                    ))}
                  </div>
                </div>
              )}

              {/* Profit delta */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Projected Weekly Uplift
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {preview.profit_delta >= 0 ? "+" : ""}{fmtUsd(preview.profit_delta)}
                </div>
              </div>

              {/* Accept / Dismiss */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleFeedback("accepted")}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
                >
                  ✓ Accept & Track
                </button>
                <button
                  onClick={() => handleFeedback("dismissed")}
                  className="rounded-xl border border-border/60 bg-background/20 px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-background/40"
                >
                  ✗ Dismiss
                </button>
              </div>

              <div className="text-[10px] text-muted-foreground/50 text-center">
                Phase 1 math projection · Outcome measured after 7 days
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Speedometer SVG ───────────────────────────────────────────────────────────
function SpeedometerGauge({ speedometer }: { speedometer: any }) {
  const { current, projected, good_range_min, good_range_max, lower_is_better, label, improved } = speedometer;

  // Convert value to angle (-135 to +135 degrees)
  // We use a 0-1 scale for the gauge
  const maxVal = good_range_max * 1.5;
  const toAngle = (val: number) => {
    const pct = Math.min(Math.max(val / maxVal, 0), 1);
    return -135 + pct * 270;
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cx = 100; const cy = 100; const r = 70;

  const needleAngle  = toAngle(current);
  const projAngle    = toAngle(projected);
  const goodMinAngle = toAngle(good_range_min);
  const goodMaxAngle = toAngle(good_range_max);

  const describeArc = (startDeg: number, endDeg: number) => {
    const s = toRad(startDeg); const e = toRad(endDeg);
    const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleX = cx + (r - 10) * Math.cos(toRad(needleAngle));
  const needleY = cy + (r - 10) * Math.sin(toRad(needleAngle));
  const projX   = cx + (r - 10) * Math.cos(toRad(projAngle));
  const projY   = cy + (r - 10) * Math.sin(toRad(projAngle));

  const isGood = lower_is_better
    ? projected < current
    : projected > current;

  return (
    <div className="rounded-xl border border-border/40 bg-background/20 p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
        {label}
      </div>
      <div className="flex justify-center">
        <svg viewBox="0 0 200 130" className="w-48 h-28">
          {/* Background arc — full range */}
          <path
            d={describeArc(-135, 135)}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-border/30"
            strokeLinecap="round"
          />
          {/* Red zone */}
          <path
            d={describeArc(-135, goodMinAngle)}
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            opacity="0.4"
            strokeLinecap="round"
          />
          {/* Green zone */}
          <path
            d={describeArc(goodMinAngle, goodMaxAngle)}
            fill="none"
            stroke="#10b981"
            strokeWidth="12"
            opacity="0.4"
            strokeLinecap="round"
          />
          {/* Amber zone */}
          <path
            d={describeArc(goodMaxAngle, 135)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            opacity="0.4"
            strokeLinecap="round"
          />

          {/* Current needle — white */}
          <line
            x1={cx} y1={cy}
            x2={needleX} y2={needleY}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          {/* Projected needle — colored */}
          <line
            x1={cx} y1={cy}
            x2={projX} y2={projY}
            stroke={isGood ? "#10b981" : "#ef4444"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="4 2"
            opacity="0.9"
          />

          {/* Center dot */}
          <circle cx={cx} cy={cy} r="4" fill="white" opacity="0.9" />

          {/* Labels */}
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6" className="text-muted-foreground">
            current
          </text>
        </svg>
      </div>

      {/* Values */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="rounded-lg border border-border/30 bg-background/20 p-2 text-center">
          <div className="text-xs font-bold text-foreground">
            {(current * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] text-muted-foreground">Current</div>
        </div>
        <div className={`rounded-lg border p-2 text-center ${isGood ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
          <div className={`text-xs font-bold ${isGood ? "text-emerald-400" : "text-red-400"}`}>
            {(projected * 100).toFixed(1)}%
            <span className="ml-1 text-[9px]">{isGood ? "↓" : "↑"}</span>
          </div>
          <div className="text-[9px] text-muted-foreground">Projected</div>
        </div>
      </div>

      {/* Zone legend */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />🔴 Danger
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-400/60" />🟢 Target
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-400/60" />🟡 Caution
        </span>
      </div>
    </div>
  );
}

// ── Delta Card ────────────────────────────────────────────────────────────────
function DeltaCard({ card }: { card: any }) {
  const improved = card.unit === "%" ? card.delta > 0 : card.delta > 0;
  const isPositive = card.delta > 0;

  return (
    <div className={`rounded-xl border p-3 ${isPositive ? "border-emerald-500/20 bg-emerald-500/5" : card.delta < 0 ? "border-red-500/20 bg-red-500/5" : "border-border/40 bg-background/20"}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{card.label}</div>
      <div className="flex items-end gap-1">
        <span className="text-xs font-bold text-foreground">
          {card.unit === "usd" ? `$${card.projected.toLocaleString()}` : `${card.projected.toFixed(1)}%`}
        </span>
      </div>
      <div className={`text-[10px] mt-0.5 font-semibold ${isPositive ? "text-emerald-400" : card.delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
        {card.delta > 0 ? "+" : ""}{card.unit === "usd" ? `$${card.delta.toFixed(0)}` : `${card.delta.toFixed(1)}pp`}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ActionsPage() {
  const searchParams = useSearchParams();
  const source     = searchParams.get("source") ?? "overview";
  const locationId = searchParams.get("location_id");
  const day        = searchParams.get("day");
  const kpiCode    = searchParams.get("kpi_code");
  const kpiLabel   = searchParams.get("kpi_label");

  const [loading, setLoading]         = React.useState(true);
  const [actions, setActions]         = React.useState<Action[]>([]);
  const [briefs, setBriefs]           = React.useState<any[]>([]);
  const [opportunities, setOpportunities] = React.useState<any[]>([]);
  const [contextKpis, setContextKpis] = React.useState<any[]>([]);
  const [error, setError]             = React.useState<string | null>(null);
  const [asOf, setAsOf]               = React.useState<string>(day ?? "");
  const [selectedAction, setSelectedAction] = React.useState<Action | null>(null);

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

  const deptParam = searchParams.get("dept");
  const deptInfo = getDeptFromSource(deptParam ?? source, kpiLabel);
  const sourceDept = deptInfo.url;
  const sourceDeptLabel = deptInfo.label;

  const [locationName, setLocationName] = React.useState<string>(
    locationId ? `Location ${locationId}` : "All Locations"
  );

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

  const sourceLabel = kpiLabel
    ? decodeURIComponent(kpiLabel)
    : source === "kpi" ? "KPI Dashboard"
    : sourceDeptLabel;

  const locationLabel = locationName;


  // Group actions by priority rank → Best(1) / Moderate(2) / Least(3)
  const actionsByRank = TIERS.map((tier) =>
    actions.find((a) => a.priority_rank === tier.rank) ?? null
  );

  return (
    <div className="space-y-4">

      {/* Header */}
      <SectionCard
        title="Recommended Actions"
        subtitle="AI-driven actions prioritized by ROI, effort, and time-to-impact."
      >
        {/* Context bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
          <span className="rounded-lg border border-border/40 bg-background/30 px-2.5 py-1 font-medium text-foreground">
            {sourceLabel}
          </span>
          <span>·</span>
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
          {kpiCode && (
            <>
              <span>·</span>
              <span className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 font-medium text-blue-400">
                📊 {humanizeCode(kpiCode)}
              </span>
            </>
          )}
        </div>

        {/* Context KPIs */}
        {contextKpis.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {contextKpis.map((k, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 ${
                  k.severity === "risk" ? "border-red-500/30 bg-red-500/10"
                  : k.severity === "warn" ? "border-amber-500/30 bg-amber-500/10"
                  : "border-border/60 bg-background/20"
                }`}
              >
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.label}</div>
                <div className="mt-1 text-sm font-bold text-foreground">
                  {k.unit === "usd"
                    ? `$${Number(k.value).toLocaleString()}`
                    : k.unit === "pct"
                    ? `${(Number(k.value) * 100).toFixed(1)}%`
                    : k.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nav */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/restaurant/valora-intelligence/alerts?source=${source}&location_id=${locationId ?? ""}&day=${asOf}&kpi_code=${kpiCode ?? ""}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background/40"
          >
            ← View Alerts
          </Link>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard title="Loading actions...">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-muted/20" />
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
            <SectionCard title="AI Analysis" subtitle="Narrative context driving these recommendations.">
              {briefs.slice(0, 1).map((b, i) => (
                <div key={i} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <div className="text-sm font-semibold text-foreground">{b.headline}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.location_name}</div>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">{b.summary_text}</div>
                  {b.model_name && (
                    <div className="mt-3 text-[10px] text-muted-foreground/50">Generated by {b.model_name}</div>
                  )}
                </div>
              ))}
            </SectionCard>
          )}

          {/* 3-Tier Action Cards */}
          <SectionCard
            title="Action Plan"
            subtitle="Choose your approach — Best impact, Moderate effort, or a quick Least-effort win."
          >
            {actions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {TIERS.map((tier, i) => (
                  <ActionTierCard
                    key={tier.rank}
                    tier={tier}
                    action={actionsByRank[i]}
                    onPreview={setSelectedAction}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-background/20 p-8 text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-sm font-semibold text-foreground">No actions available yet</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Actions appear once ML models detect improvement opportunities.
                </div>
              </div>
            )}
          </SectionCard>

          {/* Profit Opportunities */}
          {opportunities.length > 0 && (
            <SectionCard title="Profit Opportunities" subtitle="Revenue and margin improvement opportunities.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {opportunities.map((o, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-background/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{humanizeCode(o.opportunity_type)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{o.location_name ?? `Location #${o.location_id}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-400">{fmtUsd(Number(o.impact_estimate ?? 0))}</div>
                        <div className="text-xs text-muted-foreground">Est. uplift</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Link href={sourceDept} className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-background/50">
          ← {sourceDeptLabel}
        </Link>
        <Link
          href={`/restaurant/valora-intelligence/alerts?source=${source}&location_id=${locationId ?? ""}&day=${asOf}&kpi_code=${kpiCode ?? ""}`}
          className="rounded-xl border border-border/60 px-4 py-2 text-sm font-semibold hover:bg-background/50"
        >
          ← View Alerts
        </Link>
      </div>

      {/* What-If Drawer */}
      {selectedAction && (
        <WhatIfDrawer
          action={selectedAction}
          locationId={locationId}
          day={asOf}
          tenantDay={asOf}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}
