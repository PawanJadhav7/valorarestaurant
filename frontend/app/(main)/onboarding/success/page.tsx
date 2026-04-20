"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

type Profile = {
  full_name:           string;
  email:               string;
  tenant_name:         string;
  plan_code:           string;
  billing_interval:    string;
  subscription_status: string;
  trial_ends_at:       string | null;
  provider:            string;
  location_name:       string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON (${res.status})`); }
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  const isTrial  = status === "trial" || status === "trialing";
  return (
    <span className={[
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
      isActive ? "bg-background/40 text-foreground border border-border/60" :
      isTrial  ? "bg-background/40 text-foreground border border-border/60" :
                 "bg-border/40 text-muted-foreground border border-border/60",
    ].join(" ")}>
      {isTrial ? "Trial active" : isActive ? "Active" : status}
    </span>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        {badge}
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function ProviderLogo({ provider }: { provider: string }) {
  const logos: Record<string, string> = {
    square: "□",
    clover: "◇",
    toast:  "◈",
    csv:    "↑",
  };
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/40 text-base font-bold text-foreground">
      {logos[provider.toLowerCase()] ?? "◉"}
    </div>
  );
}

export default function OnboardingSuccessPage() {
  const router = useRouter();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err,     setErr]     = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/onboarding/summary", { cache: "no-store", credentials: "include" });
        const j   = await safeJson(res);
        if (!j?.ok) throw new Error(j?.error ?? "Failed to load profile");
        setProfile(j.profile);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const planLabel = profile
    ? `${profile.plan_code.charAt(0).toUpperCase() + profile.plan_code.slice(1)} · ${
        profile.billing_interval === "annual" ? "Annual" : "Monthly"
      }`
    : "—";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <OnboardingStepHeader
        currentStep="dashboard"
        title="You're all set!"
        subtitle="Your workspace is ready. Here's a summary of your setup."
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Left: Summary card ─────────────────────── */}
        <GlassCardGlow className="h-full p-6 md:p-8">
          {/* Success icon */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/40 text-3xl text-foreground">
              ✓
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">
                Setup complete!
              </div>
              <div className="text-sm text-muted-foreground">
                Your Valora workspace is ready to use.
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 text-sm text-muted-foreground">Loading your details...</div>
          ) : err ? (
            <div className="mt-8 text-sm text-red-400">{err}</div>
          ) : profile ? (
            <div className="mt-8 space-y-0 rounded-2xl border border-border/50 bg-background/20 px-5">
              <InfoRow
                label="Full name"
                value={profile.full_name || "—"}
              />
              <InfoRow
                label="Email"
                value={profile.email}
              />
              <InfoRow
                label="Business"
                value={profile.tenant_name || "—"}
              />
              <InfoRow
                label="Plan"
                value={planLabel}
                badge={<StatusBadge status={profile.subscription_status} />}
              />
              {profile.trial_ends_at && (
                <InfoRow
                  label="Trial ends"
                  value={new Date(profile.trial_ends_at).toLocaleDateString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                />
              )}
              <div className="flex items-center justify-between py-3">
                <div className="text-sm text-muted-foreground">POS connection</div>
                <div className="flex items-center gap-2">
                  <ProviderLogo provider={profile.provider || "square"} />
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      {profile.provider
                        ? profile.provider.charAt(0).toUpperCase() + profile.provider.slice(1)
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile.location_name || "—"}
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <Button
              variant="primary"
              className="h-12 w-full"
              onClick={() => router.push("/restaurant")}
            >
              Continue to dashboard →
            </Button>
          </div>
        </GlassCardGlow>

        {/* ── Right: What to expect ──────────────────── */}
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            {["Workspace ready", "POS syncing", "Dashboard unlocked"].map((p) => (
              <div
                key={p}
                className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm"
              >
                {p}
              </div>
            ))}
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            What to expect
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            Your POS is now connected and syncing. Here's what you'll see in your dashboard.
          </div>

          <div className="mt-6 space-y-3">
            {[
              {
                title: "Live KPI dashboard",
                text: "Real-time sales, orders, and revenue metrics updated every 15 minutes from your POS.",
              },
              {
                title: "Historical data sync",
                text: "Recent order history is being imported now. Your charts will populate within minutes.",
              },
              {
                title: "AI-powered insights",
                text: "Valora analyzes your data and surfaces actionable recommendations daily.",
              },
              {
                title: "Add more locations",
                text: "Head to Settings → Locations to connect additional POS locations anytime.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="text-sm font-semibold text-foreground">{c.title}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{c.text}</div>
              </div>
            ))}
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}
