"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type FormMessageProps = {
  children: React.ReactNode;
  variant?: "error" | "info" | "success";
  className?: string;
};

export function FormMessage({
  children,
  variant = "info",
  className,
}: FormMessageProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        variant === "error" && "border-red-500/25 bg-red-500/10 text-red-200",
        variant === "info" && "border-border/60 bg-background/40 text-muted-foreground",
        variant === "success" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
        className
      )}
    >
      {children}
    </div>
  );
}