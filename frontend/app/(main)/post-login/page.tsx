"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type NextStep =
  | "signin"
  | "onboarding"
  | "tenant"
  | "subscription"
  | "pos"
  | "dashboard";

type Status = {
  ok: boolean;
  user_id?: string | null;
  tenant_id?: string | null;
  has_tenant?: boolean;
  subscription_active?: boolean;
  data_ready?: boolean;
  onboarding_done?: boolean;
  onboarding_status?: string | null;
  next_step?: NextStep;
};

const NEXT_STEP_ROUTE: Record<NextStep, string> = {
  signin: "/signin",
  onboarding: "/onboarding",
  tenant: "/onboarding/tenant",
  subscription: "/subscription",
  pos: "/onboarding/pos",
  dashboard: "/restaurant",
};

export default function PostLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const res = await fetch("/api/auth/status", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Status check failed: ${res.status}`);
        }

        const j = (await res.json()) as Status;
        if (cancelled) return;

        let nextStep: NextStep;

        if (!j?.ok) {
          nextStep = "signin";
        } else if (j?.next_step && j.next_step in NEXT_STEP_ROUTE) {
          nextStep = j.next_step;
        } else if (!j?.onboarding_done && !j?.has_tenant && !j?.subscription_active) {
          nextStep = "onboarding";
        } else if (!j?.has_tenant) {
          nextStep = "tenant";
        } else if (!j?.subscription_active) {
          nextStep = "subscription";
        } else if (!j?.data_ready) {
          nextStep = "pos";
        } else {
          nextStep = "dashboard";
        }

        router.replace(NEXT_STEP_ROUTE[nextStep]);
      } catch (err) {
        console.error("Post-login routing error:", err);
        if (!cancelled) {
          router.replace("/signin");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-background/30 p-6 text-sm text-muted-foreground">
        <span>Preparing your workspace…</span>
        {loading ? <span className="animate-pulse text-xs">Loading</span> : null}
      </div>
    </div>
  );
}