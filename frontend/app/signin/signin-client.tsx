"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GlassCardGlow from "../../components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormField from "../../components/ui/FormField";
import FormMessage from "@/components/ui/FormMessage";

type SignInClientProps = {
  searchParams?: {
    next?: string;
    error?: string;
  };
};

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

function BenefitCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-[92px] rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}

export default function SignInClient({ searchParams }: SignInClientProps) {
  const router = useRouter();
  const next = searchParams?.next ?? "/post-login";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(searchParams?.error ?? null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });

      const j = await safeJson(r);
      if (!j.ok) throw new Error(j.error ?? "Sign in failed");

      router.push(j.redirect ?? next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <GlassCardGlow className="p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            Welcome back
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Sign in to your Valora AI workspace
          </div>

          <div className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Access your restaurant intelligence workspace, operating alerts, and decision-ready dashboards.
          </div>

          {err ? (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-4">
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
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>

            <Button variant="primary" className="h-12 w-full" disabled={loading} loading={loading}>
              {loading ? "Signing you in..." : "Enter workspace"}
            </Button>

            <div className="text-center text-xs leading-6 text-muted-foreground">
              Secure access to your Valora AI workspace.
            </div>

            <div className="border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
              New to Valora AI?{" "}
              <Link className="font-semibold text-foreground hover:underline" href="/signup">
                Create account
              </Link>
            </div>
          </form>
        </GlassCardGlow>

        <GlassCardGlow className="p-6 md:p-8">
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