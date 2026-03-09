//app/signin/signin-client.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

export default function SignInClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/restaurant";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
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
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg backdrop-blur-xl">
        <div className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Sign in to access your restaurant intelligence workspace.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-foreground/30"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-foreground/30"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            disabled={loading}
            className="h-11 w-full rounded-xl border border-border bg-foreground text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            New to Valora AI?{" "}
            <Link className="font-semibold text-foreground hover:underline" href="/signup">
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}