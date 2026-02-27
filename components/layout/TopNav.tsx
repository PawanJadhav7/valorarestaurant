"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getSession, clearSession } from "@/lib/sim/store";
import { LogOut, ChevronRight } from "lucide-react";
import { GlassButton } from "@/components/ui/GlassButton";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const demo = sp.get("demo");

  const [hasSession, setHasSession] = React.useState(false);

  const withDemo = React.useCallback(
    (path: string) => (demo ? `${path}${path.includes("?") ? "&" : "?"}demo=${demo}` : path),
    [demo]
  );

  React.useEffect(() => {
    const s = getSession();
    setHasSession(Boolean(s?.ok));
  }, [pathname]);

  const onLogout = React.useCallback(() => {
    clearSession();
    router.push(withDemo("/login"));
  }, [router, withDemo]);

  const onRestaurant = pathname === "/restaurant" || pathname.startsWith("/restaurant/");

  return (
    <div className="glass flex items-center justify-between px-6 py-3">
      {/* Brand: always goes Home, does NOT clear session */}
      <Link href={withDemo("/")} className="text-lg font-semibold">
        Valora AI
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {hasSession ? (
          <>
            {!onRestaurant ? (
              <Link href={withDemo("/restaurant")} className="inline-flex">
                <GlassButton className="px-3 py-2.5">
                  Go to Dashboard
                </GlassButton>
              </Link>
            ) : null}

            {/* Logout styled like sidebar tab */}
            <GlassButton
              onClick={onLogout}
              iconLeft={<LogOut className="h-4 w-4" />}
              iconRight="›"
            >
              Logout
            </GlassButton>
          </>
        ) : (
          <>
            {/* Logged out */}
            <Link href={withDemo("/login")} className="inline-flex">
              <GlassButton className="px- py-2.5">Login</GlassButton>
            </Link>

            <GlassButton className="px-3 py-2.5 bg-background/25 border-border/20 text-foreground">
              Sign up
            </GlassButton>
          </>
        )}
      </div>
    </div>
  );
}