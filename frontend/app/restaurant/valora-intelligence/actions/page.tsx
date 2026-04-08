"use client";

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AiInsightsPage() {
  return (
    <main className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          AI Insights
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          AI insights are available from the main insights workspace.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          This route is now a valid page module so the app can compile cleanly.
          Use the main insights view to review current recommendations and
          operational context.
        </p>
        <div className="mt-5">
          <Link
            href="/restaurant/insights"
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Open insights
          </Link>
        </div>
      </div>
    </main>
  );
}
