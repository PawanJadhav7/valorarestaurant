"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";

type AlertHistoryItem = {
  location_id: number;
  risk_type: string;
  day?: string | null;
  status: "done" | "snoozed" | "ignored";
  source?: string | null;
  updated_at?: string | null;
};

type AlertHistoryApi = {
  ok?: boolean;
  items?: AlertHistoryItem[];
  count?: number;
  error?: string;
};

type AlertStatusItem = {
  location_id: number;
  risk_type: string;
  day?: string | null;
  status: "done" | "snoozed" | "ignored";
  source?: string | null;
  updated_at?: string | null;
};

type AlertStatusApi = {
  ok?: boolean;
  items?: AlertStatusItem[];
  error?: string;
};

type AlertItem = {
  location_id: number;
  location_name: string;
  region?: string | null;
  risk_type: string;
  severity_score?: number | null;
  impact_estimate?: number | null;
  headline?: string | null;
};

type AlertsApi = {
  items?: AlertItem[];
  error?: string;
};

function fmtDay(day?: string | null) {
  if (!day) return "Latest available snapshot";
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString();
}

function humanize(value?: string | null) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatCurrency0(value: unknown) {
  return `$${Number(value ?? 0).toFixed(0)}`;
}

function severityBand(score?: number | null) {
  const n = Number(score ?? 0);
  if (n >= 85) return "Critical";
  if (n >= 65) return "High";
  if (n >= 40) return "Watch";
  return "Info";
}

function severityBadgeClasses(score?: number | null) {
  const n = Number(score ?? 0);
  if (n >= 85) {
    return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
  }
  if (n >= 65) {
    return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
  }
  if (n >= 40) {
    return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-foreground border-blue-500/20";
  }
  return "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-green-500/10 text-foreground border-green-500/20";
}

function riskBadgeClasses(value?: string | null) {
  switch (value) {
    case "healthy":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-foreground border-green-500/20";
    case "stockout_risk":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "waste_spike":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-foreground border-red-500/20";
    case "inventory_stress":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-foreground border-blue-500/20";
    case "labor_productivity_drop":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-purple-500/10 text-foreground border-purple-500/20";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-foreground";
  }
}

function ContextPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-border/60 bg-background/30 px-3 py-1 text-xs font-medium text-foreground">
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span>{value}</span>
    </div>
  );
}

function priorityTone(priority: "Top" | "Medium" | "Low") {
  if (priority === "Top") {
    return "text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-foreground";
  }
  if (priority === "Medium") {
    return "text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-foreground";
  }
  return "text-xs px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-foreground";
}

function decisionBadgeClasses(status?: string | null) {
  switch (status) {
    case "done":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-foreground border-green-500/20";
    case "snoozed":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-foreground border-amber-500/20";
    case "ignored":
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-foreground border-border/50";
    default:
      return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-foreground border-border/50";
  }
}

