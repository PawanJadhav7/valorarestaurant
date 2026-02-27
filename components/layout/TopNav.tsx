// components/layout/TopNav.tsx
"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getSession, clearSession } from "@/lib/sim/store";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [demo, setDemo] = React.useState<string | null>(null);
  const [hasSession, setHasSession] = React.useState(false);
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    // read demo from URL without useSearchParams()
    try {
      const sp = new URLSearchParams(window.location.search);
      setDemo(sp.get("demo"));
    } catch {
      setDemo(null);
    }

    const s = getSession();
    setHasSession(Boolean(s?.ok));
    setName(s?.ok ? s.name : null);
  }, [pathname]);

  const withDemo = React.useCallback(
    (path: string) => (demo ? `${path}${path.includes("?") ? "&" : "?"}demo=${demo}` : path),
    [demo]
  );

  const onLogout = React.useCallback(() => {
    clearSession();
    router.push(withDemo("/login"));
  }, [router, withDemo]);

  const onHome = withDemo("/");
  const onDashboard = withDemo("/restaurant");
  const onLogin = withDemo("/login");
  const onSignup = withDemo("/signup");

  const onRestaurant = pathname === "/restaurant" || pathname.startsWith("/restaurant/");

  return (
    <div className="glass flex items-center justify-between px-6 py-3">
      <Link href={onHome} className="text-lg font-semibold">
        Valora AI
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {hasSession ? (
          <>
            {name ? <div className="hidden sm:block text-sm text-muted-foreground">Hi, <span className="text-foreground font-semibold">{name}</span></div> : null}

            {!onRestaurant ? (
              <Link href={onDashboard} className="glass px-4 py-2 text-sm font-medium inline-flex items-center justify-center">
                Go to Dashboard
              </Link>
            ) : null}

            <button
              onClick={onLogout}
              className="group relative flex items-center justify-center rounded-2xl px-4 py-2 text-sm transition-all duration-200
                         glass border border-border/10 bg-background/15 backdrop-blur-xl
                         shadow-[0_4px_20px_rgba(0,0,0,0.05)]
                         hover:bg-background/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href={onLogin} className="glass px-4 py-2 text-sm font-medium inline-flex items-center justify-center">
              Login
            </Link>
            <Link href={onSignup} className="glass px-4 py-2 text-sm font-medium inline-flex items-center justify-center">
              Sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}