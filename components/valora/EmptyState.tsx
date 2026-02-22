"use client";

import * as React from "react";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {message ? <div className="mt-2 text-sm text-muted-foreground">{message}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}