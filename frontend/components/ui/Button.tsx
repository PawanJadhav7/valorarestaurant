"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "glass" | "ghost";
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export function Button({
  children,
  variant = "glass",
  iconLeft,
  iconRight,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",

        // BASE STYLES
        "disabled:opacity-60 disabled:cursor-not-allowed",

        // VARIANTS
        variant === "glass" &&
          "glass border border-border/10 bg-background/15 backdrop-blur-xl text-muted-foreground " +
            "shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:bg-background/25 hover:text-foreground hover:-translate-y-[1px]",

        variant === "primary" &&
          "bg-gradient-to-r from-sky-500 to-indigo-600 text-white " +
            "shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01]",

        variant === "ghost" &&
          "text-muted-foreground hover:text-foreground hover:bg-background/40",

        className
      )}
    >
      {/* shimmer effect (only for glass) */}
      {variant === "glass" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <span className="absolute -inset-[120%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </span>
      )}

      {iconLeft && (
        <span className="relative h-4 w-4 opacity-70 group-hover:opacity-100">
          {iconLeft}
        </span>
      )}

      <span className="relative">{children}</span>

      {iconRight && (
        <span className="relative text-xs opacity-70 group-hover:opacity-100">
          {iconRight}
        </span>
      )}
    </button>
  );
}