"use client";

import * as React from "react";

type GlassButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export function GlassButton({
  children,
  iconLeft,
  iconRight,
  className = "",
  ...props
}: GlassButtonProps) {
  return (
    <button
      {...props}
      className={[
        "group relative inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",

        // Glass base (matches sidebar)
        "glass border border-border/10 bg-background/15 backdrop-blur-xl",

        // Depth + hover
        "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        "hover:bg-background/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",

        "text-muted-foreground hover:text-foreground",

        className,
      ].join(" ")}
    >
      {/* shimmer sweep */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="absolute -inset-[120%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </span>

      {iconLeft ? (
        <span className="relative h-4 w-4 opacity-60 transition-all duration-200 group-hover:opacity-80 group-hover:text-foreground">
          {iconLeft}
        </span>
      ) : null}

      <span className="relative font-medium">{children}</span>

      {iconRight ? (
        <span className="relative ml-1 text-xs text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
          {iconRight}
        </span>
      ) : null}
    </button>
  );
}