"use client";

import * as React from "react";

export function PageHeader({
  title,
  subtitle,
  right,
  meta,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        {meta ? (
          <div className="mt-1 text-[11px] text-muted-foreground/80">{meta}</div>
        ) : null}
      </div>

      {right ? (
        <div className="w-full sm:w-auto shrink-0">
          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            {right}
          </div>
        </div>
      ) : null}
    </div>
  );
}