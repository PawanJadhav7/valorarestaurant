"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";

  const Icon =
    theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;

  const label =
    theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light";

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className="glass rounded-xl border border-border/30 bg-background/30 p-2 shadow-sm transition hover:bg-background/40"
      aria-label={`Theme: ${label}. Click to switch to ${nextTheme}.`}
      title={`Theme: ${label} (click for ${nextTheme})`}
    >
      <Icon className="h-4 w-4 text-foreground" />
    </button>
  );
}