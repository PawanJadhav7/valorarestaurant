// frontend/components/auth/RequireSession.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

async function hasRealSession(): Promise<boolean> {
  try {
    const r = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "include",
    });
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

    async function run() {
      const yes = await hasRealSession();
      if (!alive) return;

      setOk(yes);

      if (!yes) {
        const safeNext =
          pathname && pathname.startsWith("/") ? pathname : "/restaurant";

        if (pathname !== "/signin") {
          router.replace(`/signin?next=${encodeURIComponent(safeNext)}`);
        }
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [router, pathname]);

  if (ok === null) {
    return (
      <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (!ok) return null;

  return <>{children}</>;
}