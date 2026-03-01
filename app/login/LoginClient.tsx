// app/login/LoginClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextParam = sp.get("next") || "/restaurant";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ important: send/receive cookies for session
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const j = await safeJson(res);

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error ?? `Signin failed (${res.status})`);
      }

      // server may return redirect (/restaurant or /onboarding)
      const redirect = j.redirect ?? nextParam;
      router.push(redirect);
      router.refresh(); // helps re-render server layouts that depend on cookies
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <SectionCard title="Login" subtitle="Sign in to your Valora Restaurant dashboard.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_0.9fr]">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email">
              <input
                className="h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                className="h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>

            {err ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-foreground">
                <div className="font-semibold">Login failed</div>
                <div className="mt-1 text-xs text-muted-foreground">{err}</div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-foreground text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Login"}
            </button>

            <div className="text-xs text-muted-foreground">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-foreground hover:underline">
                Create account →
              </Link>
            </div>
          </form>

          <div className="rounded-2xl border border-border bg-background/20 p-5">
            <div className="text-sm font-semibold text-foreground">Access</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Use the account you created in <span className="text-foreground">Signup</span>. After signin, you’ll be routed
              to <span className="text-foreground">Onboarding</span> if needed, otherwise straight to the dashboard.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}