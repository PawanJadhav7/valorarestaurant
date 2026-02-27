"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { login as demoLogin } from "@/lib/sim/store";
import { nextRouteForSession } from "@/lib/sim/flow";
import { GlassButton } from "@/components/ui/GlassButton";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextParam = sp.get("next") || "";
  const demo = sp.get("demo");

  const [email, setEmail] = React.useState("owner1@client1.com");
  const [password, setPassword] = React.useState("Valora@123");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const go = (path: string) => router.push(demo ? `${path}?demo=${demo}` : path);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const res = demoLogin(email, password);
      if (!res.ok) {
        setErr(res.error);
        return;
      }

      // Enforce flow first
      const enforced = nextRouteForSession(res.session);

      // If caller provided next, allow it only if user is already eligible for dashboard.
      // (Keeps things safe + avoids skipping onboarding/subscription)
      if (nextParam) {
        if (enforced === "/restaurant") go(nextParam);
        else go(enforced);
        return;
      }

      go(enforced);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <SectionCard title="Login" subtitle="Demo mode: use seeded accounts to simulate access + plans.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_0.9fr]">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <input
                className="h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner1@client1.com"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                className="h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Valora@123"
              />
            </Field>

            {err ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-foreground">
                <div className="font-semibold">Login failed</div>
                <div className="mt-1 text-xs text-muted-foreground">{err}</div>
              </div>
            ) : null}

            <GlassButton
              type="submit"
              disabled={busy}
              className="w-full justify-center disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Login"}
            </GlassButton>

            <div className="text-xs text-muted-foreground">
              New here?{" "}
              <Link href={demo ? `/signup?demo=${demo}` : "/signup"} className="font-semibold text-foreground hover:underline">
                Create account →
              </Link>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-background/20 p-5">
            <div className="text-sm font-semibold text-foreground">Seeded demo users</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Try: <span className="text-foreground">owner1@client1.com</span> /{" "}
              <span className="text-foreground">Valora@123</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Pattern: owner{`{N}`}@client{`{N}`}.com (N = 1..10)
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background/15 p-3 text-xs text-muted-foreground">
              Flow enforcement:
              <div className="mt-2">Login → Plan (if needed) → Onboarding (if needed) → Overview</div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}