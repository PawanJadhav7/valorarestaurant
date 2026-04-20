"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import FormMessage from "@/components/ui/FormMessage";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Signup API returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
      {children}
    </div>
  );
}

function BenefitCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-[92px] rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}

export default function SignupClient() {
  const router = useRouter();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          contact,
          email,
          password,
        }),
      });

      const j = await safeJson(r);
      if (!j.ok) throw new Error(j.error ?? "Signup failed");

      router.push(j.redirect ?? "/post-login");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-[0.95fr_1.05fr]">
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            Start your workspace
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Create your Valora AI workspace
          </div>

          <div className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Set up your account to access restaurant intelligence, operating alerts, and decision-ready dashboards.
          </div>

          {err ? (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-4">
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

            <FormField label="Work email" htmlFor="email" required>
              <Input
                id="email"
                placeholder="name@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <Input
                id="password"
                placeholder="Create a secure password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FormMessage type="info">Use at least 8 characters.</FormMessage>
            </FormField>

            <Button variant="primary" className="h-12 w-full" disabled={loading} loading={loading}>
              {loading ? "Creating your workspace..." : "Create workspace"}
            </Button>

            <div className="text-center text-xs leading-6 text-muted-foreground">
              Secure account setup for your Valora AI workspace.
            </div>

            <div className="border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-semibold text-foreground hover:underline" href="/signin">
                Sign in
              </Link>
            </div>
          </form>
        </GlassCardGlow>

        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <ValuePill>Daily visibility</ValuePill>
            <ValuePill>Exception alerts</ValuePill>
            <ValuePill>Decision clarity</ValuePill>
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Built to help operators move faster with better decisions
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            Valora AI brings together the operating signals that matter most so teams can monitor
            performance, reduce surprises, and respond with confidence.
          </div>

          <div className="mt-6 space-y-3">
            <BenefitCard
              title="See what matters now"
              text="Monitor sales, labor, inventory, and margin in one operating workspace built for action."
            />
            <BenefitCard
              title="Respond to issues earlier"
              text="Spot operational drift and exception patterns before they turn into expensive problems."
            />
            <BenefitCard
              title="Stay aligned across locations"
              text="Give operators and leaders a clear shared view of business performance and next actions."
            />
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}