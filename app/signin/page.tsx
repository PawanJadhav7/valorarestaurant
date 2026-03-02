import { Suspense } from "react";
import SignInClient from "./signin-client";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}