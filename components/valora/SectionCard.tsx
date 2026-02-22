// components/valora/SectionCard.tsx
"use client";

import * as React from "react";

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ title, subtitle, right, children, className = "" }: Props) {
  return (
    <section
      className={[
        // Glass shell
        "glass rounded-2xl",
        // Inner spacing + subtle separation
        "p-4 md:p-5",
        // Make sure content doesn’t get covered by ::before/::after sheen layers
        "relative overflow-hidden",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>

        {right ? <div className="shrink-0 flex items-center gap-2">{right}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}