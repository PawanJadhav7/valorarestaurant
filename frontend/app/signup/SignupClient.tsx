// app/signup/SignupClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { Input } from "@/components/ui/Input";
import GlassCardGlow from "@/components/ui/GlassCardGlow";

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

function BenefitCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-md transition hover:border-border/70 hover:bg-background/40">
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

  async function submit(e: React.FormEvent) {
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

      router.push(j.redirect ?? "/onboarding");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCardGlow className="p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            Start your workspace
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Create your Valora AI account
          </div>

          <div className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Set up your workspace to access restaurant intelligence, operating alerts,
            and decision-ready dashboards designed for modern operators.
          </div>

          {err ? (
            <div className="mt-5">
              <FormMessage variant="error">{err}</FormMessage>
            </div>
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

            <FormField
              label="Contact number"
              htmlFor="contact"
              hint="Optional, but helpful for account and workspace coordination."
            >
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

            <FormField
              label="Password"
              htmlFor="password"
              required
              hint="Use at least 8 characters to secure your workspace access."
            >
              <Input
                id="password"
                placeholder="Create a secure password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="mt-2 h-12 w-full"
            >
              {loading ? "Creating your workspace..." : "Create workspace"}
            </Button>

            <div className="text-center text-xs leading-6 text-muted-foreground">
              Secure account setup for your Valora AI workspace. No unnecessary setup friction.
            </div>

            <div className="border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-semibold text-foreground hover:underline" href="/signin">
                Sign in
              </Link>
            </div>
          </form>
        </GlassCardGlow>

        <GlassCardGlow className="p-6 md:p-8 h-full flex flex-col" glow="subtle">
          <div className="flex flex-wrap gap-2">
            <ValuePill>Sales visibility</ValuePill>
            <ValuePill>Labor intelligence</ValuePill>
            <ValuePill>Margin clarity</ValuePill>
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Built for restaurant operators who need clarity fast
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            Valora AI helps operators monitor performance, detect issues earlier, and
            focus on the next actions that actually improve business outcomes.
          </div>

          <div className="mt-6 flex flex-1 flex-col gap-3">
            <BenefitCard
              title="Monitor operating performance"
              text="Track sales, labor, inventory, and margin in one workspace designed for daily decision-making."
            />
            <BenefitCard
              title="Surface issues earlier"
              text="Identify watchpoints and performance drift before they become expensive operational problems."
            />
            <BenefitCard
              title="Act with confidence"
              text="Turn signals into clear next actions across single-location and multi-location restaurant operations."
            />
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}