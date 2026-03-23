
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  glow?: "default" | "subtle" | "strong";
};

export default function GlassCardGlow({
  children,
  className,
  glow = "default",
}: Props) {
  const glowStyles = {
    subtle:
      "from-sky-500/20 via-indigo-500/20 to-purple-500/20 opacity-40",
    default:
      "from-sky-500/40 via-indigo-500/40 to-purple-500/40 opacity-60",
    strong:
      "from-sky-500 via-indigo-500 to-purple-500 opacity-80",
  };

  return (
    <div className="group relative rounded-[28px] p-[1px]">
      {/* Glow Layer */}
      <div
        className={cn(
          "absolute inset-0 rounded-[28px] blur-md transition duration-500",
          "bg-gradient-to-r",
          glowStyles[glow]
        )}
      />

      {/* Card */}
      <div
        className={cn(
          "relative rounded-[28px] border border-border/30 bg-background/20 p-6 shadow-xl backdrop-blur-2xl",
          "transition duration-300 group-hover:scale-[1.01]",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}