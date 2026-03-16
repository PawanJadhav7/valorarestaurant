// app/restaurant/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";
import { getSessionUser } from "@/lib/auth";
import { getUserTenantSubscription, isSubscriptionActive } from "@/lib/billing";

function daysLeft(trialEndsAt: string | Date | null | undefined) {
  if (!trialEndsAt) return null;

  const d = new Date(trialEndsAt);
  if (!Number.isFinite(d.getTime())) return null;

  const now = new Date();
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / 86400000);
}

export default async function RestaurantLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (!user) redirect("/signin");

  const s = user.onboarding_status;
  const done = s === "tenant_done" || s === "complete";
  if (!done) redirect("/onboarding");

  const subscription = await getUserTenantSubscription(user.user_id);
  const subscribed = isSubscriptionActive(subscription?.subscription_status);

  if (!subscribed) redirect("/billing");

  const trialDaysLeft = daysLeft((subscription as any)?.trial_ends_at ?? null);
  const isTrial = subscription?.subscription_status === "trial";
  const showTrialBanner = isTrial && trialDaysLeft !== null;

  const bannerTone =
    trialDaysLeft !== null && trialDaysLeft <= 3
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-sky-500/30 bg-sky-500/10 text-sky-100";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {showTrialBanner ? (
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${bannerTone}`}
        >
          <div className="font-medium">
            {trialDaysLeft! > 0
              ? `Your Valora trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}.`
              : "Your Valora trial has ended."}
          </div>

          <Link
            href="/billing"
            className="rounded-xl border border-white/15 bg-background/30 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background/50"
          >
            Upgrade now
          </Link>
        </div>
      ) : null}

      <div className="grid h-[calc(100dvh-3rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="h-full">
          <RestaurantSidebar />
        </div>

        <main className="h-full overflow-y-auto rounded-3xl">
          {children}
        </main>
      </div>
    </div>
  );
}