export default function AlertsPage() {
  const searchParams = useSearchParams();

  const source = searchParams.get("source") ?? "overview";
  const locationId = searchParams.get("location_id");
  const day = searchParams.get("day");
  const riskType = searchParams.get("risk_type");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const [decisionState, setDecisionState] = React.useState<
    Record<string, "done" | "snoozed" | "ignored">
  >({});
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const sourceLabel =
    source === "overview"
      ? "Overview"
      : source
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase());

  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<AlertHistoryItem[]>([]);

  const loadHistory = React.useCallback(
    async (signal?: AbortSignal) => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const qs = new URLSearchParams();
        if (locationId) qs.set("location_id", locationId);
        if (riskType) qs.set("risk_type", riskType);
        if (day) qs.set("day", day);
        qs.set("limit", "20");

        const res = await fetch(
          `/api/alerts/history${qs.toString() ? `?${qs.toString()}` : ""}`,
          { cache: "no-store", signal }
        );

        if (!res.ok) {
          throw new Error(`Alert History HTTP ${res.status}`);
        }

        const json = (await res.json()) as AlertHistoryApi;
        setHistory(json.items ?? []);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setHistoryError(e?.message ?? "Failed to load decision history");
        }
      } finally {
        setHistoryLoading(false);
      }
    },
    [locationId, riskType, day]
  );

  React.useEffect(() => {
    const ac = new AbortController();
    loadHistory(ac.signal);
    return () => ac.abort();
  }, [loadHistory]);


  async function handleDecisionUpdate(
    key: string,
    alert: AlertItem,
    status: "done" | "snoozed" | "ignored"
  ) {
    setSavingKey(key);
    setSaveError(null);

    try {
      const res = await fetch("/api/alerts/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          location_id: alert.location_id,
          risk_type: alert.risk_type,
          day: day ?? null,
          status,
          source,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Update status HTTP ${res.status}`);
      }

      setDecisionState((prev) => ({
        ...prev,
        [key]: status,
      }));
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to save alert decision");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDecisionReset(key: string, alert: AlertItem) {
    setSavingKey(key);
    setSaveError(null);

    try {
      const res = await fetch("/api/alerts/status", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          location_id: alert.location_id,
          risk_type: alert.risk_type,
          day: day ?? null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Delete status HTTP ${res.status}`);
      }

      setDecisionState((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      await loadHistory();
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to reset alert decision");
    } finally {
      setSavingKey(null);
    }
  }

  const totalDecisions = history.length;
  const resolvedCount = history.filter((item) => item.status === "done").length;
  const snoozedCount = history.filter((item) => item.status === "snoozed").length;
  const ignoredCount = history.filter((item) => item.status === "ignored").length;
  const resolutionRate =
    totalDecisions > 0 ? Math.round((resolvedCount / totalDecisions) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
        <div className="text-lg font-semibold text-foreground">Alerts</div>
        <div className="mt-1 text-sm text-muted-foreground">
          High-priority issues requiring operator attention and immediate action.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ContextPill label="Source" value={sourceLabel} />
          <ContextPill
            label="Location"
            value={locationId ? `Location ${locationId}` : "All Locations"}
          />
          <ContextPill label="Day" value={fmtDay(day)} />
          {riskType ? (
            <ContextPill label="Risk" value={humanize(riskType)} />
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-foreground">
          <div className="font-medium">Unable to load alerts</div>
          <div className="mt-1 text-muted-foreground">{error}</div>
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-foreground">
          <div className="font-medium">Unable to save or reset alert decision</div>
          <div className="mt-1 text-muted-foreground">{saveError}</div>
        </div>
      ) : null}

      <SectionCard
        title="Alert Feed"
        subtitle="Severity, impact, and next actions for the selected context"
      >
        <div className="mb-4 rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
          Showing the highest impact alerts first for the selected context.
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                  <div className="mt-3 h-3 w-24 animate-pulse rounded bg-muted/30" />
                  <div className="mt-4 h-14 animate-pulse rounded bg-muted/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No alerts are active for this selection. Operations appear to be within
            expected thresholds, or alert signals may still be processing.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {alerts.map((alert, i) => {
              const priority: "Top" | "Medium" | "Low" =
                Number(alert.impact_estimate ?? 0) > 5000
                  ? "Top"
                  : Number(alert.impact_estimate ?? 0) > 1000
                    ? "Medium"
                    : "Low";

              const key = `${alert.location_id}-${alert.risk_type}-${day ?? "latest"}`;
              const status = decisionState[key];

              return (
                <Card
                  key={key}
                  className={[
                    "rounded-2xl transition hover:bg-background/40",
                    i < 3 ? "ring-1 ring-foreground/20 shadow-md" : "",
                    status === "done" ? "opacity-60 border-green-500/30" : "",
                  ].join(" ")}
                >
                  <CardContent className="p-4">
                    {status ? (
                      <div className="mb-3 text-xs font-semibold text-muted-foreground">
                        Status: {status.toUpperCase()}
                      </div>
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-foreground">
                            {alert.location_name}
                          </div>

                          <span className={riskBadgeClasses(alert.risk_type)}>
                            {humanize(alert.risk_type)}
                          </span>

                          <span
                            className={severityBadgeClasses(alert.severity_score)}
                          >
                            {severityBand(alert.severity_score)}
                          </span>

                          <span className={priorityTone(priority)}>
                            {priority}
                          </span>
                        </div>

                        <div className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {alert.headline ??
                            `Investigate ${humanize(alert.risk_type).toLowerCase()} at this location.`}
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Requires operator review to reduce business impact and prevent escalation.
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-right">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Impact
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency0(alert.impact_estimate)}
                        </div>
                      </div>
                    </div>

                    {decisionState[key] ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Current status:{" "}
                        <span className="font-semibold text-foreground">
                          {humanize(decisionState[key])}
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["done", "snoozed", "ignored"] as const).map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          onClick={() => handleDecisionUpdate(key, alert, nextStatus)}
                          disabled={savingKey === key}
                          className={[
                            "rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50",
                            decisionState[key] === nextStatus
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background/30 border-border hover:bg-background/50 text-foreground",
                          ].join(" ")}
                        >
                          {savingKey === key ? "Saving..." : humanize(nextStatus)}
                        </button>
                      ))}
                    </div>

                    {decisionState[key] ? (
                      <button
                        type="button"
                        onClick={() => handleDecisionReset(key, alert)}
                        disabled={savingKey === key}
                        className="mt-2 text-xs text-muted-foreground underline disabled:opacity-50"
                      >
                        {savingKey === key ? "Resetting..." : "Reset decision"}
                      </button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/restaurant/insights?source=${encodeURIComponent(
              source
            )}&location_id=${encodeURIComponent(
              locationId ?? ""
            )}&day=${encodeURIComponent(day ?? "")}${riskType ? `&risk_type=${encodeURIComponent(riskType)}` : ""
              }`}
            className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background/50"
          >
            View related insights
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Decision Analytics"
        subtitle="Operator action metrics for the selected alert context"
      >
        {historyError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-foreground">
            <div className="font-medium">Unable to load decision analytics</div>
            <div className="mt-1 text-muted-foreground">{historyError}</div>
          </div>
        ) : historyLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted/40" />
                  <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted/30" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Decisions</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {totalDecisions}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Resolved</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {resolvedCount}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Snoozed</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {snoozedCount}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Ignored</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {ignoredCount}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Resolution Rate</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {resolutionRate}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {resolvedCount} of {totalDecisions || 0} decisions resolved
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Decision History"
        subtitle="Recent operator actions recorded for alerts in the selected context"
      >
        {historyError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-foreground">
            <div className="font-medium">Unable to load decision history</div>
            <div className="mt-1 text-muted-foreground">{historyError}</div>
          </div>
        ) : historyLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                  <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted/30" />
                  <div className="mt-3 h-3 w-52 animate-pulse rounded bg-muted/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No recorded alert decisions yet for this selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {history.map((item, i) => (
              <Card
                key={`${item.location_id}-${item.risk_type}-${item.updated_at ?? i}`}
                className="rounded-2xl"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-foreground">
                          Location {item.location_id}
                        </div>
                        <span className={riskBadgeClasses(item.risk_type)}>
                          {humanize(item.risk_type)}
                        </span>
                        <span className={decisionBadgeClasses(item.status)}>
                          {humanize(item.status)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground">
                        Source: {humanize(item.source ?? "overview")}
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        Day: {item.day ? fmtDay(item.day) : "Latest available snapshot"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-right">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Updated
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}