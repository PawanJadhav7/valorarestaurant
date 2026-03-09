//app/signin/page.tsx
import { Suspense } from "react";
import SignInClient from "./signin-client";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-10">
          <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
            <div className="text-sm text-muted-foreground">Loading…</div>
          </div>
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}