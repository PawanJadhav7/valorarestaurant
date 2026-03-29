"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";

type LatestDateApi = {
    tenant_id?: string;
    latest_date?: string | null;
};

type ActionRow = {
    action_execution_id: number;
    tenant_id: string;
    location_id: number;
    as_of_date?: string | null;
    location_insight_id?: number | null;
    generation_run_id?: number | null;
    action_code: string;
    action_title: string;
    action_description?: string | null;
    source_type: string;
    source_risk_type?: string | null;
    source_opportunity_type?: string | null;
    status: string;
    priority: string;
    assigned_user_id?: string | null;
    assigned_to_name?: string | null;
    expected_roi?: number | null;
    expected_profit_uplift?: number | null;
    expected_impact_json?: Record<string, unknown> | null;
    due_date?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    execution_notes?: string | null;
    outcome_summary?: string | null;
    actual_impact_json?: Record<string, unknown> | null;
    actual_roi?: number | null;
    effectiveness_score?: number | null;
    created_by_user_id?: string | null;
    updated_by_user_id?: string | null;
    metadata_json?: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
};

type ActionsApi = {
    tenant_id: string;
    location_id?: number | null;
    status?: string | null;
    as_of_date?: string | null;
    items: ActionRow[];
};

type LocationOpt = { id: string; label: string };

