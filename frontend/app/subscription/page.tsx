"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

type BillingInterval = "monthly" | "annual";
type PlanKey = "starter" | "growth" | "enterprise";

type CheckoutResp =
  | { ok: true; checkout_url?: string; checkout_session_id?: string }
  | { ok: false; error?: string; detail?: string };

function safeJson(text: string, status: number) {
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON (${status}). BodyPreview=${text.slice(0, 160)}`); }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground">
      {children}
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 text-[11px] text-foreground">
        ✓
      </span>
      <span className="leading-6">{children}</span>
    </div>
  );
}

type Plan = {
  key: PlanKey;
  name: string;
  badge: string;
  price: string;
  period: string;
  addon: string | null;
  description: string;
  highlight?: boolean;
  isEnterprise?: boolean;
  features: string[];
};

const PLANS: Record<BillingInterval, Plan[]> = {
  monthly: [
    {
      key: "starter", name: "Starter", badge: "Perfect for single location",
      price: "$49", period: "/month", addon: "+ $29/mo per additional location",
      description: "Everything you need to connect your POS and get real-time visibility into your restaurant's performance.",
      features: ["1 tenant + 1 location included", "Real-time POS sync (Square & Clover)", "Basic KPI dashboard", "Daily sales summary", "Exception alerts", "14-day free trial"],
    },
    {
      key: "growth", name: "Growth", badge: "Most popular",
      price: "$149", period: "/month", addon: "+ $25/mo per additional location",
      description: "Built for multi-location operators who need advanced analytics, forecasting, and executive reporting.",
      highlight: true,
      features: ["1 tenant + 5 locations included", "Everything in Starter", "Advanced analytics suite", "Forecasting signals", "Benchmarking layers", "Executive reporting pack", "Multi-POS support", "14-day free trial"],
    },
    {
      key: "enterprise", name: "Enterprise", badge: "For large groups",
      price: "Custom", period: "", addon: null,
      description: "Tailored for large restaurant groups and chains with unlimited locations, dedicated support, and custom integrations.",
      isEnterprise: true,
      features: ["Unlimited locations", "Everything in Growth", "AI-powered insights", "Custom integrations", "Dedicated support manager", "SLA guarantee", "White-label option", "Full API access"],
    },
  ],
  annual: [
    {
      key: "starter", name: "Starter", badge: "1 month free",
      price: "$539", period: "/year", addon: "+ $319/yr per additional location",
      description: "Everything you need to connect your POS and get real-time visibility into your restaurant's performance.",
      features: ["1 tenant + 1 location included", "Real-time POS sync (Square & Clover)", "Basic KPI dashboard", "Daily sales summary", "Exception alerts", "14-day free trial", "Save $49 vs monthly"],
    },
    {
      key: "growth", name: "Growth", badge: "Best annual value",
      price: "$1,639", period: "/year", addon: "+ $275/yr per additional location",
      description: "Built for multi-location operators who need advanced analytics, forecasting, and executive reporting.",
      highlight: true,
      features: ["1 tenant + 5 locations included", "Everything in Starter", "Advanced analytics suite", "Forecasting signals", "Benchmarking layers", "Executive reporting pack", "Multi-POS support", "14-day free trial", "Save $149 vs monthly"],
    },
    {
      key: "enterprise", name: "Enterprise", badge: "For large groups",
      price: "Custom", period: "", addon: null,
      description: "Tailored for large restaurant groups and chains with unlimited locations, dedicated support, and custom integrations.",
      isEnterprise: true,
      features: ["Unlimited locations", "Everything in Growth", "AI-powered insights", "Custom integrations", "Dedicated support manager", "SLA guarantee", "White-label option", "Full API access"],
    },
  ],
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = React.useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = React.useState<PlanKey>("starter");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const visiblePlans = PLANS[billingInterval];

  async function startCheckout() {
    if (selectedPlan === "enterprise") {
      window.location.href = "mailto:sales@valoraai.com?subject=Enterprise Plan Inquiry";
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const me = safeJson(await meRes.text(), meRes.status);
      if (!meRes.ok || !me?.ok || !me?.user?.tenant_id) {
        throw new Error("Tenant context not found. Please complete tenant setup first.");
      }
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenant_id: me.user.tenant_id, plan_code: selectedPlan, billing_interval: billingInterval, quantity: 1 }),
      });
      const j = safeJson(await res.text(), res.status) as CheckoutResp;
      if (!("ok" in j) || !j.ok) throw new Error((j as any)?.detail || (j as any)?.error || "Checkout failed");
      if (!j.checkout_url) throw new Error("Stripe checkout URL was not returned");
      window.location.href = j.checkout_url;
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBusy(false);
    }
  }

  const selectedPlanData = visiblePlans.find((p) => p.key === selectedPlan);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">

      {/* No backHref — no back button in top right */}
      <OnboardingStepHeader
        currentStep="subscription"
        title="Choose your plan"
        subtitle="Start with a 14-day free trial. No credit card required until trial ends."
      />

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[1.4fr_0.6fr]">

        {/* ── Left card ── */}
        <GlassCardGlow className="p-6 md:p-8">

          {/* Pills */}
          <div className="flex flex-wrap gap-2">
            <Pill>14-day free trial</Pill>
            <Pill>Cancel anytime</Pill>
          </div>

          {/* Title */}
          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Choose your plan
          </div>
          <div className="mt-2 text-sm leading-7 text-muted-foreground">
            Pricing is per location. Start with one and add more as your business grows.
          </div>

          {err ? <div className="mt-4"><FormMessage type="error">{err}</FormMessage></div> : null}

          {/* Billing toggle — centered above cards */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex rounded-2xl border border-border/60 bg-background/30 p-1">
              <button
                type="button"
                onClick={() => setBillingInterval("monthly")}
                className={["rounded-xl px-5 py-2 text-sm font-medium transition",
                  billingInterval === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("annual")}
                className={["flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-medium transition",
                  billingInterval === "annual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Annual
                {/* Black/white only — no emerald */}
                <span className="rounded-full border border-border/60 bg-background/40 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                  1 mo free
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards — equal height via flex-col */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {visiblePlans.map((p) => {
              const isSelected = selectedPlan === p.key;
              return (
                <button
                  key={`${billingInterval}-${p.key}`}
                  type="button"
                  onClick={() => setSelectedPlan(p.key)}
                  className={["group relative flex flex-col overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200",
                    isSelected
                      ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.20),0_0_16px_rgba(34,197,94,0.12)]"
                      : "border-border/60 bg-background/30 hover:border-border hover:bg-background/40",
                  ].join(" ")}
                >
                  <div className="pointer-events-none absolute inset-0">
                    <div className={["absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl transition",
                      isSelected ? "bg-emerald-500/10" : "bg-indigo-500/8",
                    ].join(" ")} />
                  </div>

                  <div className="relative flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-base font-semibold text-foreground">{p.name}</div>
                        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{p.badge}</div>
                      </div>
                      <div className={["flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                        isSelected ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-border/60 text-transparent",
                      ].join(" ")}>✓</div>
                    </div>

                    <div className="mt-4 flex items-end gap-1">
                      <div className="text-2xl font-semibold tracking-tight text-foreground">{p.price}</div>
                      {p.period && <div className="pb-0.5 text-xs text-muted-foreground">{p.period}</div>}
                    </div>

                    {p.addon && <div className="mt-1 text-[11px] text-muted-foreground">{p.addon}</div>}

                    <div className="mt-4 flex-1 space-y-1.5">
                      {p.features.slice(0, 4).map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="text-foreground">✓</span>{f}
                        </div>
                      ))}
                      {p.features.length > 4 && (
                        <div className="text-[11px] text-muted-foreground/60">+{p.features.length - 4} more features</div>
                      )}
                    </div>

                    {/* Recommended — black/white only */}
                    {p.highlight && (
                      <div className="mt-4 inline-flex self-start rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                        Recommended
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Summary bar */}
          <div className="mt-5 rounded-2xl border border-border/60 bg-background/30 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedPlanData?.name}</span>
                {" · "}
                <span className="font-semibold text-foreground">{billingInterval === "monthly" ? "Monthly" : "Annual"}</span>
                {" "}billing
                {selectedPlanData?.addon && <span className="ml-2 text-muted-foreground/60">· {selectedPlanData.addon}</span>}
              </div>
              <div className="text-sm font-semibold text-foreground">{selectedPlanData?.price}{selectedPlanData?.period}</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-5 flex gap-3">
            <Button variant="ghost" onClick={() => router.push("/onboarding/tenant")} disabled={busy}>Back</Button>
            <Button variant="primary" onClick={startCheckout} className="flex-1" disabled={busy} loading={busy}>
              {busy ? "Redirecting to Stripe..." : selectedPlan === "enterprise" ? "Contact sales →" : "Start 14-day free trial →"}
            </Button>
          </div>
        </GlassCardGlow>

        {/* ── Right card ── */}
        <GlassCardGlow className="p-6 md:p-8">
          <div className="text-xl font-semibold text-foreground">{selectedPlanData?.name} plan</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {selectedPlanData?.isEnterprise ? "Contact our team for a custom quote." : `${selectedPlanData?.price}${selectedPlanData?.period} · 14-day free trial`}
          </div>

          <div className="mt-5 space-y-2">
            {selectedPlanData?.features.map((f) => <Feature key={f}>{f}</Feature>)}
          </div>

          {selectedPlanData?.addon && (
            <div className="mt-5 rounded-2xl border border-border/50 bg-background/20 p-3">
              <div className="text-xs font-medium text-foreground">Additional locations</div>
              <div className="mt-1 text-xs text-muted-foreground">{selectedPlanData.addon}</div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {[
              { title: "14-day free trial", body: "No charge until your trial ends. Cancel anytime before that." },
              { title: "Stripe-secured checkout", body: "Payment details are handled securely by Stripe. We never store card information." },
              { title: "POS connection next", body: "After checkout, connect your Square or Clover POS to start syncing data." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-border/50 bg-background/30 p-3">
                <div className="text-xs font-semibold text-foreground">{c.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.body}</div>
              </div>
            ))}
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}
