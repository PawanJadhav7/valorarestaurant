// app/auth/login/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { setFlag } from "@/lib/va-session";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // MVP: accept any email/pass
    setTimeout(() => {
      setFlag("va_authed", true);
      r.push("/billing");
    }, 350);
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Log in"
        subtitle="Access your executive dashboards."
        right={
          <Link href="/" className="text-xs font-semibold text-foreground hover:underline">
            ← Back to Home
          </Link>
        }
      >
        <form onSubmit={onSubmit} className="max-w-xl space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Email</label>
            <input
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Password</label>
            <input
              type="password"
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            className="h-10 rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Log in →"}
          </button>

          <div className="pt-2 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/auth/signup" className="font-semibold text-foreground hover:underline">
              Create an account
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}