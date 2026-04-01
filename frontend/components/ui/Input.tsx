"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-xl px-4 py-3 text-sm",
          "transition-all duration-200 outline-none",

          // ✅ Theme-aware text
          "text-foreground placeholder:text-muted-foreground",

          // ✅ Glass background (visible in light + dark)
          "bg-background/60 backdrop-blur-md",

          // ✅ Border (key for light mode visibility)
          "border border-border/70",

          // ✅ Focus state (clean + premium)
          "focus:border-foreground/30 focus:bg-background/80 focus:ring-2 focus:ring-foreground/10",

          // ❗ Error state
          error && "border-red-400/60 focus:ring-red-400/20",

          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",

          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;