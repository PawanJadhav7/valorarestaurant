//app/signin/signin-client.tsx
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

export default function SignInClient() {
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/restaurant";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="text-lg font-semibold text-foreground">Sign in</div>

      <div className="mt-2 text-sm text-muted-foreground">
        After sign-in you’ll go to:{" "}
        <span className="font-medium text-foreground">{next}</span>
      </div>

      {/* Paste your existing sign-in form UI here */}
    </div>
  );
}