// app/subscription/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { RequireSession } from "@/components/auth/RequireSession";
import type { PlanTier } from "@/lib/sim/types";
import { getSession, isDemoMode, loadDb, getClient, setPlanForClient } from "@/lib/sim/store";

function PlanButton({
  title,
  desc,
  onClick,
  primary,
  disabled,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full rounded-2xl border border-border bg-background/30 p-5 text-left transition hover:bg-muted/40",
        primary ? "shadow-[0_10px_40px_rgba(0,0,0,0.10)]" : "shadow-[0_6px_24px_rgba(0,0,0,0.06)]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </button>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const demo = typeof window !== "undefined" ? isDemoMode() : false;

  const [plan, setPlan] = React.useState<PlanTier>("FREE");

  React.useEffect(() => {
    const s = getSession();
    if (!s?.ok) return;

    const db = loadDb();
    const client = getClient(db, s.clientId);
    if (client?.plan) setPlan(client.plan);
  }, []);

  const pickPlan = (p: PlanTier) => {
    const s = getSession();
    if (!s?.ok) return;
    setPlan(p);
    setPlanForClient(s.clientId, p);
  };

  const continueNext = () => {
    // subscription complete -> onboarding
    router.push("/onboarding");
  };

  return (
    <RequireSession>
      <div className="mx-auto max-w-[1000px] px-4 py-10">
        <SectionCard title="Subscription" subtitle="Pick a plan to continue (demo simulation).">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <PlanButton
              title={`Free ${plan === "FREE" ? "• Selected" : ""}`}
              desc="Core KPIs + trends. Includes demo credits."
              onClick={() => pickPlan("FREE")}
              disabled={plan === "FREE"}
            />
            <PlanButton
              title={`Premium ${plan === "PREMIUM" ? "• Selected" : ""}`}
              desc="Multi-location rollups, alerts, priority onboarding. Includes more credits."
              onClick={() => pickPlan("PREMIUM")}
              primary
              disabled={plan === "PREMIUM"}
            />
            <PlanButton
              title={demo ? `Custom ${plan === "CUSTOM" ? "• Selected (Demo)" : ""}` : "Custom • Talk to Sales"}
              desc={demo ? "Enabled in demo mode. Highest credits + enterprise controls." : "Enterprise tier. Contact sales to enable."}
              onClick={() => (demo ? pickPlan("CUSTOM") : undefined)}
              disabled={!demo || plan === "CUSTOM"}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={continueNext}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
            >
              Continue to onboarding →
            </button>

            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background/30 px-4 text-sm font-semibold text-foreground hover:bg-muted/40"
            >
              Back to Home
            </Link>
          </div>

          {!demo ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted-foreground">
              Tip: enable Custom in demo by adding <span className="text-foreground">?demo=1</span> to the URL.
            </div>
          ) : null}
        </SectionCard>
      </div>
    </RequireSession>
  );
}