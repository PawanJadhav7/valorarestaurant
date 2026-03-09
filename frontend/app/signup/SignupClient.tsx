//app/signup/SignupClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Signup API returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
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
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg backdrop-blur-xl">
        <div className="text-2xl font-semibold tracking-tight text-foreground">Create account</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Start your multi-location KPI workspace in minutes.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-foreground/30"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-foreground/30"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <input
            className="h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none transition focus:border-foreground/30"
            placeholder="Contact (phone)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />

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
            placeholder="Password (8+ chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            disabled={loading}
            className="h-11 w-full rounded-xl border border-border bg-foreground text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            Have an account?{" "}
            <Link className="font-semibold text-foreground hover:underline" href="/signin">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}