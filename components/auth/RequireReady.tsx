// components/auth/RequireReady.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession } from "@/lib/sim/store";
import { nextRouteForSession } from "@/lib/sim/flow";

function getDemoQuery(): string {
  try {
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("demo");
    return d ? `&demo=${encodeURIComponent(d)}` : "";
  } catch {
    return "";
  }
}

function withDemo(path: string): string {
  try {
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("demo");
    if (!d) return path;
    return `${path}${path.includes("?") ? "&" : "?"}demo=${encodeURIComponent(d)}`;
  } catch {
    return path;
  }
}

export function RequireReady({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const s = getSession();

    // Not logged in -> login
    if (!s?.ok) {
      const next = encodeURIComponent(pathname || "/restaurant");
      router.replace(`/login?next=${next}${getDemoQuery()}`);
      return;
    }

    // Logged in -> enforce flow (plan/onboarding/restaurant)
    const required = nextRouteForSession(s);

    // Allow if already on required route, or deeper inside restaurant when required is /restaurant
    const allowed =
      required === pathname ||
      (required === "/restaurant" && (pathname === "/restaurant" || pathname.startsWith("/restaurant/")));

    if (!allowed) {
      router.replace(withDemo(required));
      return;
    }

    setOk(true);
  }, [router, pathname]);

  if (!ok) return null;
  return <>{children}</>;
}