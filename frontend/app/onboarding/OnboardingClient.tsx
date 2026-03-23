// frontend/app/onboarding/onboardingclient.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";

type Step = "profile" | "tenant" | "subscription" | "pos" | "done";

type Profile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  contact: string | null;
};

interface OnboardingClientProps {
  initialStep?: string;
}

async function subscribe(planCode: string) {
  try {
    const res = await fetch("/api/billing/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        plan_code: planCode,
        billing_interval: "monthly",
        quantity: 1,
      }),
    });

    const j = await res.json();

    if (!j?.ok || !j?.checkout_url) {
      throw new Error(j?.error || "Subscription failed");
    }

    window.location.href = j.checkout_url;
  } catch (e: any) {
    console.error("Stripe redirect error:", e);
    alert(e?.message || "Failed to start subscription");
  }
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

// ------------------------- Step Components -------------------------

function StepHeader({ step }: { step: Step }) {
  const steps: Step[] = ["profile", "tenant", "subscription", "pos"];
  return (
    <div className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
              step === s
                ? "bg-gradient-to-br from-green-400/80 to-green-600/70 text-white shadow-[0_0_0_2px_rgba(34,197,94,0.18),0_0_14px_rgba(34,197,94,0.28)]"
                : "border border-border text-muted-foreground"
            }`}
          >
            <span className="relative z-10">{i + 1}</span>
            {step === s && (
              <span className="pointer-events-none absolute inset-0 rounded-full bg-foreground/20 blur-md opacity-70" />
            )}
          </div>
          {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProfileStep({ profile, onNext }: { profile: Profile | null; onNext: () => void }) {
  const displayName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    "there";

  return (
    <div className="space-y-5">
      <div>
        <div className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Welcome, {displayName}
        </div>
        <div className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Your account is ready. Review your profile details below, then continue to set up your business workspace.
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-background/35 p-5 shadow-sm backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative">
          <div className="text-xl font-semibold text-foreground">{displayName}</div>
          <div className="mt-1 text-sm text-muted-foreground">Account profile for your Valora AI workspace</div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Work email
              </div>
              <div className="mt-1 break-all text-sm font-medium text-foreground">
                {profile?.email || "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Contact number
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {profile?.contact || "Not added yet"}
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-xs leading-6 text-muted-foreground">
            You can update your personal details later from workspace settings after setup is complete.
          </div>
        </div>
      </div>

      <Button variant="primary" onClick={onNext} className="h-12 w-full">
        Continue to tenant setup
      </Button>
    </div>
  );
}

function TenantStep({ onNext, onBack, userId }: { onNext: () => void; onBack: () => void; userId: string }) {
  const [businessName, setBusinessName] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [stateCode, setStateCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [localErr, setLocalErr] = React.useState<string | null>(null);

  async function handleContinue() {
    setLocalErr(null);
    setBusy(true);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://localhost:8000";

      const r = await fetch(`${API_BASE}/api/onboarding/tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, business_name: businessName, location_name: locationName, state_code: stateCode }),
      });

      const j = await safeJson(r);
      if (!j.ok) throw new Error(j.detail || j.error || "Failed to create tenant");

      onNext();
    } catch (e: any) {
      setLocalErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold text-foreground">Set up your business workspace</div>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          Create your tenant and first location. You can add more locations later from the dashboard.
        </div>
      </div>

      {localErr && <FormMessage variant="error">{localErr}</FormMessage>}

      <div className="grid grid-cols-1 gap-4">
        <FormField label="Business / Tenant name" htmlFor="businessName" required hint="This will be your workspace name.">
          <Input id="businessName" placeholder="e.g. Golden Test Tenant" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </FormField>

        <FormField label="Primary location name" htmlFor="locationName" required hint="Your first operating location.">
          <Input id="locationName" placeholder="e.g. Boston Downtown" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </FormField>

        <FormField label="State code" htmlFor="stateCode" required hint="Use a 2-letter code like MA, TX, CA.">
          <Input id="stateCode" placeholder="e.g. MA" value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase())} maxLength={2} />
        </FormField>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
        This setup creates your tenant, first location, and tenant-location access mapping.
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={busy}>Back</Button>
        <Button variant="primary" onClick={handleContinue} className="flex-1" disabled={!businessName || !locationName || !stateCode || busy}>
          {busy ? "Creating workspace..." : "Continue to Subscription Plan"}
        </Button>
      </div>
    </div>
  );
}

