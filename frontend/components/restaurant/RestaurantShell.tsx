// components/restaurant/RestaurantShell.tsx
"use client";

import * as React from "react";
import { RestaurantSidebar } from "@/components/restaurant/RestaurantSidebar";
import { usePathname } from "next/navigation";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RestaurantShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const pathname = usePathname();
  const UI_POLISH = process.env.NEXT_PUBLIC_UI_POLISH === "1";

  // Close drawer when route changes
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC closes drawer
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent background scroll while open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        {/* Mobile top bar */}
        <div className="lg:hidden mb-3">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
              aria-label="Open menu"
            >
              <MenuIcon className="h-4 w-4" />
              Menu
            </button>

            <div className="text-sm font-semibold text-foreground">Valora Restaurant</div>

            <div className="w-[74px]" />
          </div>
        </div>

        {/* Desktop grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block lg:sticky lg:top-4 lg:self-start">
            <RestaurantSidebar />
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
        
        {(open || closing) && (
        <div className="lg:hidden">
            {/* Backdrop */}
            <button
            type="button"
            aria-label="Close menu"
            onClick={() => {
                setClosing(true);
                setTimeout(() => {
                setClosing(false);
                setOpen(false);
                }, 200);
            }}
            className={[
                "fixed inset-0 z-40 cursor-default bg-black/40 transition-opacity duration-200",
                closing ? "opacity-0" : "opacity-100",
            ].join(" ")}
            />

            {/* Panel */}
            <div
            className={[
                "fixed inset-y-0 left-0 z-50 w-[88%] max-w-[340px] p-3 transition-all duration-200",
                closing ? "translate-x-[-16px] opacity-0" : "translate-x-0 opacity-100",
            ].join(" ")}
            >
            <div className="h-full rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="text-sm font-semibold text-foreground">Menu</div>

                <button
                    type="button"
                    onClick={() => {
                    setClosing(false);
                    setOpen(true);
                    }}
                    className="rounded-xl border border-border bg-background/40 p-2 text-foreground hover:bg-muted/30"
                    aria-label="Close menu"
                >
                    <XIcon className="h-4 w-4" />
                </button>
                </div>

                <div className="p-3">
                <RestaurantSidebar />
                </div>
            </div>
            </div>
        </div>
        )}
      
    </div>
  );
}