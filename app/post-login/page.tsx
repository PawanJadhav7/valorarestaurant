"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Status = {
  ok: boolean;
  subscription_active: boolean;
  onboarding_done: boolean;
};

export default function PostLoginPage() {
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        const j = (await res.json()) as Status;

        if (!j?.ok) {
          router.replace("/login");
          return;
        }

        if (j.subscription_active && j.onboarding_done) {
          router.replace("/restaurant");
          return;
        }

        if (!j.subscription_active) {
          router.replace("/subscription");
          return;
        }

        router.replace("/onboarding");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10">
      <div className="rounded-2xl border border-border bg-background/30 p-6 text-sm text-muted-foreground">
        Redirecting…
      </div>
    </div>
  );
}