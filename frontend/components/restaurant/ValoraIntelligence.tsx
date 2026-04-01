import { SectionCard } from "@/components/valora/SectionCard";

type Severity = "good" | "warn" | "risk";

type Alert = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
};

type Action = {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  rationale: string;
  owner?: string;
};

export function ValoraIntelligence({
  alerts,
  actions,
}: {
  alerts: Alert[];
  actions: Action[];
}) {
  return (
    <SectionCard
      title="Valora Intelligence"
      subtitle="What needs attention and what actions to take."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        
        {/* LEFT: ATTENTION REQUIRED */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-foreground">
            Attention Required
          </div>
          <div className="text-xs text-muted-foreground">
            Critical alerts and exceptions across operations.
          </div>

          {alerts.length ? (
            <div className="space-y-3">
              {alerts.slice(0, 8).map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-3 ${
                    a.severity === "risk"
                      ? "border-red-500/30 bg-red-500/10"
                      : a.severity === "warn"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-emerald-500/30 bg-emerald-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {a.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {a.detail}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium">
                      {a.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No critical issues detected.
            </div>
          )}
        </div>

        {/* RIGHT: ACTIONS */}
        <div className="space-y-3 xl:border-l xl:border-border/40 xl:pl-6">
          <div className="text-sm font-semibold text-foreground">
            Recommended Actions
          </div>
          <div className="text-xs text-muted-foreground">
            AI-driven actions prioritized for execution.
          </div>

          {actions.length ? (
            <div className="space-y-3">
              {actions.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-background text-xs">
                          {a.priority}
                        </span>
                        {a.title}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {a.rationale}
                      </div>
                    </div>

                    {a.owner && (
                      <span className="shrink-0 rounded-xl border border-border/30 bg-background/30 px-2 py-1 text-[11px] text-muted-foreground">
                        {a.owner}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              No recommended actions available.
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}