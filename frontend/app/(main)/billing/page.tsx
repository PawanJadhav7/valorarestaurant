// frontend/app/billing/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

type NextStep = "signin" | "tenant" | "billing" | "onboarding" | "dashboard";

type AuthStatus = {
  ok: boolean;
  user_id?: string | null;
  email?: string | null;
  tenant_id?: string | null;
  has_tenant?: boolean;
  subscription_active: boolean;
  onboarding_done: boolean;
  onboarding_status?: string | null;
  next_step?: NextStep;
};

const NEXT_STEP_ROUTE: Record<NextStep, string> = {
  signin: "/signin",
  tenant: "/onboarding/tenant",
  billing: "/billing",
  onboarding: "/onboarding",
  dashboard: "/restaurant",
};

export default function BillingPage() {
  const router = useRouter();

  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setSessionLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/status", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/signin");
          return;
        }

        const j = (await res.json()) as AuthStatus;
        if (cancelled) return;

        if (!j?.ok) {
          router.replace("/signin");
          return;
        }

        const nextStep = j.next_step ?? "signin";

        if (nextStep !== "billing") {
          router.replace(NEXT_STEP_ROUTE[nextStep]);
          return;
        }

        if (!j.tenant_id) {
          setTenantId(null);
          setError("Tenant workspace not found. Complete tenant setup first.");
          return;
        }

        setTenantId(j.tenant_id);
      } catch (e: any) {
        if (!cancelled) {
          setTenantId(null);
          setError(e?.message ?? "Failed to load billing session");
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function subscribe(planCode: string) {
    if (!tenantId) {
      setError("Missing tenant workspace. Complete tenant setup first.");
      return;
    }

    if (planCode === "enterprise") {
      window.location.href = "mailto:sales@valora.ai";
      return;
    }

    setLoadingPlan(planCode);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantId,
        },
        credentials: "include",
        body: JSON.stringify({
          tenant_id: tenantId,
          plan_code: planCode,
          billing_interval: "monthly",
          quantity: 1,
        }),
      });

      const j = await res.json();

      if (!j.checkout_url) {
        throw new Error(j.detail || "Subscription failed");
      }

      window.location.href = j.checkout_url;
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      setError(e?.message ?? "Stripe checkout failed");
      setLoadingPlan(null);
    }
  }

  const plans = [
    {
      code: "starter",
      name: "Starter",
      price: "$199",
      desc: "Perfect for single-location restaurants",
      features: [
        "KPI dashboards",
        "Exceptions & alerts",
        "Cost analytics",
        "Operational insights",
      ],
    },
    {
      code: "growth",
      name: "Growth",
      price: "$499",
      desc: "Built for scaling restaurant groups",
      highlight: true,
      features: [
        "Everything in Starter",
        "Forecasting engine",
        "Benchmarking analytics",
        "Executive reports",
      ],
    },
    {
      code: "enterprise",
      name: "Enterprise",
      price: "Custom",
      desc: "Enterprise-grade deployment",
      features: [
        "Multi-brand analytics",
        "SSO + security controls",
        "Dedicated infrastructure",
        "Priority support",
      ],
    },
  ];

  return (
    <div className="pt-16 space-y-6">
      <SectionCard
        title="Valora Pricing"
        subtitle="Start your 7-day free trial. Cancel anytime."
        right={
          <Link
            href="/"
            className="text-xs font-semibold text-foreground hover:underline"
          >
            ← Home
          </Link>
        }
      >
        {!sessionLoading && error ? (
          <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.code}
              className={`
                relative rounded-2xl border p-6 backdrop-blur-xl
                bg-white/5 border-white/10 shadow-xl
                transition duration-200 hover:scale-[1.02] hover:shadow-2xl
                ${p.highlight ? "ring-2 ring-indigo-500/40" : ""}
              `}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-5 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}

              <div className="text-sm font-semibold text-foreground">{p.name}</div>

              <div className="mt-3 flex items-end gap-1">
                <div className="text-3xl font-bold text-foreground">{p.price}</div>
                {p.price !== "Custom" && (
                  <div className="text-sm text-muted-foreground">/mo</div>
                )}
              </div>

              <div className="mt-1 text-sm text-muted-foreground">{p.desc}</div>

              <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                {p.features.map((f) => (
                  <div key={f}>• {f}</div>
                ))}
              </div>

              <button
                onClick={() => subscribe(p.code)}
                disabled={sessionLoading || loadingPlan === p.code || !tenantId}
                className={`
                  mt-6 h-11 w-full rounded-xl text-sm font-semibold
                  transition disabled:opacity-60
                  ${
                    p.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-foreground text-background hover:opacity-90"
                  }
                `}
              >
                {sessionLoading
                  ? "Loading workspace..."
                  : loadingPlan === p.code
                  ? "Activating..."
                  : p.code === "enterprise"
                  ? "Contact Sales"
                  : !tenantId
                  ? "Tenant setup required"
                  : "Start 7-day trial →"}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}