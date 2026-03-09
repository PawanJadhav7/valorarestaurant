"use client";

import * as React from "react";

export function InsightPanel({
  title = "AI Insights",
  headline,
  items,
  footer,
}: {
  title?: string;
  headline?: React.ReactNode;
  items?: Array<{ title: string; detail: React.ReactNode }>;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>

      {headline ? (
        <div className="mt-2 rounded-xl border border-border bg-background/40 p-3">
          <div className="text-sm text-foreground">{headline}</div>
        </div>
      ) : null}

      {items?.length ? (
        <div className="mt-3 space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="text-xs font-semibold text-foreground">{it.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{it.detail}</div>
            </div>
          ))}
        </div>
      ) : null}

      {footer ? <div className="mt-3 text-[11px] text-muted-foreground">{footer}</div> : null}
    </div>
  );
}