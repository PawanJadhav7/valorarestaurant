"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

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
  if (status === "tenant_done") return "pos";
  if (status === "complete") return "done";
  return "profile";
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

  async function submitProfile(e: React.FormEvent<HTMLFormElement>) {
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
        currentStep="profile"
        title="Complete your profile"
        subtitle="Confirm your details before creating your workspace."
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            Profile setup
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Confirm your account details
          </div>

          <div className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            We’ve created your account. Review and confirm your details before setting up the business workspace.
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-muted-foreground">Loading profile...</div>
          ) : err ? (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          ) : step === "profile" ? (
            <form onSubmit={submitProfile} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="First name" htmlFor="firstName" required>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Last name" htmlFor="lastName" required>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Contact number" htmlFor="contact">
                <Input
                  id="contact"
                  placeholder="Add contact number"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </FormField>

              <FormField label="Work email" htmlFor="email">
                <Input
                  id="email"
                  value={profile?.email ?? ""}
                  disabled
                  className="opacity-80"
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                className="h-12 w-full"
                disabled={busy}
                loading={busy}
              >
                {busy ? "Saving profile..." : "Continue to tenant setup"}
              </Button>
            </form>
          ) : (
            <div className="mt-6 text-sm text-muted-foreground">Redirecting...</div>
          )}
        </GlassCardGlow>

        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <ValuePill>Account verified</ValuePill>
            <ValuePill>Profile confirmation</ValuePill>
            <ValuePill>Workspace readiness</ValuePill>
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Why this step matters
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            This step confirms your account details and gives you a chance to validate that signup data was saved correctly before moving into business setup.
          </div>

          <div className="mt-6 space-y-3">
            <InfoCard
              title="Confirms account creation"
              text="Validates that the new account record and profile details were saved successfully."
            />
            <InfoCard
              title="Improves onboarding trust"
              text="Gives the user confidence that the setup process is progressing correctly."
            />
            <InfoCard
              title="Prepares tenant setup"
              text="Once profile details are confirmed, business workspace creation can proceed cleanly."
            />
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}