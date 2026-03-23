// frontend/app/post-login/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type NextStep = "signin" | "tenant" | "billing" | "onboarding" | "dashboard";

type Status = {
  ok: boolean;
  user_id?: string | null;
  tenant_id?: string | null;
  has_tenant?: boolean;
  subscription_active: boolean;
  onboarding_done: boolean;
  onboarding_status?: string | null;
  next_step?: NextStep;
};

const NEXT_STEP_ROUTE: Record<NextStep, string> = {
  signin: "/signin",
  tenant: "/onboarding",
  billing: "/onboarding",
  onboarding: "/restaurant",
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

        const j = (await res.json()) as Status;
        if (cancelled) return;

        const nextStep: NextStep =
          j?.next_step && NEXT_STEP_ROUTE[j.next_step]
            ? j.next_step
            : j?.ok
            ? "dashboard"
            : "signin";

        router.replace(NEXT_STEP_ROUTE[nextStep]);
      } catch (err) {
        console.error("Post-login routing error:", err);
        router.replace("/signin");
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