"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

type BillingInterval = "monthly" | "annual";
type PlanKey = "starter" | "growth";

type CheckoutResp =
  | {
      ok: true;
      checkout_url?: string;
      checkout_session_id?: string;
    }
  | {
      ok: false;
      error?: string;
      detail?: string;
    };

function safeJson(text: string, status: number) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80">
      {children}
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background/40 text-[11px] text-emerald-300">
        ✓
      </span>
      <span className="leading-6">{children}</span>
    </div>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();

  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>("starter");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const plans: Record<
    BillingInterval,
    Array<{
      key: PlanKey;
      name: string;
      badge: string;
      price: string;
      period: string;
      description: string;
      highlight?: boolean;
      features: string[];
    }>
  > = {
    monthly: [
      {
        key: "starter",
        name: "Starter",
        badge: "Best for single location",
        price: "$199",
        period: "/month",
        description:
          "Focused KPI visibility and daily operating clarity without unnecessary complexity.",
        features: [
          "Executive KPI dashboard",
          "Watchpoints & exception alerts",
          "Cost analytics foundations",
          "14-day free trial",
        ],
      },
      {
        key: "growth",
        name: "Growth",
        badge: "Most popular",
        price: "$499",
        period: "/month",
        description:
          "Built for multi-location operators who need visibility, forecasting, and better decision support.",
        highlight: true,
        features: [
          "Everything in Starter",
          "Forecasting signals",
          "Benchmarking layers",
          "Executive reporting pack",
        ],
      },
    ],
    annual: [
      {
        key: "starter",
        name: "Starter",
        badge: "Annual value",
        price: "$1,990",
        period: "/year",
        description:
          "Lower annual cost for stable operators who want predictable planning.",
        features: [
          "Executive KPI dashboard",
          "Watchpoints & exception alerts",
          "Cost analytics foundations",
          "Annual billing discount",
        ],
      },
      {
        key: "growth",
        name: "Growth",
        badge: "Best annual value",
        price: "$4,990",
        period: "/year",
        description:
          "Optimized for growth-stage restaurant groups with year-round visibility.",
        highlight: true,
        features: [
          "Everything in Starter",
          "Forecasting signals",
          "Benchmarking layers",
          "Executive reporting pack",
        ],
      },
    ],
  };

  const visiblePlans = plans[billingInterval];

  async function startCheckout() {
    setErr(null);
    setBusy(true);

    try {
      const meRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      const meRaw = await meRes.text();
      const me = safeJson(meRaw, meRes.status);

      if (!meRes.ok || !me?.ok || !me?.user?.tenant_id) {
        throw new Error("Tenant context not found. Please complete tenant setup first.");
      }

      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: me.user.tenant_id,
          plan_code: selectedPlan,
          billing_interval: billingInterval,
          quantity: 1,
        }),
      });

      const raw = await res.text();
      const j = safeJson(raw, res.status) as CheckoutResp;

      if (!("ok" in j) || !j.ok) {
        throw new Error((j as any)?.detail || (j as any)?.error || "Checkout failed");
      }

      if (!j.checkout_url) {
        throw new Error("Stripe checkout URL was not returned");
      }

      window.location.href = j.checkout_url;
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <OnboardingStepHeader
        currentStep="subscription"
        title="Choose your plan"
        subtitle="Activate your trial through Stripe before connecting POS data."
        backHref="/onboarding/tenant"
      />

      <div className="grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCardGlow className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <Pill>14-day trial</Pill>
            <Pill>Stripe checkout</Pill>
            <Pill>Cancel anytime</Pill>
          </div>

          <div className="mt-6 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Choose your plan
          </div>

          <div className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Select a plan to start your Stripe-managed trial. After successful checkout, you’ll continue to the POS onboarding step.
          </div>

          {err ? (
            <div className="mt-5">
              <FormMessage type="error">{err}</FormMessage>
            </div>
          ) : null}

          <div className="mt-6">
            <div className="mb-4 inline-flex rounded-2xl border border-border/60 bg-background/30 p-1">
              <button
                type="button"
                onClick={() => setBillingInterval("monthly")}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  billingInterval === "monthly"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setBillingInterval("annual")}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  billingInterval === "annual"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Yearly
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {visiblePlans.map((p) => {
                const isSelected = selectedPlan === p.key;

                return (
                  <button
                    key={`${billingInterval}-${p.key}`}
                    type="button"
                    onClick={() => setSelectedPlan(p.key)}
                    className={[
                      "group relative overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200",
                      isSelected
                        ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.20),0_0_16px_rgba(34,197,94,0.12)]"
                        : "border-border/60 bg-background/30 hover:border-border hover:bg-background/40",
                    ].join(" ")}
                  >
                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className={[
                          "absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl transition",
                          isSelected ? "bg-emerald-500/10" : "bg-indigo-500/8",
                        ].join(" ")}
                      />
                    </div>

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-foreground">{p.name}</div>
                          <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {p.badge}
                          </div>
                        </div>

                        <div
                          className={[
                            "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                            isSelected
                              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                              : "border-border/60 text-muted-foreground",
                          ].join(" ")}
                        >
                          {isSelected ? "✓" : ""}
                        </div>
                      </div>

                      <div className="mt-4 flex items-end gap-1">
                        <div className="text-3xl font-semibold tracking-tight text-foreground">
                          {p.price}
                        </div>
                        <div className="pb-1 text-sm text-muted-foreground">{p.period}</div>
                      </div>

                      <div className="mt-3 text-sm leading-6 text-muted-foreground">
                        {p.description}
                      </div>

                      <div className="mt-5 space-y-2">
                        {p.features.map((f) => (
                          <Feature key={f}>{f}</Feature>
                        ))}
                      </div>

                      {p.highlight ? (
                        <div className="mt-5 inline-flex rounded-full border border-border/60 bg-background/30 px-3 py-1 text-[11px] font-semibold text-foreground/80">
                          Recommended
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {visiblePlans.find((x) => x.key === selectedPlan)?.name}
            </span>{" "}
            selected ·{" "}
            <span className="font-semibold text-foreground">
              {billingInterval === "monthly" ? "monthly" : "yearly"}
            </span>{" "}
            billing.
          </div>

          <div className="mt-5 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => router.push("/onboarding/tenant")}
              disabled={busy}
            >
              Back
            </Button>

            <Button
              variant="primary"
              onClick={startCheckout}
              className="flex-1"
              disabled={busy}
              loading={busy}
            >
              {busy ? "Redirecting to Stripe..." : "Start free trial →"}
            </Button>
          </div>
        </GlassCardGlow>

        <GlassCardGlow className="p-6 md:p-8">
          <div className="space-y-4">
            <div className="text-xl font-semibold text-foreground">What happens next</div>

            <div className="text-sm leading-7 text-muted-foreground">
              Stripe manages the checkout and trial activation. Once the checkout succeeds, you’ll return to continue with POS onboarding before entering the dashboard.
            </div>

            <div className="grid gap-3 pt-2">
              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <div className="text-sm font-semibold text-foreground">Stripe checkout</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Your selected plan and billing interval are passed into Stripe securely.
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <div className="text-sm font-semibold text-foreground">Trial activation</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  After success, the trial is activated and subscription state is written back to your tenant.
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <div className="text-sm font-semibold text-foreground">POS onboarding</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Once billing is valid, you continue to POS onboarding and then finish the setup flow.
                </div>
              </div>
            </div>
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}