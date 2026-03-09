//app/onboarding/OnboardingClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

type Profile = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  contact: string | null;
  onboarding_status: string | null;
};

type GetResp =
  | { ok: true; profile: Profile }
  | { ok: false; error?: string };

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function stepFor(status: string | null | undefined) {
  if (!status || status === "started") return "profile";
  if (status === "profile_done") return "tenant";
  if (status === "tenant_done" || status === "complete") return "done";
  return "profile";
}

export default function OnboardingClient() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [contact, setContact] = React.useState("");

  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const r = await fetch("/api/auth/onboarding", { cache: "no-store" });
      const j = (await safeJson(r)) as GetResp;

      if (!j.ok) throw new Error(j.error ?? "Failed to load onboarding profile");

      setProfile(j.profile);
      setFirstName(j.profile.first_name ?? "");
      setLastName(j.profile.last_name ?? "");
      setContact(j.profile.contact ?? "");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  const step = stepFor(profile?.onboarding_status);

  React.useEffect(() => {
    if (step === "tenant") {
      router.push("/onboarding/tenant");
      router.refresh();
      return;
    }

    if (step === "done") {
      router.push("/restaurant");
      router.refresh();
    }
  }, [step, router]);

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const r = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          contact,
        }),
      });

      const j = await safeJson(r);
      if (!j.ok) throw new Error(j.error ?? "Onboarding profile save failed");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10">
      <SectionCard
        title="Onboarding"
        subtitle="Confirm your profile details."
      >
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        ) : step === "profile" ? (
          <form onSubmit={submitProfile} className="max-w-md space-y-3">
            <input
              className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              className="h-10 w-full rounded-xl border border-border bg-background/30 px-3"
              placeholder="Contact (phone)"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Continue → Tenant setup"}
            </button>
          </form>
        ) : (
          <div className="text-sm text-muted-foreground">Redirecting…</div>
        )}
      </SectionCard>
    </div>
  );
}
