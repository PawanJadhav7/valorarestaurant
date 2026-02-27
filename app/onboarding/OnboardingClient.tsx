// app/onboarding/OnboardingClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/valora/SectionCard";
import { RequireSession } from "@/components/auth/RequireSession";
import { getSession, setOnboardingStatus } from "@/lib/sim/store";
import { nextRouteForSession } from "@/lib/sim/flow";

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-5">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export default function OnboardingClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const demo = sp.get("demo");

  const withDemo = React.useCallback(
    (path: string) => (demo ? `${path}${path.includes("?") ? "&" : "?"}demo=${demo}` : path),
    [demo]
  );

  const go = (path: string) => router.push(withDemo(path));

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [posConnected, setPosConnected] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const s = getSession();
    if (!s?.ok) return;

    // If subscription not active, force plan page
    if (s.subscriptionStatus !== "active") {
      go("/signup");
      return;
    }

    // If onboarding already done, go to dashboard
    const next = nextRouteForSession(s);
    if (next === "/restaurant" && s.onboardingStatus === "done") {
      go("/restaurant");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    setBusy(true);
    try {
      const s = getSession();
      if (!s?.ok) {
        go("/login");
        return;
      }
      setOnboardingStatus(s.clientId, "done");
      go("/restaurant");
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(fileName || posConnected);

  return (
    <RequireSession>
      <div className="mx-auto max-w-[1100px] px-4 py-10">
        <SectionCard
          title="Onboarding"
          subtitle="Upload initial data (CSV/Excel) or connect POS (mock). Once done, you’ll land on the executive Overview."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <StepCard title="Option A — Upload CSV / Excel (mock)">
              <div className="mt-2">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border file:border-border file:bg-background/30 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/40"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  Selected: <span className="text-foreground">{fileName ?? "—"}</span>
                </div>
              </div>
            </StepCard>

            <StepCard title="Option B — POS Integration (mock)">
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Connector status:{" "}
                  <span className="font-semibold text-foreground">{posConnected ? "Connected" : "Not connected"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPosConnected(true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background/30 px-4 text-sm font-semibold text-foreground hover:bg-muted/40"
                >
                  Connect POS
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Later we’ll replace this with Toast/Square OAuth + webhook ingestion.
              </div>
            </StepCard>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={finish}
              disabled={!ready || busy}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Finishing…" : "Finish onboarding → Go to Overview"}
            </button>

            <Link
              href={withDemo("/signup")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background/30 px-5 text-sm font-semibold text-foreground hover:bg-muted/40"
            >
              Back to plans
            </Link>

            <Link
              href={withDemo("/")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background/20 px-5 text-sm font-semibold text-foreground hover:bg-muted/40"
            >
              Home
            </Link>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/15 p-3 text-xs text-muted-foreground">
            Demo rule: onboarding is considered complete if you upload a file <span className="text-foreground">or</span>{" "}
            connect POS (mock).
          </div>
        </SectionCard>
      </div>
    </RequireSession>
  );
}