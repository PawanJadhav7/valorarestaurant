//app/onboarding/tenant/OnboardingTenantClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

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

export default function OnboardingTenantClient() {
  const router = useRouter();

  const [tenantName, setTenantName] = React.useState("");
  const [manualLocations, setManualLocations] = React.useState<LocationDraft[]>([blankLocation()]);
  const [busy, setBusy] = React.useState(false);
  const [loadingCtx, setLoadingCtx] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoadingCtx(true);
      setErr(null);
      try {
        const r = await fetch("/api/auth/onboarding/tenant", { cache: "no-store" });
        const j = await safeJson(r);

        if (!j.ok) throw new Error(j.error ?? "Failed to load tenant onboarding context");

        if (j.has_tenant && j.tenant_id) {
          router.push("/restaurant");
          router.refresh();
          return;
        }
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setLoadingCtx(false);
      }
    })();
  }, [router]);

  function updateManualLocation(i: number, patch: Partial<LocationDraft>) {
    setManualLocations((prev) =>
      prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x))
    );
  }

  function addManualLocationRow() {
    setManualLocations((prev) => [...prev, blankLocation()]);
  }

  function removeManualLocationRow(i: number) {
    setManualLocations((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length ? next : [blankLocation()];
    });
  }

  function cleanedManualLocations(): LocationDraft[] {
    const cleaned = manualLocations
      .map((x) => ({
        location_name: x.location_name.trim(),
        region: x.region.trim(),
        country_code: x.country_code.trim().toUpperCase(),
        currency_code: x.currency_code.trim().toUpperCase(),
      }))
      .filter((x) => x.location_name);

    const seen = new Set<string>();
    const uniq: LocationDraft[] = [];

    for (const loc of cleaned) {
      const key = `${loc.location_name}|${loc.region}|${loc.country_code}|${loc.currency_code}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(loc);
    }

    return uniq;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const cleanedLocations = cleanedManualLocations();

    if (!tenantName.trim()) {
      setErr("Tenant name is required.");
      return;
    }

    if (cleanedLocations.length === 0) {
      setErr("Please add at least one branch location.");
      return;
    }

    for (const loc of cleanedLocations) {
      if (!loc.country_code) {
        setErr(`Country code is required for "${loc.location_name}".`);
        return;
      }
      if (!loc.currency_code) {
        setErr(`Currency code is required for "${loc.location_name}".`);
        return;
      }
    }

    setBusy(true);

    try {
      const payload = {
        tenant_name: tenantName.trim(),
        locations: cleanedLocations,
      };

      const r = await fetch("/api/auth/onboarding/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await safeJson(r);
      if (!j.ok) throw new Error(j.error ?? "Tenant creation failed");

      router.push(j.redirect ?? "/restaurant");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10">
      <SectionCard
        title="Set up your business"
        subtitle="Create your tenant, add your branch locations, and continue to the dashboard."
      >
        {err ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        ) : null}

        {loadingCtx ? (
          <div className="text-sm opacity-70">Loading…</div>
        ) : (
          <form onSubmit={submit}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* LEFT: Create Tenant */}
              <div className="lg:col-span-1">
                <div className="rounded-3xl border border-border bg-background/30 p-4">
                  <div className="mb-2 text-sm font-semibold">Create Tenant</div>
                  <div className="mb-3 text-xs opacity-70">
                    Create your business account for Valora AI.
                  </div>

                  <input
                    className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
                    placeholder="Business / Tenant name (e.g., Texas Grill Group)"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                  />
                </div>
              </div>

              {/* MIDDLE: Locations */}
              <div className="lg:col-span-1">
                <div className="rounded-3xl border border-border bg-background/30 p-4">
                  <div className="mb-2 text-sm font-semibold">Branch Locations</div>
                  <div className="mb-3 text-xs opacity-70">
                    Add at least one branch so your dashboard can be scoped to your business.
                  </div>

                  <div className="space-y-3">
                    {manualLocations.map((v, i) => (
                      <div key={i} className="rounded-2xl border border-border/60 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-medium opacity-70">Location {i + 1}</div>
                          <button
                            type="button"
                            onClick={() => removeManualLocationRow(i)}
                            className="rounded-lg border border-border px-2 py-1 text-xs"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="space-y-2">
                          <input
                            className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
                            placeholder="Location name (e.g., Austin - Downtown)"
                            value={v.location_name}
                            onChange={(e) =>
                              updateManualLocation(i, { location_name: e.target.value })
                            }
                          />

                          <input
                            className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
                            placeholder="Region / State (e.g., Texas)"
                            value={v.region}
                            onChange={(e) =>
                              updateManualLocation(i, { region: e.target.value })
                            }
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
                              placeholder="Country code (e.g., US)"
                              value={v.country_code}
                              onChange={(e) =>
                                updateManualLocation(i, { country_code: e.target.value.toUpperCase() })
                              }
                              maxLength={2}
                            />

                            <input
                              className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
                              placeholder="Currency code (e.g., USD)"
                              value={v.currency_code}
                              onChange={(e) =>
                                updateManualLocation(i, { currency_code: e.target.value.toUpperCase() })
                              }
                              maxLength={3}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={addManualLocationRow}
                        className="rounded-xl border border-border px-3 py-2 text-sm"
                      >
                        + Add location
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: POS Integration */}
              <div className="lg:col-span-1">
                <div className="rounded-3xl border border-border bg-background/30 p-4">
                  <div className="mb-2 text-sm font-semibold">Connect POS</div>
                  <div className="mb-3 text-xs opacity-70">
                    Coming soon — automatically import locations, menus, sales, labor, and inventory.
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {["Toast", "Square", "Clover", "NCR"].map((x) => (
                      <span
                        key={x}
                        className="rounded-full border border-border bg-background/30 px-3 py-1 text-xs opacity-80"
                      >
                        {x}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-background/30 text-sm font-semibold opacity-60"
                  >
                    Connect POS (Coming soon)
                  </button>

                  <div className="mt-2 text-[11px] opacity-60">
                    Phase 2: POS connection will auto-fetch stores/branches and prefill locations.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Creating…" : "Finish setup → Go to Dashboard"}
              </button>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}