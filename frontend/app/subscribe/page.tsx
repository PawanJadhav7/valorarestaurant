// app/subscribe/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

function PlanCard({
  title,
  price,
  note,
  cta,
  onPick,
  featured,
}: {
  title: string;
  price: string;
  note: string;
  cta: string;
  onPick: () => void;
  featured?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {featured ? (
          <span className="rounded-full border border-border bg-background/30 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            Recommended
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-3xl font-semibold text-foreground">{price}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      <button
        onClick={onPick}
        className={[
          "mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold",
          featured ? "bg-foreground text-background hover:opacity-90" : "bg-background/30 text-foreground hover:bg-muted/40",
        ].join(" ")}
      >
        {cta}
      </button>
    </div>
  );
}

export default function SubscribePage() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function pickPlan() {
    setBusy(true);
    // placeholder: simulate payment success
    await new Promise((r) => setTimeout(r, 500));
    setBusy(false);
    router.push("/onboarding");
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <SectionCard title="Subscription" subtitle="Choose a plan to unlock onboarding. (Placeholder checkout)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PlanCard title="Pilot" price="$199" note="/month • 1 location" cta={busy ? "Processing…" : "Select Pilot"} onPick={pickPlan} />
          <PlanCard
            title="Growth"
            price="$499"
            note="/month • up to 5 locations"
            cta={busy ? "Processing…" : "Select Growth"}
            onPick={pickPlan}
            featured
          />
          <PlanCard title="Enterprise" price="Custom" note="SSO • connectors • SLA" cta={busy ? "Processing…" : "Contact sales"} onPick={pickPlan} />
        </div>
      </SectionCard>
    </div>
  );
}