//components/finance/FinanceSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

type NavGroup = {
  section: string;
  items: { label: string; href: string }[];
};

const FINANCE_NAV: NavGroup[] = [
  {
    section: "Executive",
    items: [
      { label: "Overview", href: "/finance" },
      { label: "AI Insights", href: "/finance/insights" },
    ],
  },
  {
    section: "Core",
    items: [
      { label: "Revenue", href: "/finance/revenue" }, // ✅ NEW
      { label: "Cashflow", href: "/finance/cashflow" },
      { label: "Expenses", href: "/finance/expenses" },
    ],
  },
  {
    section: "Planning",
    items: [
      { label: "Budget", href: "/finance/budget" },
      { label: "Forecast", href: "/finance/forecast" },
    ],
  },
  {
    section: "Risk & Controls",
    items: [
      { label: "Liquidity", href: "/finance/liquidity" },
      { label: "Exposure", href: "/finance/exposure" },
      { label: "Anomalies", href: "/finance/anomalies" },
      { label: "Alerts", href: "/finance/alerts" },
    ],
  },
  {
    section: "Administration",
    items: [
      { label: "Data Sources", href: "/finance/data-sources" },
      { label: "Settings", href: "/finance/settings" },
    ],
  },
];

export function FinanceSidebar() {
  const pathname = usePathname();

  // Alerts summary (v1)
  const [alertCount, setAlertCount] = React.useState<number>(0);
  const [alertsCheckedAt, setAlertsCheckedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/finance/alerts/summary", {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) return;

        const json = await res.json();
        setAlertCount(Number(json?.active_count ?? 0));
        setAlertsCheckedAt(json?.checked_at ? String(json.checked_at) : null);
      } catch {
        // silent fail — sidebar must never break
      }
    })();

    return () => ac.abort();
  }, []);

  return (
    <aside className="w-full rounded-2xl border border-border bg-card p-4 space-y-6 h-fit md:text-sm">
      <div className="text-sm font-semibold text-foreground">Finance</div>

      {FINANCE_NAV.map((group) => (
        <div key={group.section} className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {group.section}
          </div>

          {group.items.map((item) => {
            const active =
              item.href === "/finance"
                ? pathname === "/finance"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "block rounded-md px-2 py-1.5 text-sm transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                ].join(" ")}
              >
                <div className="flex items-center gap-2 w-full">
                  <span>{item.label}</span>

                  {item.href === "/finance/alerts" && (
                    <span className="ml-auto inline-flex items-center gap-2">
                      {alertsCheckedAt && (
                        <span className="hidden lg:inline text-[11px] text-muted-foreground">
                          {new Date(alertsCheckedAt).toLocaleTimeString()}
                        </span>
                      )}

                      {alertCount > 0 && (
                        <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full border border-border bg-muted/40 px-2 text-[11px] text-foreground">
                          {alertCount}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}