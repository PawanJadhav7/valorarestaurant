"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface GlassCardGlowProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function GlassCardGlow({
  children,
  className,
  glow = true,
}: GlassCardGlowProps) {
  return (
    <div className="relative group">
      {glow && (
        <div className="absolute -inset-0.5 rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition duration-500 bg-gradient-to-r from-blue-400/70 via-pink-400/60 to-emerald-300/70" />
      )}

      <div
        className={clsx(
          "relative rounded-2xl border border-white/10",
          "bg-white/5 backdrop-blur-xl",
          "shadow-xl",
          "p-6",
          "transition-all duration-300",
          "hover:border-white/20 hover:shadow-2xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}