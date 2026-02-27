// components/auth/RequireReady.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession } from "@/lib/sim/store";
import { nextRouteForSession } from "@/lib/sim/flow";

export function RequireReady({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const s = getSession();
    if (!s?.ok) {
      router.replace("/login");
      return;
    }

    const next = nextRouteForSession(s);
    const demo = searchParams.get("demo");
    const withDemo = demo ? `${next}?demo=${demo}` : next;

    // If user is not “ready”, redirect them
    if (next !== "/restaurant") {
      router.replace(withDemo);
      return;
    }

    setOk(true);
  }, [router, searchParams]);

  if (!ok) return null;
  return <>{children}</>;
}
