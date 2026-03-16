// frontend/components/auth/RequireReady.tsx
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
  tenant: "/onboarding/tenant",
  billing: "/billing",
  onboarding: "/onboarding",
  dashboard: "/restaurant",
};

async function getStatus(): Promise<Status | null> {
  try {
    const r = await fetch("/api/auth/status", {
      cache: "no-store",
      credentials: "include",
    });

    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export function RequireReady({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function check() {
      const status = await getStatus();
      if (!alive) return;

      if (!status) {
        router.replace("/signin");
        return;
      }

      const nextStep: NextStep =
        status?.next_step && NEXT_STEP_ROUTE[status.next_step]
          ? status.next_step
          : status?.ok
          ? "dashboard"
          : "signin";

      if (nextStep !== "dashboard") {
        router.replace(NEXT_STEP_ROUTE[nextStep]);
        return;
      }

      setReady(true);
    }

    check();

    return () => {
      alive = false;
    };
  }, [router]);

  if (ready === null) {
    return (
      <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
        Preparing workspace…
      </div>
    );
  }

  if (!ready) return null;

  return <>{children}</>;
}