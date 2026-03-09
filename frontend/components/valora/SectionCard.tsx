"use client";

import * as React from "react";

export type SectionCardProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode | null;
  right?: React.ReactNode;
  children: React.ReactNode;
};

export function SectionCard({ title, subtitle, right, children }: SectionCardProps) {
  return (
    <div className="glass rounded-3xl border border-border/20 bg-background/20 p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-foreground">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}