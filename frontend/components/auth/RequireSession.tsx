"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

async function hasRealSession(): Promise<boolean> {
  try {
    const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    return r.ok;
  } catch {
    return false;
  }
}

export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const yes = await hasRealSession();
      if (!alive) return;
      setOk(yes);

      if (!yes) {
        const next = encodeURIComponent(pathname || "/restaurant");
        router.replace(`/signin?next=${next}`);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (ok === null) return null; // or a small skeleton
  if (!ok) return null;

  return <>{children}</>;
}