"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

type AuthStatusResp = {
  ok: boolean;
  subscription_active: boolean;
  onboarding_done: boolean;
  next_step?: "signin" | "tenant" | "billing" | "onboarding" | "dashboard";
};

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [countdown, setCountdown] = React.useState(5);
  const [checking, setChecking] = React.useState(true);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    let pollTimer: number | null = null;
    let remaining = 10;

    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/status", {
          cache: "no-store",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        });

        const j = (await res.json().catch(() => null)) as AuthStatusResp | null;
        if (!alive) return;

        if (j?.ok && j.subscription_active) {
          setChecking(false);

          // ✅ IMPORTANT: push to onboarding POS step cleanly
          router.replace("/onboarding?step=pos");
          return;
        }

        remaining -= 1;
        setCountdown(Math.max(remaining, 1));

        if (remaining <= 0) {
          setChecking(false);
          setSyncError(
            "Subscription is still syncing. You can proceed manually."
          );
          return;
        }

        pollTimer = window.setTimeout(checkStatus, 1000);
      } catch {
        if (!alive) return;

        remaining -= 1;
        setCountdown(Math.max(remaining, 1));

        if (remaining <= 0) {
          setChecking(false);
          setSyncError(
            "Subscription sync delayed. You can proceed manually."
          );
          return;
        }

        pollTimer = window.setTimeout(checkStatus, 1000);
      }
    }

    checkStatus();

    return () => {
      alive = false;
      if (pollTimer) window.clearTimeout(pollTimer);
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
                {checking
                  ? `Finalizing your workspace access in ${countdown}...`
                  : syncError ?? "Workspace ready."}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    router.replace("/onboarding?step=pos");
                  }}
                  className="h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
                >
                  Continue setup (POS)
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