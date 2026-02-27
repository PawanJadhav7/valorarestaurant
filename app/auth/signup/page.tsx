// app/auth/signup/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { setFlag } from "@/lib/va-session";

export default function SignupPage() {
  const r = useRouter();
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // MVP: accept any company/email
    setTimeout(() => {
      setFlag("va_authed", true);
      r.push("/billing");
    }, 350);
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Create your account"
        subtitle="Set up in minutes. Upgrade later — keep the same UI."
        right={
          <Link href="/" className="text-xs font-semibold text-foreground hover:underline">
            ← Back to Home
          </Link>
        }
      >
        <form onSubmit={onSubmit} className="max-w-xl space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Company / Brand</label>
            <input
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Valora Restaurants"
              required
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Work Email</label>
            <input
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <button
            className="h-10 rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating…" : "Continue →"}
          </button>

          <div className="pt-2 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-foreground hover:underline">
              Log in
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}