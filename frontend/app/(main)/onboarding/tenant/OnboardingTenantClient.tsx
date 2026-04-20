"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
      {children}
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}

export default function OnboardingTenantClient() {
  const router = useRouter();

  const [tenantName, setTenantName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    if (!tenantName.trim()) {
      setErr("Business name is required.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/onboarding/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_name: tenantName.trim() }),
      });

      const j = await safeJson(res);
      if (!j.ok) throw new Error(j.error ?? "Tenant setup failed");

      router.push(j.redirect ?? "/subscription");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <OnboardingStepHeader
        currentStep="tenant"
        title="Set up your workspace"
        subtitle="Enter your business name to create your Valora workspace."
        
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Left: Form ─────────────────────── */}
        <GlassCardGlow className="p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            Workspace setup
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Name your business
          </div>

          <div className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            This is the name of your restaurant group or business entity. Your
            locations will be imported automatically from your POS system in a later step.
          </div>

          {err && (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          )}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <FormField label="Business / group name" htmlFor="tenantName" required>
              <Input
                id="tenantName"
                placeholder="e.g. Texas Grill Group"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
            </FormField>

            {/* Info note */}
            <div className="rounded-2xl border border-border/40 bg-background/20 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 text-[11px] text-foreground/50">
                  ℹ
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Locations are imported from your POS.
                  </span>{" "}
                  After connecting Square or Clover, we fetch your real locations
                  and let you select which ones to activate.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="h-12 w-full"
              disabled={busy}
              loading={busy}
            >
              {busy ? "Creating workspace..." : "Continue to subscription →"}
            </Button>
          </form>
        </GlassCardGlow>

        {/* ── Right: Info panel ──────────────── */}
        <GlassCardGlow className="p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <ValuePill>Tenant-scoped billing</ValuePill>
            <ValuePill>POS location sync</ValuePill>
            <ValuePill>Multi-location ready</ValuePill>
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Why this step matters
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            Your business workspace is the foundation for all analytics, billing,
            and POS data in Valora. Everything ties back to this tenant.
          </div>

          <div className="mt-6 space-y-3">
            <InfoCard
              title="Creates your workspace"
              text="Establishes the tenant that your subscription, POS connections, and analytics will all belong to."
            />
            <InfoCard
              title="Locations come from your POS"
              text="After connecting Square or Clover, your real locations are fetched and mapped automatically — no manual entry needed."
            />
            <InfoCard
              title="Billing is per location"
              text="Your plan includes 1 location. Add more locations at any time from your dashboard. Each additional location is billed per your plan."
            />
            <InfoCard
              title="One tenant, many locations"
              text="As your business grows, you can add new locations and POS connections directly from your settings."
            />
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}
