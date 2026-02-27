"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { getSession, setPlanForClient, signup } from "@/lib/sim/store";
import type { PlanTier } from "@/lib/sim/types";

function PlanCard({
  title,
  subtitle,
  price,
  cta,
  highlighted,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  price: string;
  cta: string;
  highlighted?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-background/30 p-5 backdrop-blur-xl",
        "shadow-[0_6px_24px_rgba(0,0,0,0.06)]",
        highlighted ? "ring-2 ring-ring/30" : "",
        disabled ? "opacity-60 pointer-events-none" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        </div>
        {highlighted ? (
          <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-[11px] font-semibold text-foreground">
            Recommended
          </span>
        ) : null}
      </div>

      <div className="mt-4 text-3xl font-semibold text-foreground">{price}</div>

      <button
        onClick={onClick}
        disabled={disabled}
        className={[
          "mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border",
          highlighted
            ? "bg-foreground text-background hover:opacity-90"
            : "bg-background/30 text-foreground hover:bg-muted/40",
          "text-sm font-semibold",
        ].join(" ")}
      >
        {cta}
      </button>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const demo = sp.get("demo");

  const go = (path: string) => router.push(demo ? `${path}?demo=${demo}` : path);

  const [ownerNum, setOwnerNum] = React.useState<number>(1);
  const [clientNum, setClientNum] = React.useState<number>(1);
  const [name, setName] = React.useState<string>("Operator 01");
  const [password, setPassword] = React.useState<string>("Valora@123");

  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState<PlanTier | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const session = getSession();
  const hasSession = Boolean(session?.ok);

  const emailPreview = `owner${ownerNum}@client${clientNum}.com`;

  const createAccount = async () => {
    setErr(null);
    setCreating(true);
    try {
      const res = signup(ownerNum, clientNum, name, password || "Valora@123");
      if (!res.ok) {
        setErr(res.error);
        return false;
      }
      return true;
    } finally {
      setCreating(false);
    }
  };

  const choosePlan = async (plan: PlanTier) => {
    setErr(null);
    setBusy(plan);
    try {
      // If no session, create account first
      let s = getSession();
      if (!s?.ok) {
        const ok = await createAccount();
        if (!ok) return;
        s = getSession();
      }

      if (!s?.ok) {
        setErr("Session not created. Please try again.");
        return;
      }

      setPlanForClient(s.clientId, plan);
      go("/onboarding");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10">
      <div className="space-y-6">
        <SectionCard
          title="Create account"
          subtitle="Demo accounts use: owner{N}@client{N}.com (N = 1–10). Password defaults to Valora@123."
        >
          {hasSession ? (
            <div className="rounded-2xl border border-border bg-background/20 p-4 text-sm">
              <div className="text-foreground font-semibold">You’re already signed in.</div>
              <div className="mt-1 text-muted-foreground">
                Signed in as <span className="text-foreground font-medium">{session?.email}</span>. Choose a plan below.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Owner number (1–10)</div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={ownerNum}
                    onChange={(e) => setOwnerNum(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Client number (1–10)</div>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={clientNum}
                    onChange={(e) => setClientNum(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Name (optional)</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Operator 01"
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Password</div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Valora@123"
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background/30 px-3 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Email preview: <span className="text-foreground font-semibold">{emailPreview}</span>
                </div>

                <button
                  onClick={createAccount}
                  disabled={creating}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create Account"}
                </button>
              </div>
            </>
          )}

          {err ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-foreground">
              <div className="font-semibold">Signup error</div>
              <div className="mt-1 text-xs text-muted-foreground">{err}</div>
            </div>
          ) : null}

          <div className="mt-4 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href={demo ? `/login?demo=${demo}` : "/login"} className="font-semibold text-foreground hover:underline">
              Login →
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Choose your plan"
          subtitle="Demo flow: selecting a plan activates subscription and assigns credits."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <PlanCard
              title="Free"
              subtitle="Best for evaluation"
              price="$0"
              cta={busy === "FREE" ? "Activating…" : "Select Free"}
              disabled={busy !== null}
              onClick={() => choosePlan("FREE")}
            />

            <PlanCard
              title="Premium"
              subtitle="Multi-location insights + alerts"
              price="$499/mo"
              cta={busy === "PREMIUM" ? "Activating…" : "Select Premium"}
              highlighted
              disabled={busy !== null}
              onClick={() => choosePlan("PREMIUM")}
            />

            <PlanCard
              title="Custom"
              subtitle="Enterprise controls + SLA"
              price="Custom"
              cta={busy === "CUSTOM" ? "Activating…" : "Enable Custom (Demo)"}
              disabled={busy !== null}
              onClick={() => choosePlan("CUSTOM")}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link href={demo ? `/?demo=${demo}` : "/"} className="font-semibold text-foreground hover:underline">
              Back to Home →
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}