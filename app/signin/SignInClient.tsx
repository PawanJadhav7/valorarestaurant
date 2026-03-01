// app/signin/SignInClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

  const [nextParam, setNextParam] = React.useState<string>("/restaurant");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // ✅ Read next= from URL without useSearchParams()
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const n = sp.get("next");
      if (n && typeof n === "string") setNextParam(n);
    } catch {
      // ignore
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const j = await safeJson(r);
      if (!r.ok || !j?.ok) throw new Error(j?.error ?? "Signin failed");

      router.push(j.redirect ?? nextParam);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
        <div className="text-lg font-semibold text-foreground">Sign in</div>
        <div className="mt-1 text-sm text-muted-foreground">Access your Valora Restaurant dashboard.</div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            className="h-10 w-full rounded-xl border border-border bg-background px-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="h-10 w-full rounded-xl border border-border bg-background px-3"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button disabled={loading} className="h-10 w-full rounded-xl border border-border bg-background hover:bg-muted">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <a className="font-semibold text-foreground hover:underline" href="/signup">
              Create one
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}