function humanizeCode(value?: string | null) {
    if (!value) return "-";
    return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatCurrency0(value: unknown) {
    return `$${Number(value ?? 0).toFixed(0)}`;
}

function formatPercent1(value: unknown) {
    return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

function formatDateTime(value?: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString();
}

function priorityBadgeClasses(value?: string | null) {
    switch (value) {
        case "critical":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
        case "high":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
        case "medium":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
        case "low":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
        default:
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
    }
}

function statusBadgeClasses(value?: string | null) {
    switch (value) {
        case "completed":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-700 border-green-500/20";
        case "in_progress":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 border-blue-500/20";
        case "acknowledged":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
        case "blocked":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
        case "dismissed":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
        case "expired":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-700 border-red-500/20";
        case "open":
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20";
        default:
            return "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground";
    }
}

function Skeleton() {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
                <div className="h-6 w-48 rounded bg-muted/40" />
                <div className="mt-2 h-4 w-80 rounded bg-muted/30" />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4">
                        <div className="h-4 w-48 rounded bg-muted/40" />
                        <div className="mt-3 h-4 w-full rounded bg-muted/30" />
                        <div className="mt-2 h-4 w-5/6 rounded bg-muted/30" />
                        <div className="mt-4 h-9 w-56 rounded bg-muted/30" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RestaurantActionsPage() {
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState<string | null>(null);

    const [latestDate, setLatestDate] = React.useState<string | null>(null);
    const [actions, setActions] = React.useState<ActionRow[]>([]);
    const [locations, setLocations] = React.useState<LocationOpt[]>([]);
    const [locationId, setLocationId] = React.useState<string>("all");
    const [busyActionId, setBusyActionId] = React.useState<number | null>(null);

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

        const json = (await res.json()) as LatestDateApi;
        setLatestDate(json?.latest_date ?? null);
        return json?.latest_date ?? null;
    }, []);

    const fetchActions = React.useCallback(
        async (signal?: AbortSignal) => {
            const params = new URLSearchParams();

            if (latestDate) {
                params.set("as_of_date", latestDate);
            }

            if (locationId !== "all") {
                params.set("location_id", locationId);
            }

            const res = await fetch(`/api/ai/actions?${params.toString()}`, {
                cache: "no-store",
                signal,
            });

            if (!res.ok) {
                throw new Error(`Actions HTTP ${res.status}`);
            }

            const json = (await res.json()) as ActionsApi;
            setActions(json?.items ?? []);
        },
        [latestDate, locationId]
    );


    const postActionTransition = React.useCallback(
        async (
            actionExecutionId: number,
            transition: "acknowledge" | "start" | "dismiss" | "complete" | "block"
        ) => {
            setBusyActionId(actionExecutionId);
            setErr(null);

            try {
                const body =
                    transition === "complete"
                        ? {
                            outcome_summary: "Completed from Valora action board",
                            actual_roi: null,
                            effectiveness_score: null,
                        }
                        : {};

                const res = await fetch(
                    `/api/ai/actions/${actionExecutionId}/${transition}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                    }
                );

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(
                        `Action ${transition} failed (${res.status}): ${text || "Unknown error"}`
                    );
                }

                await fetchActions();
            } catch (e: any) {
                setErr(e?.message ?? `Failed to ${transition} action`);
            } finally {
                setBusyActionId(null);
            }
        },
        [fetchActions]
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
        const ac = new AbortController();

        (async () => {
            try {
                await fetchActions(ac.signal);
            } catch (e: any) {
                if (e?.name !== "AbortError") {
                    setErr(e?.message ?? "Failed to load actions");
                }
            }
        })();

        return () => ac.abort();
    }, [fetchActions]);

    const grouped = React.useMemo(() => {
        return {
            open: actions.filter((a) => a.status === "open"),
            acknowledged: actions.filter((a) => a.status === "acknowledged"),
            in_progress: actions.filter((a) => a.status === "in_progress"),
            completed: actions.filter((a) => a.status === "completed"),
            blocked: actions.filter((a) => a.status === "blocked"),
            dismissed: actions.filter((a) => a.status === "dismissed"),
        };
    }, [actions]);

    const locationLabel = (id: number) =>
        locations.find((l) => l.id === String(id))?.label ?? `Location ${id}`;

    const renderActionCard = (action: ActionRow) => (
        <Card key={action.action_execution_id} className="rounded-2xl">
            <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold text-foreground">
                        {action.action_title}
                    </div>
                    <span className={statusBadgeClasses(action.status)}>
                        {humanizeCode(action.status)}
                    </span>
                    <span className={priorityBadgeClasses(action.priority)}>
                        {humanizeCode(action.priority)}
                    </span>
                </div>

                <div className="text-sm text-muted-foreground">
                    {locationLabel(action.location_id)}
                </div>

                {action.action_description ? (
                    <div className="text-sm text-muted-foreground">
                        {action.action_description}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="text-xs text-muted-foreground">Action Code</div>
                        <div className="mt-1 font-medium text-foreground">
                            {humanizeCode(action.action_code)}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="text-xs text-muted-foreground">Expected ROI</div>
                        <div className="mt-1 font-medium text-foreground">
                            {action.expected_roi != null ? formatCurrency0(action.expected_roi) : "—"}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="text-xs text-muted-foreground">Expected Profit Uplift</div>
                        <div className="mt-1 font-medium text-foreground">
                            {action.expected_profit_uplift != null
                                ? formatCurrency0(action.expected_profit_uplift)
                                : "—"}
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="text-xs text-muted-foreground">Due Date</div>
                        <div className="mt-1 font-medium text-foreground">
                            {action.due_date ? new Date(action.due_date).toLocaleDateString() : "—"}
                        </div>
                    </div>
                </div>

                {(action.outcome_summary || action.actual_roi != null || action.effectiveness_score != null) ? (
                    <div className="rounded-xl border border-border bg-background/50 p-3">
                        <div className="text-sm font-medium text-foreground">Outcome</div>

                        {action.outcome_summary ? (
                            <div className="mt-1 text-sm text-muted-foreground">
                                {action.outcome_summary}
                            </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Actual ROI: </span>
                                <span className="font-medium text-foreground">
                                    {action.actual_roi != null ? formatCurrency0(action.actual_roi) : "—"}
                                </span>
                            </div>

                            <div>
                                <span className="text-muted-foreground">Effectiveness: </span>
                                <span className="font-medium text-foreground">
                                    {action.effectiveness_score != null
                                        ? formatPercent1(action.effectiveness_score)
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="text-xs text-muted-foreground">
                        Created: {formatDateTime(action.created_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Updated: {formatDateTime(action.updated_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Started: {formatDateTime(action.started_at)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Completed: {formatDateTime(action.completed_at)}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {action.status === "open" ? (
                        <button
                            onClick={() =>
                                postActionTransition(action.action_execution_id, "acknowledge")
                            }
                            disabled={busyActionId === action.action_execution_id}
                            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
                        >
                            {busyActionId === action.action_execution_id ? "Working..." : "Acknowledge"}
                        </button>
                    ) : null}

                    {(action.status === "open" || action.status === "acknowledged") ? (
                        <button
                            onClick={() => postActionTransition(action.action_execution_id, "start")}
                            disabled={busyActionId === action.action_execution_id}
                            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
                        >
                            {busyActionId === action.action_execution_id ? "Working..." : "Start"}
                        </button>
                    ) : null}

                    {(action.status === "open" ||
                        action.status === "acknowledged" ||
                        action.status === "in_progress") ? (
                        <button
                            onClick={() =>
                                postActionTransition(action.action_execution_id, "complete")
                            }
                            disabled={busyActionId === action.action_execution_id}
                            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
                        >
                            {busyActionId === action.action_execution_id ? "Working..." : "Complete"}
                        </button>
                    ) : null}

                    {(action.status === "open" || action.status === "acknowledged") ? (
                        <button
                            onClick={() => postActionTransition(action.action_execution_id, "dismiss")}
                            disabled={busyActionId === action.action_execution_id}
                            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
                        >
                            {busyActionId === action.action_execution_id ? "Working..." : "Dismiss"}
                        </button>
                    ) : null}

                    {(action.status === "open" ||
                        action.status === "acknowledged" ||
                        action.status === "in_progress") ? (
                        <button
                            onClick={() => postActionTransition(action.action_execution_id, "block")}
                            disabled={busyActionId === action.action_execution_id}
                            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40 disabled:opacity-50"
                        >
                            {busyActionId === action.action_execution_id ? "Working..." : "Block"}
                        </button>
                    ) : null}

                    <Link
                        href={`/restaurant/location/${action.location_id}`}
                        className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
                    >
                        Open Location
                    </Link>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) return <Skeleton />;

    return (
        <div className="space-y-4">
            <SectionCard
                title="Action Board"
                subtitle={`Operational action tracking tied to AI recommendations. Snapshot available through ${latestDateLabel}.`}
            >
                <div className="flex flex-wrap items-center gap-2 pb-2">
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

                {err ? <div className="text-sm text-danger">{err}</div> : null}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">Open</div>
                        <div className="mt-2 text-2xl font-semibold">{grouped.open.length}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">Acknowledged</div>
                        <div className="mt-2 text-2xl font-semibold">
                            {grouped.acknowledged.length}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">In Progress</div>
                        <div className="mt-2 text-2xl font-semibold">
                            {grouped.in_progress.length}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">Completed</div>
                        <div className="mt-2 text-2xl font-semibold">
                            {grouped.completed.length}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">Blocked</div>
                        <div className="mt-2 text-2xl font-semibold">{grouped.blocked.length}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-sm text-muted-foreground">Dismissed</div>
                        <div className="mt-2 text-2xl font-semibold">
                            {grouped.dismissed.length}
                        </div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                title="Open & Active Actions"
                subtitle="Track pending and in-flight operational work."
            >
                {grouped.open.length +
                    grouped.acknowledged.length +
                    grouped.in_progress.length +
                    grouped.blocked.length ===
                    0 ? (
                    <div className="text-sm text-muted-foreground">
                        No open or active actions for the current filter.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {[
                            ...grouped.open,
                            ...grouped.acknowledged,
                            ...grouped.in_progress,
                            ...grouped.blocked,
                        ].map(renderActionCard)}
                    </div>
                )}
            </SectionCard>

            <SectionCard
                title="Completed Actions"
                subtitle="Closed-loop execution history and captured outcomes."
            >
                {grouped.completed.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                        No completed actions yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {grouped.completed.map(renderActionCard)}
                    </div>
                )}
            </SectionCard>

            <SectionCard
                title="Action Layer Notes"
                subtitle="This is the new operating loop that converts AI into measurable execution."
            >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-foreground">
                                AI → Action
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Recommendations can now be turned into execution records.
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-foreground">
                                Execution Tracking
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Actions move through open, acknowledged, in progress, and completed states.
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl">
                        <CardContent className="p-4">
                            <div className="text-sm font-semibold text-foreground">
                                Outcome Capture
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Completed actions can store real operational outcomes and realized ROI.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SectionCard>
        </div>
    );
}