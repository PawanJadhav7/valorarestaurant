// components/layout/TopNav.tsx
"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-border/30">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          {/* Left: Brand */}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground sm:text-base">
              Valora AI
            </div>
            {/* Optional micro-subtitle (remove if you want cleaner) */}
            <div className="hidden text-xs text-muted-foreground sm:block">
              Restaurant Intelligence
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}