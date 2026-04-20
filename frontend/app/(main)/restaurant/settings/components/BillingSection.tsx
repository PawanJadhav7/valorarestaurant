"use client";

import * as React from "react";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";

type SubscriptionSummary = {
  ok: boolean;
  current?: {
    tenant_id: string;
    plan_code: string | null;
    billing_interval: string | null;
    subscription_status: string | null;
    stripe_status: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    access_expires_at: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    updated_at: string | null;
  };
  pending_change?: {
    subscription_change_id: string;
    tenant_id: string;
    change_type: string;
    change_status: string;
    current_plan_code: string | null;
    current_billing_interval: string | null;
    requested_plan_code: string;
    requested_billing_interval: string;
    effective_mode: string;
    effective_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  } | null;
  history?: Array<{
    subscription_change_id: string;
    tenant_id: string;
    change_type: string;
    change_status: string;
    current_plan_code: string | null;
    current_billing_interval: string | null;
    requested_plan_code: string;
    requested_billing_interval: string;
    effective_mode: string;
    effective_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    applied_at: string | null;
    canceled_at: string | null;
    notes: string | null;
  }>;
  error?: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function toTitle(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function StatusBadge({ value }: { value?: string | null }) {
  const v = String(value || "").toLowerCase();

  const styles =
    v === "active" || v === "trial" || v === "trialing"
      ? "border-emerald-400/40 bg-emerald-500/10 text-foreground"
      : v === "past_due"
      ? "border-amber-400/40 bg-amber-500/10 text-foreground"
      : v === "canceled"
      ? "border-red-400/40 bg-red-500/10 text-foreground"
      : "border-border/60 bg-background/40 text-foreground";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        styles,
      ].join(" ")}
    >
      {toTitle(value)}
    </span>
  );
}

function MiniRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-background/25 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function HistoryTable({
  rows,
}: {
  rows: NonNullable<SubscriptionSummary["history"]>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/50 bg-background/20">
      <table className="min-w-full text-sm">
        <thead className="border-b border-border/50 bg-background/30 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">From</th>
            <th className="px-4 py-3 font-medium">To</th>
            <th className="px-4 py-3 font-medium">Mode</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Effective</th>
            <th className="px-4 py-3 font-medium">Applied</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.subscription_change_id}
              className="border-b border-border/40 last:border-b-0"
            >
              <td className="px-4 py-3 text-foreground">{toTitle(row.change_type)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {toTitle(row.current_plan_code)} /{" "}
                {toTitle(row.current_billing_interval)}
              </td>
              <td className="px-4 py-3 text-foreground">
                {toTitle(row.requested_plan_code)} /{" "}
                {toTitle(row.requested_billing_interval)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {toTitle(row.effective_mode)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge value={row.change_status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmtDate(row.effective_at)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmtDate(row.applied_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BillingSection() {
  const [summary, setSummary] = React.useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [requestedPlanCode, setRequestedPlanCode] = React.useState("starter");
  const [requestedBillingInterval, setRequestedBillingInterval] =
    React.useState("monthly");

  const changePlanRef = React.useRef<HTMLDivElement | null>(null);

  const loadSummary = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscription/summary", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const text = await res.text();
      const data = JSON.parse(text) as SubscriptionSummary;

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load subscription summary");
      }

      setSummary(data);
      setRequestedPlanCode(data.current?.plan_code || "starter");
      setRequestedBillingInterval(data.current?.billing_interval || "monthly");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load subscription summary");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function submitChange() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/subscription/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requested_plan_code: requestedPlanCode,
          requested_billing_interval: requestedBillingInterval,
        }),
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok || !data?.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : typeof data?.detail === "string"
            ? data.detail
            : typeof data?.detail?.message === "string"
            ? data.detail.message
            : "Failed to request subscription change";

        throw new Error(message);
      }

      const applied = data?.applied_result?.applied === true;

      setSuccess(
        applied
          ? "Subscription change applied successfully."
          : "Subscription change requested successfully."
      );

      await loadSummary();
    } catch (e: any) {
      setError(e?.message ?? "Failed to request subscription change");
    } finally {
      setSubmitting(false);
    }
  }

  const current = summary?.current;
  const pending = summary?.pending_change;
  const history = summary?.history ?? [];

  return (
    <div className="space-y-6">
      {error ? <FormMessage type="error">{error}</FormMessage> : null}
      {success ? <FormMessage type="success">{success}</FormMessage> : null}

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[1fr_1fr]">
        <GlassCardGlow className="h-full border border-border/40 p-6 md:p-8">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-foreground">
                  Current Plan
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Your live billing state and renewal details.
                </div>
              </div>

              <Button
                variant="ghost"
                type="button"
                onClick={loadSummary}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            <div className="mt-6 rounded-2xl border border-border/50 bg-background/20 p-4">
              <div className="text-sm font-semibold text-foreground">
                Plan details
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <MiniRow
                  label="Plan"
                  value={loading ? "Loading..." : `${toTitle(current?.plan_code)}`}
                />
                <MiniRow
                  label="Billing Interval"
                  value={
                    loading ? "Loading..." : toTitle(current?.billing_interval)
                  }
                />
                <MiniRow
                  label="Subscription Status"
                  value={<StatusBadge value={current?.subscription_status} />}
                />
                <MiniRow
                  label="Stripe Status"
                  value={<StatusBadge value={current?.stripe_status} />}
                />
              </div>
            </div>

            {current?.subscription_status === "trial" && current?.trial_ends_at ? (
              <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-foreground">
                    Your Valora trial ends on{" "}
                    <span className="font-semibold">
                      {fmtDateOnly(current.trial_ends_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRequestedPlanCode("growth");
                      setRequestedBillingInterval(
                        current?.billing_interval || "monthly"
                      );
                      changePlanRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                    className="text-sm font-semibold text-foreground hover:opacity-80"
                  >
                    Upgrade now
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-border/50 bg-background/20 p-4">
              <div className="text-sm font-semibold text-foreground">
                Renewal details
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <MiniRow
                  label="Current Period End"
                  value={
                    loading ? "Loading..." : fmtDate(current?.current_period_end)
                  }
                />
                <MiniRow
                  label="Trial Ends At"
                  value={loading ? "Loading..." : fmtDate(current?.trial_ends_at)}
                />
              </div>
            </div>
          </div>
        </GlassCardGlow>

        <div ref={changePlanRef} className="h-full">
          <GlassCardGlow className="flex h-full flex-col border border-border/40 p-6 md:p-8">
            <div className="text-xl font-semibold text-foreground">
              Request Plan Change
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Upgrades apply immediately. Downgrades and interval changes apply
              next billing cycle.
            </div>

            <div className="mt-6 rounded-2xl border border-border/50 bg-background/20 p-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Plan
                  </label>
                  <select
                    value={requestedPlanCode}
                    onChange={(e) => setRequestedPlanCode(e.target.value)}
                    className="w-full rounded-2xl border border-border/60 bg-background/30 px-4 py-3 text-sm text-foreground outline-none"
                    disabled={submitting || loading}
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Billing Interval
                  </label>
                  <select
                    value={requestedBillingInterval}
                    onChange={(e) => setRequestedBillingInterval(e.target.value)}
                    className="w-full rounded-2xl border border-border/60 bg-background/30 px-4 py-3 text-sm text-foreground outline-none"
                    disabled={submitting || loading}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <Button
                  variant="primary"
                  type="button"
                  onClick={submitChange}
                  disabled={submitting || loading}
                  loading={submitting}
                  className="h-12"
                >
                  {submitting ? "Submitting..." : "Request Change"}
                </Button>
              </div>
            </div>

            <div className="mt-5 flex-1 rounded-2xl border border-border/50 bg-background/20 p-4">
              <div className="text-sm font-semibold text-foreground">
                Plan snapshot
              </div>

              <div className="mt-3 space-y-3">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-background/20 px-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Starter
                    </div>
                    <div className="text-xs text-muted-foreground">
                      KPI visibility and core operating insights
                    </div>
                  </div>
                  <div className="text-right text-sm text-foreground">
                    <div>$199/mo</div>
                    <div className="text-xs text-muted-foreground">$1,990/yr</div>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-background/20 px-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Growth
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Forecasting, benchmarking, and executive reporting
                    </div>
                  </div>
                  <div className="text-right text-sm text-foreground">
                    <div>$499/mo</div>
                    <div className="text-xs text-muted-foreground">$4,990/yr</div>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-background/20 px-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Enterprise
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Custom pricing for advanced multi-unit operations
                    </div>
                  </div>
                  <div className="text-right text-sm text-foreground">
                    <div>Custom</div>
                    <div className="text-xs text-muted-foreground">
                      Contact sales
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCardGlow>
        </div>
      </div>

      <GlassCardGlow className="border border-border/40 p-6 md:p-8">
        <div className="text-xl font-semibold text-foreground">
          Pending Change
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Any scheduled or pending change will appear here.
        </div>

        <div className="mt-5">
          {!pending ? (
            <div className="rounded-2xl border border-border/50 bg-background/20 px-4 py-4 text-sm text-muted-foreground">
              No pending subscription change.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <MiniRow label="Type" value={toTitle(pending.change_type)} />
              <MiniRow
                label="Requested Plan"
                value={`${toTitle(pending.requested_plan_code)} / ${toTitle(
                  pending.requested_billing_interval
                )}`}
              />
              <MiniRow
                label="Effective Mode"
                value={toTitle(pending.effective_mode)}
              />
              <MiniRow
                label="Effective At"
                value={fmtDate(pending.effective_at)}
              />
              <MiniRow
                label="Status"
                value={<StatusBadge value={pending.change_status} />}
              />
            </div>
          )}
        </div>
      </GlassCardGlow>

      <GlassCardGlow className="border border-border/40 p-6 md:p-8">
        <div className="text-xl font-semibold text-foreground">
          Subscription History
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Audit trail of applied and scheduled billing changes.
        </div>

        <div className="mt-5">
          <div className="max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border/40">
            {loading ? (
              <div className="rounded-2xl border border-border/50 bg-background/20 px-4 py-4 text-sm text-muted-foreground">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-border/50 bg-background/20 px-4 py-4 text-sm text-muted-foreground">
                No subscription history available.
              </div>
            ) : (
              <HistoryTable rows={history} />
            )}
          </div>
        </div>
      </GlassCardGlow>
    </div>
  );
}