function SubscriptionStep({ onNext, onBack, userId }: { onNext: () => void; onBack: () => void; userId: string }) {
  const [billingInterval, setBillingInterval] = React.useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = React.useState<"starter" | "growth">("starter");

  const plans = {
    monthly: [
      { key: "starter" as const, name: "Starter", price: "$199", period: "/month", badge: "Best for single location", description: "Built for operators who want focused KPI visibility and faster daily decisions.", features: ["Core performance dashboard", "Alerts and watchpoints", "Cost analytics", "7-day free trial"] },
      { key: "growth" as const, name: "Growth", price: "$499", period: "/month", badge: "Most popular", description: "Designed for growing restaurant groups that need broader visibility and forecasting.", features: ["Everything in Starter", "Forecasting", "Benchmarking", "Executive reporting"] },
    ],
    annual: [
      { key: "starter" as const, name: "Starter", price: "$1,990", period: "/year", badge: "Annual value", description: "Built for operators who want focused KPI visibility and faster daily decisions.", features: ["Core performance dashboard", "Alerts and watchpoints", "Cost analytics", "Annual billing"] },
      { key: "growth" as const, name: "Growth", price: "$4,990", period: "/year", badge: "Best annual value", description: "Designed for growing restaurant groups that need broader visibility and forecasting.", features: ["Everything in Starter", "Forecasting", "Benchmarking", "Executive reporting"] },
    ],
  };

  const visiblePlans = plans[billingInterval];

  async function handleStartTrial() {
    await subscribe(`${selectedPlan}_${billingInterval}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold text-foreground md:text-3xl">Choose your plan</div>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          Start with a free trial and activate the workspace that matches your operating needs.
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-2xl border border-border/60 bg-background/30 p-1">
          <button type="button" onClick={() => setBillingInterval("monthly")} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${billingInterval === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
          <button type="button" onClick={() => setBillingInterval("annual")} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${billingInterval === "annual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>Yearly</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visiblePlans.map((plan) => {
          const isSelected = selectedPlan === plan.key;
          return (
            <button key={`${billingInterval}-${plan.key}`} type="button" onClick={() => setSelectedPlan(plan.key)} className={`group relative overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200 ${isSelected ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.20),0_0_16px_rgba(34,197,94,0.12)]" : "border-border/60 bg-background/30 hover:border-border hover:bg-background/40"}`}>
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-foreground">{plan.name}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{plan.badge}</div>
                  </div>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${isSelected ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-border/60 text-muted-foreground"}`}>{isSelected ? "✓" : ""}</div>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <div className="text-3xl font-semibold tracking-tight text-foreground">{plan.price}</div>
                  <div className="pb-1 text-sm text-muted-foreground">{plan.period}</div>
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</div>
                <div className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-emerald-300">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={handleStartTrial} className="flex-1">Start free trial</Button>
      </div>
    </div>
  );
}

function POSStep({ onNext, onBack, userId }: { onNext: () => void; onBack: () => void; userId: string }) {
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [connectionMode, setConnectionMode] = React.useState<"oauth" | "manual" | null>(null);
  const [busy, setBusy] = React.useState(false); // <-- track loading
  const [error, setError] = React.useState<string | null>(null);

  const providers = [
    { key: "toast", name: "Toast", subtitle: "Restaurant-native POS", badge: "Popular" },
    { key: "square", name: "Square", subtitle: "Modern commerce platform", badge: "Fast setup" },
    { key: "clover", name: "Clover", subtitle: "Flexible POS ecosystem", badge: "Multi-location" },
    { key: "csv", name: "Upload CSV", subtitle: "Manual import fallback", badge: "Fallback" },
  ];

  async function handleContinue() {
    if (!selectedProvider || !connectionMode) return;
    setBusy(true);
    setError(null);

    try {
      const API_BASE = process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/onboarding/pos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, provider: selectedProvider, mode: connectionMode }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.detail || "Failed to save POS");
      }

      // Optionally: show a short delay for UX if ingestion is triggered
      if (data.ingestion_triggered) {
        await new Promise((resolve) => setTimeout(resolve, 800)); // small delay for smoothness
      }

      onNext(); // proceed to DoneStep
    } catch (e: any) {
      setError(e?.message || "POS connection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-2xl font-semibold text-foreground md:text-3xl">Connect your POS</div>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a provider to power dashboards, alerts, and operating insights.
        </div>
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {providers.map((provider) => {
          const isSelected = selectedProvider === provider.key;

          return (
            <button
              key={provider.key}
              type="button"
              onClick={() => {
                setSelectedProvider(provider.key);
                setConnectionMode(provider.key === "csv" ? "manual" : "oauth");
              }}
              className={`group relative overflow-hidden rounded-[22px] border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.22),0_0_14px_rgba(34,197,94,0.12)]"
                  : "border-border/60 bg-background/30 hover:border-border hover:bg-background/40"
              }`}
            >
              <div className="pointer-events-none absolute inset-0">
                <div
                  className={`absolute right-0 top-0 h-20 w-20 rounded-full blur-3xl transition ${
                    isSelected ? "bg-emerald-500/10" : "bg-sky-500/8"
                  }`}
                />
              </div>

              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{provider.name}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {provider.subtitle}
                    </div>
                  </div>

                  <div
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        : "border-border/60 bg-background/40 text-muted-foreground"
                    }`}
                  >
                    {provider.badge}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {provider.key === "csv" ? "No OAuth required" : "Secure connection"}
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                      isSelected
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedProvider && (
        <div className="rounded-2xl border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">
            {providers.find((p) => p.key === selectedProvider)?.name}
          </div>

          <div className="mt-1">
            {connectionMode === "oauth"
              ? "Secure OAuth connection will be enabled in the next step."
              : "You can upload data manually using CSV files."}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          Back
        </Button>

        <Button variant="primary" onClick={handleContinue} className="flex-1" disabled={!selectedProvider || busy}>
          {busy ? "Connecting POS..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <div className="text-2xl font-semibold text-foreground">
        Your workspace is ready 🚀
      </div>

      <Button variant="primary" onClick={onEnter} className="h-12 w-full">
        Enter Dashboard
      </Button>
    </div>
  );
}

function RightPanel({ step }: { step: Step }) {
  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold text-foreground">Guided setup</div>

      <div className="text-sm leading-7 text-muted-foreground">
        {step === "profile" &&
          "Confirm your identity and move into workspace setup with the right account context."}
        {step === "tenant" &&
          "Define your business workspace so Valora AI can structure locations and reporting."}
        {step === "subscription" &&
          "Activate your plan first. Billing must be active before data integrations."}
        {step === "pos" &&
          "Connect your POS to start syncing operational data and unlock insights."}
        {step === "done" &&
          "Your workspace is fully configured and ready for use."}
      </div>

      <div className="grid gap-3 pt-2">
        <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">Why subscription first</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            Subscription activation ensures access control, feature gating, and billing lifecycle before integrations.
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">Why POS matters</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            POS integration powers dashboards, alerts, and performance insights.
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
          <div className="text-sm font-semibold text-foreground">Future-ready setup</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            This flow supports OAuth, API sync, and multi-provider integrations.
          </div>
        </div>
      </div>
    </div>
  );
}

interface OnboardingClientProps {
  initialStep?: string;
}

// ------------------------- Main Onboarding Component -------------------------

export default function OnboardingClient({ initialStep }: OnboardingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [step, setStep] = React.useState<Step>((initialStep as Step) || "profile");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // Load profile and initialize step
  React.useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        const j = await res.json();
        if (!j.ok || !j.user_id) throw new Error(j?.error || "Failed to fetch profile");
        setProfile({
          user_id: j.user_id,
          first_name: j.first_name,
          last_name: j.last_name,
          full_name: j.full_name ?? `${j.first_name ?? ""} ${j.last_name ?? ""}`.trim(),
          email: j.email,
          contact: j.contact || null,
        });

        // Initialize step from URL or initialStep
        const urlStep = searchParams.get("step") as Step | null;
        if (urlStep) setStep(urlStep);
        else if (initialStep) setStep(initialStep as Step);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setLoading(false);
        setReady(true); // UI only renders after profile loaded
      }
    }
    loadProfile();
  }, [initialStep, searchParams]);

  function nextStep() {
    if (step === "profile") setStep("tenant");
    else if (step === "tenant") setStep("subscription");
    else if (step === "subscription") setStep("pos");
    else if (step === "pos") setStep("done");
  }

  function prevStep() {
    if (step === "tenant") setStep("profile");
    else if (step === "subscription") setStep("tenant");
    else if (step === "pos") setStep("subscription");
  }

  if (loading || !ready) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">
        Loading onboarding...
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl items-center px-4 py-10 md:py-14">
      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCardGlow className="p-6 md:p-8">
          <StepHeader step={step} />

          {err && <FormMessage variant="error">{err}</FormMessage>}

          {step === "profile" && <ProfileStep profile={profile} onNext={nextStep} />}
          {step === "tenant" && <TenantStep onNext={nextStep} onBack={prevStep} userId={profile?.user_id ?? ""} />}
          {step === "subscription" && <SubscriptionStep onNext={nextStep} onBack={prevStep} userId={profile?.user_id ?? ""} />}
          {step === "pos" && <POSStep onNext={nextStep} onBack={prevStep} userId={profile?.user_id ?? ""} />}
          {step === "done" && <DoneStep onEnter={() => router.push("/restaurant")} />}
        </GlassCardGlow>

        <GlassCardGlow className="p-6 md:p-8" glow="subtle">
          <RightPanel step={step} />
        </GlassCardGlow>
      </div>
    </div>
  );
}