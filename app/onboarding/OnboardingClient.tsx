//app/onboarding/OnboardingClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

export default function OnboardingClient() {
  const router = useRouter();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
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
      if (!j.ok) throw new Error(j.error ?? "Onboarding failed");

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
        title="Onboarding"
        subtitle="Confirm your details once. After this, you’ll land in the dashboard."
      >
        {err ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="max-w-md space-y-3">
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
            {busy ? "Saving…" : "Finish → Go to Dashboard"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}