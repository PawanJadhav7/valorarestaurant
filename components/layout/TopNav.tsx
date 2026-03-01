// components/layout/TopNav.tsx
"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type MeResp =
  | {
      ok: true;
      user: {
        user_id: string;
        email: string;
        full_name: string | null;
        client_name: string | null;
        onboarding_status: string | null;
      };
    }
  | { ok: false; user: null; error?: string };

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();

  // keep your demo query param behavior (optional)
  const [demo, setDemo] = React.useState<string | null>(null);

  // real session state
  const [loading, setLoading] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);
  const [name, setName] = React.useState<string | null>(null);

  const withDemo = React.useCallback(
    (path: string) => (demo ? `${path}${path.includes("?") ? "&" : "?"}demo=${demo}` : path),
    [demo]
  );

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = (await safeJson(r)) as MeResp;

      if (j.ok && j.user) {
        setHasSession(true);
        const display = j.user.client_name ?? j.user.full_name ?? j.user.email ?? null;
        setName(display && display.trim().length ? display : null);
      } else {
        setHasSession(false);
        setName(null);
      }
    } catch {
      setHasSession(false);
      setName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // read demo from URL without useSearchParams()
    try {
      const sp = new URLSearchParams(window.location.search);
      setDemo(sp.get("demo"));
    } catch {
      setDemo(null);
    }

    // real auth check
    loadMe();
  }, [pathname, loadMe]);

  const onLogout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setHasSession(false);
      setName(null);
      router.push(withDemo("/login"));
      router.refresh();
    }
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
            {name ? (
              <div className="hidden sm:block text-sm text-muted-foreground">
                Hi, <span className="text-foreground font-semibold">{name}</span>
              </div>
            ) : loading ? (
              <div className="hidden sm:block text-sm text-muted-foreground">Checking…</div>
            ) : null}

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