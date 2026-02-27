// app/billing/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { ensureGate, setFlag } from "@/lib/va-session";

export default function BillingPage() {
  const r = useRouter();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const g = ensureGate("auth");
    if (!g.ok && g.redirectTo) r.replace(g.redirectTo);
  }, [r]);

  function subscribe() {
    setLoading(true);
    setTimeout(() => {
      setFlag("va_subscribed", true);
      r.push("/onboarding");
    }, 450);
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Subscription"
        subtitle="Select a plan to activate dashboards for your team."
        right={
          <Link href="/" className="text-xs font-semibold text-foreground hover:underline">
            ← Home
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {[
            { name: "Starter", price: "$199/mo", tag: "Single location" },
            { name: "Growth", price: "$599/mo", tag: "Multi-location" },
            { name: "Enterprise", price: "Custom", tag: "Security + SSO" },
          ].map((p) => (
            <div key={p.name} className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="text-sm font-semibold text-foreground">{p.name}</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{p.price}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.tag}</div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div>• KPI dashboards</div>
                <div>• Exceptions & alerts</div>
                <div>• Actions + drivers</div>
              </div>

              <button
                onClick={subscribe}
                disabled={loading}
                className="mt-5 h-10 w-full rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Activating…" : "Choose plan →"}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}