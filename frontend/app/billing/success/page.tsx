// frontend/app/billing/success/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [countdown, setCountdown] = React.useState(3);

  React.useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const redirectTimer = window.setTimeout(() => {
      router.replace("/post-login");
      router.refresh();
    }, 3000);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="pt-16 space-y-6">
      <SectionCard
        title="Subscription activated"
        subtitle="Your Valora plan is being finalized."
        right={
          <Link
            href="/billing"
            className="text-xs font-semibold text-foreground hover:underline"
          >
            ← Back to Billing
          </Link>
        }
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
              ✓
            </div>

            <div className="space-y-3">
              <div className="text-lg font-semibold text-foreground">
                Payment successful
              </div>

              <div className="text-sm text-muted-foreground">
                Stripe has confirmed your checkout. We’re syncing your
                subscription, plan access, and feature entitlements now.
              </div>

              {sessionId && (
                <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
                  Session ID: <span className="font-mono">{sessionId}</span>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Redirecting to your workspace in {countdown}...
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    router.replace("/post-login");
                    router.refresh();
                  }}
                  className="h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
                >
                  Continue to workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-16 space-y-6">
          <SectionCard
            title="Subscription activated"
            subtitle="Your Valora plan is being finalized."
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl text-sm text-muted-foreground">
              Loading billing confirmation...
            </div>
          </SectionCard>
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}