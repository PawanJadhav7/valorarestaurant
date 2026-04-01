"use client";

import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}

export default function Button({
  children,
  className,
  variant = "primary",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "group relative inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",

        // glass base
        "glass border border-border/10 bg-background/15 backdrop-blur-xl",

        // shared depth
        "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
        "hover:bg-background/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",

        // variants
        variant === "primary" && "text-foreground",
        variant === "secondary" && "text-muted-foreground hover:text-foreground",
        variant === "ghost" &&
          "border-transparent bg-transparent shadow-none text-muted-foreground hover:bg-background/10 hover:text-foreground",

        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",

        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span className="absolute -inset-[120%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </span>

      {loading ? (
        <span className="relative flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          Loading...
        </span>
      ) : (
        <span className="relative font-medium">{children}</span>
      )}
    </button>
  );
}