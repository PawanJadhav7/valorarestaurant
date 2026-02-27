// components/auth/RequireSession.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession } from "@/lib/sim/store";

export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    const s = getSession();

    if (!s?.ok) {
      const next = encodeURIComponent(pathname || "/restaurant");

      let demo = "";
      try {
        const sp = new URLSearchParams(window.location.search);
        const d = sp.get("demo");
        demo = d ? `&demo=${encodeURIComponent(d)}` : "";
      } catch {}

      router.replace(`/login?next=${next}${demo}`);
      return;
    }

    setAuthorized(true);
  }, [router, pathname]);

  if (!authorized) return null;
  return <>{children}</>;
}