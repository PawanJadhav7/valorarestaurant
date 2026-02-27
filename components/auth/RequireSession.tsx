// components/auth/RequireSession.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSession } from "@/lib/sim/store";

export function RequireSession({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const s = getSession();
    if (!s?.ok) {
      const next = encodeURIComponent(pathname || "/restaurant");
      const demo = searchParams.get("demo");
      router.replace(`/login?next=${next}${demo ? `&demo=${demo}` : ""}`);
      return;
    }
    setOk(true);
  }, [router, pathname, searchParams]);

  if (!ok) return null;
  return <>{children}</>;
}