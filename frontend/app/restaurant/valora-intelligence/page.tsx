"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";

type ExecutiveSummaryApi = {
  ok?: boolean;
  summary?: string | null;
  executive_summary?: string | null;
  text?: string | null;
  error?: string;
};

type LocationInsightItem = {
  location_id?: number | string | null;
  location_name?: string | null;
  headline?: string | null;
  summary_text?: string | null;
  recommendation?: string | null;
  risk_type?: string | null;
  impact_estimate?: number | null;
};

type LocationInsightsApi = {
  ok?: boolean;
  items?: LocationInsightItem[];
  insights?: LocationInsightItem[];
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

export default function InsightsPage() {
  const searchParams = useSearchParams();

  const source = searchParams.get("source") ?? "overview";
  const locationId = searchParams.get("location_id");
  const day = searchParams.get("day");
  const riskType = searchParams.get("risk_type");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [executiveSummary, setExecutiveSummary] = React.useState<string>("");
  const [insights, setInsights] = React.useState<LocationInsightItem[]>([]);

  const [explainOpen, setExplainOpen] = React.useState(false);
  const [explainLoading, setExplainLoading] = React.useState(false);
  const [explainError, setExplainError] = React.useState<string | null>(null);
  const [explainTitle, setExplainTitle] = React.useState<string>("");
  const [explainText, setExplainText] = React.useState<string>("");

  const [activeInsight, setActiveInsight] =
    React.useState<LocationInsightItem | null>(null);
  const [chatInput, setChatInput] = React.useState("");
  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [chatResponse, setChatResponse] = React.useState("");

  const [decisionState, setDecisionState] = React.useState<
    Record<string, "done" | "snoozed" | "ignored">
  >({});

  const sourceLabel =
    source === "overview"
      ? "Overview"
      : source.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const executiveQs = new URLSearchParams();
        if (day) executiveQs.set("day", day);
        if (locationId) executiveQs.set("location_id", locationId);

        const insightsQs = new URLSearchParams();
        if (day) insightsQs.set("day", day);
        if (locationId) insightsQs.set("location_id", locationId);

        const [executiveRes, insightsRes] = await Promise.all([
          fetch(
            `/api/ai/executive-summary${
              executiveQs.toString() ? `?${executiveQs.toString()}` : ""
            }`,
            { cache: "no-store", signal: ac.signal }
          ),
          fetch(
            `/api/ai/location-insights${
              insightsQs.toString() ? `?${insightsQs.toString()}` : ""
            }`,
            { cache: "no-store", signal: ac.signal }
          ),
        ]);

        if (!executiveRes.ok) {
          throw new Error(`Executive Summary HTTP ${executiveRes.status}`);
        }
        if (!insightsRes.ok) {
          throw new Error(`Location Insights HTTP ${insightsRes.status}`);
        }

        const executiveJson =
          (await executiveRes.json()) as ExecutiveSummaryApi;
        const insightsJson = (await insightsRes.json()) as LocationInsightsApi;

        const summaryText =
          executiveJson.summary ||
          executiveJson.executive_summary ||
          executiveJson.text ||
          "";

        const rawItems = insightsJson.items ?? insightsJson.insights ?? [];
        const filteredItems = locationId
          ? rawItems.filter(
              (item) => String(item.location_id ?? "") === String(locationId)
            )
          : rawItems;

        const riskFilteredItems = riskType
          ? filteredItems.filter(
              (item) =>
                String(item.risk_type ?? "").toLowerCase() ===
                String(riskType).toLowerCase()
            )
          : filteredItems;

        setExecutiveSummary(summaryText);
        setInsights(riskFilteredItems);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message ?? "Failed to load AI insights");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [day, locationId, riskType]);

  async function handleExplain(item: LocationInsightItem) {
    setExplainOpen(true);
    setExplainLoading(true);
    setExplainError(null);
    setExplainTitle(item.headline ?? "AI Insight");
    setExplainText("");
    setActiveInsight(item);
    setChatInput("");
    setChatError(null);
    setChatResponse("");

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          source,
          location_id: item.location_id ?? locationId ?? null,
          day: day ?? null,
          risk_type: item.risk_type ?? riskType ?? null,
          headline: item.headline ?? null,
          summary_text: item.summary_text ?? null,
          recommendation: item.recommendation ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Explain API HTTP ${res.status}`);
      }

      const data = await res.json();

      const text =
        data?.explanation ||
        data?.answer ||
        data?.result ||
        data?.text ||
        data?.message ||
        "No explanation returned by the API.";

      setExplainText(String(text));
    } catch (e: any) {
      setExplainError(e?.message ?? "Failed to explain insight");
    } finally {
      setExplainLoading(false);
    }
  }

  async function handleAskAi(item: LocationInsightItem) {
    if (!chatInput.trim()) return;

    setChatLoading(true);
    setChatError(null);
    setChatResponse("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          source,
          location_id: item.location_id ?? locationId ?? null,
          day: day ?? null,
          risk_type: item.risk_type ?? riskType ?? null,
          headline: item.headline ?? null,
          summary_text: item.summary_text ?? null,
          recommendation: item.recommendation ?? null,
          message: chatInput,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI Chat HTTP ${res.status}`);
      }

      const data = await res.json();

      const text =
        data?.answer ||
        data?.response ||
        data?.result ||
        data?.text ||
        data?.message ||
        "No response returned by the AI chat API.";

      setChatResponse(String(text));
    } catch (e: any) {
      setChatError(e?.message ?? "Failed to chat with AI");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 space-y-6">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
        <div className="text-lg font-semibold text-foreground">AI Insights</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Context-aware insight workspace for operator decisions and next-best
          actions.
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
          <div className="font-medium">Unable to load AI insights</div>
          <div className="mt-1 text-muted-foreground">{error}</div>
        </div>
      ) : null}

      <SectionCard
        title="Executive Summary"
        subtitle="Portfolio-level AI narrative for the selected context"
      >
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted/30" />
            <div className="mt-2 h-3 w-[92%] animate-pulse rounded bg-muted/30" />
            <div className="mt-2 h-3 w-[84%] animate-pulse rounded bg-muted/30" />
          </div>
        ) : executiveSummary ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
            {executiveSummary}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No executive summary is available for this selection yet. Valora
            will surface a portfolio narrative once enough signals are
            generated.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Recommended Actions"
        subtitle="AI recommendations and next-best actions for the selected context"
      >
        <div className="mb-4 rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-xs text-muted-foreground">
          Showing the most relevant AI recommendations first for the selected
          context.
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                  <div className="mt-3 h-3 w-24 animate-pulse rounded bg-muted/30" />
                  <div className="mt-4 h-16 animate-pulse rounded bg-muted/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No recommendations are available for this selection yet. Current
            performance may be within expected range, or additional signals may
            still be processing.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {insights.map((item, i) => {
              const priority: "Top" | "Medium" | "Low" =
                Number(item.impact_estimate ?? 0) > 5000
                  ? "Top"
                  : Number(item.impact_estimate ?? 0) > 1000
                  ? "Medium"
                  : "Low";

              const key = `${item.location_id ?? "x"}-${item.headline ?? i}`;
              const status = decisionState[key];

              return (
                <Card
                  key={`${item.location_id ?? "x"}-${i}`}
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
                            {item.headline ?? "AI Insight"}
                          </div>
                          <span className={priorityTone(priority)}>
                            {priority}
                          </span>
                        </div>

                        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {item.location_name ?? "Unknown Location"}
                        </div>
                      </div>

                      {item.impact_estimate != null ? (
                        <div className="rounded-xl border border-border/50 bg-background/20 px-3 py-2 text-right">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Impact
                          </div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatCurrency0(item.impact_estimate)}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                      {item.summary_text ?? "No summary available."}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Impacting profitability and operational efficiency if unresolved.
                    </div>

                    {item.recommendation ? (
                      <div className="mt-4 rounded-xl border border-border/50 bg-background/20 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Recommended Action
                        </div>
                        <div className="mt-1 text-sm font-medium text-foreground">
                          {item.recommendation}
                        </div>
                        <div className="mt-3 text-xs font-semibold text-foreground">
                          Suggested next step →
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap justify-between gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setDecisionState((prev) => ({ ...prev, [key]: "done" }))
                          }
                          className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-foreground"
                        >
                          Mark as Done
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDecisionState((prev) => ({ ...prev, [key]: "snoozed" }))
                          }
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-foreground"
                        >
                          Snooze
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDecisionState((prev) => ({ ...prev, [key]: "ignored" }))
                          }
                          className="rounded-lg border border-border/50 bg-background/30 px-3 py-1 text-xs font-semibold text-foreground"
                        >
                          Ignore
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExplain(item)}
                        className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background/50"
                      >
                        Explain this
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/restaurant/valora-intelligence/alerts?source=${encodeURIComponent(
              source
            )}&location_id=${encodeURIComponent(
              locationId ?? ""
            )}&day=${encodeURIComponent(day ?? "")}${
              riskType ? `&risk_type=${encodeURIComponent(riskType)}` : ""
            }`}
            className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background/50"
          >
            View related alerts
          </Link>
        </div>
      </SectionCard>

      {explainOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
          <div className="h-full w-full max-w-[560px] overflow-y-auto border-l border-border bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-foreground">
                  Explain Insight
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {explainTitle}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExplainOpen(false)}
                className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background/50"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              {explainLoading ? (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted/30" />
                  <div className="mt-2 h-3 w-[92%] animate-pulse rounded bg-muted/30" />
                  <div className="mt-2 h-3 w-[84%] animate-pulse rounded bg-muted/30" />
                </div>
              ) : explainError ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-foreground">
                  <div className="font-medium">Unable to explain this insight</div>
                  <div className="mt-1 text-muted-foreground">
                    {explainError}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {explainText || "No explanation available."}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-border/50 pt-6">
              <div className="text-sm font-semibold text-foreground">Ask AI</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Ask a follow-up question about this insight, its drivers, or the
                next best action.
              </div>

              <div className="mt-4 space-y-3">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  rows={4}
                  placeholder="Why is this happening, and what should I do first?"
                  className="w-full rounded-2xl border border-border/60 bg-background/30 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => activeInsight && handleAskAi(activeInsight)}
                    disabled={
                      chatLoading || !chatInput.trim() || !activeInsight
                    }
                    className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs font-semibold text-foreground hover:bg-background/50 disabled:opacity-50"
                  >
                    {chatLoading ? "Asking..." : "Ask AI"}
                  </button>
                </div>

                {chatError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-foreground">
                    <div className="font-medium">
                      Unable to get AI response
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {chatError}
                    </div>
                  </div>
                ) : null}

                {chatResponse ? (
                  <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                    {chatResponse}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}