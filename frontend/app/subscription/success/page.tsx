"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      router.replace("/subscription");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/stripe/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await res.json();

        if (res.ok && data?.ok) {
          router.replace("/onboarding/pos");
          return;
        }

        router.replace("/subscription");
      } catch {
        router.replace("/subscription");
      }
    }

    verify();
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GlassCardGlow className="p-8 md:p-10">
        <div className="text-2xl font-semibold text-foreground">
          Verifying your subscription
        </div>
        <div className="mt-3 text-sm leading-7 text-muted-foreground">
          Please wait while we confirm your Stripe checkout and prepare the next onboarding step.
        </div>
      </GlassCardGlow>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12" />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}