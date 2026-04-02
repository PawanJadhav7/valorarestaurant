"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

type LocationDraft = {
  location_name: string;
  region: string;
  country_code: string;
  currency_code: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function blankLocation(): LocationDraft {
  return {
    location_name: "",
    region: "",
    country_code: "US",
    currency_code: "USD",
  };
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
  const [locations, setLocations] = React.useState<LocationDraft[]>([blankLocation()]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  function updateLocation(i: number, patch: Partial<LocationDraft>) {
    setLocations((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addLocation() {
    setLocations((prev) => [...prev, blankLocation()]);
  }

  function removeLocation(i: number) {
    const next = locations.filter((_, idx) => idx !== i);
    setLocations(next.length ? next : [blankLocation()]);
  }

  function cleanedLocations(): LocationDraft[] {
    return locations
      .map((x) => ({
        location_name: x.location_name.trim(),
        region: x.region.trim(),
        country_code: x.country_code.trim().toUpperCase(),
        currency_code: x.currency_code.trim().toUpperCase(),
      }))
      .filter((x) => x.location_name);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    const cleaned = cleanedLocations();

    if (!tenantName.trim()) {
      setErr("Tenant name is required.");
      return;
    }

    if (cleaned.length === 0) {
      setErr("Please add at least one location.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/onboarding/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_name: tenantName.trim(),
          locations: cleaned,
        }),
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
      title="Set up your business workspace"
      subtitle="Create the tenant and add at least one location."
      backHref="/onboarding"
    />
      <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            Tenant setup
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Set up your business workspace
          </div>

          <div className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Create the tenant and add at least one location before activating subscription.
          </div>

          {err ? (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <FormField label="Tenant / business name" htmlFor="tenantName" required>
              <Input
                id="tenantName"
                placeholder="e.g. Texas Grill Group"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
            </FormField>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Branch locations</div>
                  <div className="text-xs text-muted-foreground">
                    Add at least one operating location.
                  </div>
                </div>

                <Button type="button" variant="secondary" onClick={addLocation}>
                  + Add location
                </Button>
              </div>

              {locations.map((loc, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/60 bg-background/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">
                      Location {i + 1}
                    </div>
                    <Button type="button" variant="ghost" onClick={() => removeLocation(i)}>
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <FormField label="Location name" htmlFor={`location_name_${i}`} required>
                      <Input
                        id={`location_name_${i}`}
                        placeholder="e.g. Austin - Downtown"
                        value={loc.location_name}
                        onChange={(e) =>
                          updateLocation(i, { location_name: e.target.value })
                        }
                        required
                      />
                    </FormField>

                    <FormField label="Region / state" htmlFor={`region_${i}`}>
                      <Input
                        id={`region_${i}`}
                        placeholder="e.g. Texas"
                        value={loc.region}
                        onChange={(e) => updateLocation(i, { region: e.target.value })}
                      />
                    </FormField>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FormField label="Country code" htmlFor={`country_${i}`} required>
                        <Input
                          id={`country_${i}`}
                          placeholder="US"
                          maxLength={2}
                          value={loc.country_code}
                          onChange={(e) =>
                            updateLocation(i, { country_code: e.target.value.toUpperCase() })
                          }
                          required
                        />
                      </FormField>

                      <FormField label="Currency code" htmlFor={`currency_${i}`} required>
                        <Input
                          id={`currency_${i}`}
                          placeholder="USD"
                          maxLength={3}
                          value={loc.currency_code}
                          onChange={(e) =>
                            updateLocation(i, { currency_code: e.target.value.toUpperCase() })
                          }
                          required
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" variant="primary" className="h-12 w-full" disabled={busy} loading={busy}>
              {busy ? "Creating workspace..." : "Continue to subscription"}
            </Button>
          </form>
        </GlassCardGlow>

        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <ValuePill>Tenant-scoped billing</ValuePill>
            <ValuePill>Multi-location ready</ValuePill>
            <ValuePill>Data model setup</ValuePill>
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Why this step matters
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            Your subscription, POS data, and dashboards all belong to the tenant. This step creates the workspace foundation before billing and POS onboarding.
          </div>

          <div className="mt-6 space-y-3">
            <InfoCard
              title="Creates the business shell"
              text="Establishes the tenant that users, billing, and analytics will belong to."
            />
            <InfoCard
              title="Defines operating locations"
              text="Sets up branch-level structure so uploaded POS data can be mapped correctly."
            />
            <InfoCard
              title="Prepares the next step"
              text="Once tenant setup is complete, subscription activation and CSV onboarding can proceed cleanly."
            />
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}