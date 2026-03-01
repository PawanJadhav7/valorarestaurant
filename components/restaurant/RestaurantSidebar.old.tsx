// components/restaurant/RestaurantSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { DataHealthDot } from "@/components/restaurant/DataHealthDot";

// lucide icons (single import only)
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  ClipboardList,
  Database,
  Settings,
  Users,
  Boxes,
  Bell,
  ShieldCheck,
  ChefHat,
  BadgeDollarSign,
  Target,
  LineChart,
} from "lucide-react";

type NavSection =
  | "Overview"
  | "Sales & Demand"
  | "Cost Control"
  | "Inventory"
  | "Kitchen"
  | "Customers"
  | "Staff"
  | "Compliance"
  | "Strategic View"
  | "AI Insights";

type NavItem = {
  label: string;
  href: string;
  section: NavSection;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string; // optional (e.g., "NEW", "AI")
};

const NAV: NavItem[] = [
  // Overview
  { label: "Overview", href: "/restaurant", section: "Overview", icon: LayoutDashboard },

  // Sales & Demand
  { label: "Sales", href: "/restaurant/sales", section: "Sales & Demand", icon: TrendingUp },
  { label: "Demand", href: "/restaurant/demand", section: "Sales & Demand", icon: LineChart },

  // Cost Control
  { label: "Cost Dashboard", href: "/restaurant/costs", section: "Cost Control", icon: BadgeDollarSign },
  { label: "Ops Dashboard", href: "/restaurant/ops", section: "Cost Control", icon: ClipboardList },
  { label: "Alerts", href: "/restaurant/ops/alerts", section: "Cost Control", icon: Bell },

  // Inventory
  { label: "Inventory", href: "/restaurant/ops/inventory", section: "Inventory", icon: Boxes },
  { label: "Data", href: "/restaurant/data", section: "Inventory", icon: Database },

  // Kitchen
  { label: "Kitchen", href: "/restaurant/kitchen", section: "Kitchen", icon: ChefHat },

  // Customers
  { label: "Customers", href: "/restaurant/customers", section: "Customers", icon: Target },

  // Staff
  { label: "Labor", href: "/restaurant/ops/labor", section: "Staff", icon: Users },

  // Compliance
  { label: "Compliance", href: "/restaurant/compliance", section: "Compliance", icon: ShieldCheck },

  // Strategic View
  { label: "Strategic View", href: "/restaurant/strategy", section: "Strategic View", icon: Sparkles },

  // AI Insights
  { label: "AI Insights", href: "/restaurant/insights", section: "AI Insights", icon: Sparkles, badge: "AI" },

  // Settings (keep at bottom; you can move this under Compliance if you prefer)
  { label: "Settings", href: "/restaurant/settings", section: "Strategic View", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/restaurant") return pathname === "/restaurant";
  return pathname === href || pathname.startsWith(href + "/");
}

function sectionCls() {
  return "px-1 pt-4 text-[11px] font-semibold tracking-wide text-muted-foreground/80";
}

function itemCls(active: boolean) {
  return [
    "group relative flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    "glass border border-border/10 bg-background/15 backdrop-blur-xl",
    "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
    "hover:bg-background/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",
    active ? "text-foreground bg-background/30 border-border/20" : "text-muted-foreground",
  ].join(" ");
}

function LeftAccent({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        "absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-opacity duration-300",
        active
          ? "opacity-100 bg-gradient-to-b from-emerald-400 via-sky-400 to-indigo-400"
          : "opacity-0 group-hover:opacity-40 bg-foreground/30",
      ].join(" ")}
    />
  );
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function SectionTitle({ title }: { title: NavSection }) {
  return <div className={sectionCls()}>{title}</div>;
}

export function RestaurantSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [clientName, setClientName] = React.useState<string | null>(null);

  // Close drawer on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Fetch client name (tenant) for header
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!r.ok) {
          if (alive) setClientName(null);
          return;
        }
        const j = await safeJson(r);
        const name = j?.user?.client_name ?? null;
        if (alive) setClientName(typeof name === "string" && name.trim() ? name.trim() : null);
      } catch {
        if (alive) setClientName(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sections: NavSection[] = [
    "Overview",
    "Sales & Demand",
    "Cost Control",
    "Inventory",
    "Kitchen",
    "Customers",
    "Staff",
    "Compliance",
    "Strategic View",
    "AI Insights",
  ];

  const groups = sections.map((s) => ({
    section: s,
    items: NAV.filter((n) => n.section === s),
  }));

  return (
    <div className="relative">
      {/* Mobile trigger */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">Valora Restaurant</div>
            <DataHealthDot />
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">KPIs • Multi-location</div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass rounded-xl border border-border/20 bg-background/20 px-3 py-2 text-sm text-foreground shadow-sm hover:bg-background/30"
          aria-label="Open sidebar"
        >
          Menu
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarContent pathname={pathname} groups={groups} clientName={clientName} />
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/30 backdrop-blur-[2px]"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[85vw] p-3">
            <div className="h-full translate-x-0 animate-[slideIn_.22s_ease-out]">
              <div className="glass h-full rounded-3xl border border-border/20 bg-background/20 shadow-xl">
                <div className="flex items-center justify-between px-4 pt-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-foreground">Valora Restaurant</div>
                      <DataHealthDot />
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">KPIs • Multi-location</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-border/20 bg-background/20 px-3 py-2 text-sm text-foreground hover:bg-background/30"
                  >
                    Close
                  </button>
                </div>

                <div className="px-4 pb-4 pt-2">
                  <SidebarNav pathname={pathname} groups={groups} />
                  <SidebarFooter clientName={clientName} />
                </div>
              </div>
            </div>
          </div>

          <style jsx global>{`
            @keyframes slideIn {
              from {
                transform: translateX(-10px);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({
  pathname,
  groups,
  clientName,
}: {
  pathname: string;
  groups: Array<{ section: NavSection; items: NavItem[] }>;
  clientName: string | null;
}) {
  return (
    <div className="glass rounded-3xl border border-border/20 bg-background/20 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">Valora Restaurant</div>
            <DataHealthDot />
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            {clientName ? (
              <>
                <span className="font-medium text-foreground">{clientName}</span>
                <span className="mx-2 text-muted-foreground/60">•</span>
                Multi-location KPIs
              </>
            ) : (
              "Multi-location KPIs"
            )}
          </div>
        </div>
      </div>

      <SidebarNav pathname={pathname} groups={groups} />
      <SidebarFooter clientName={clientName} />
    </div>
  );
}

function SidebarNav({
  pathname,
  groups,
}: {
  pathname: string;
  groups: Array<{ section: NavSection; items: NavItem[] }>;
}) {
  return (
    <div className="mt-4">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.section}>
            <SectionTitle title={g.section} />

            <div className="mt-2 space-y-2">
              {g.items.map((n) => {
                const active = isActivePath(pathname, n.href);
                const Icon = n.icon;

                return (
                  <Link key={n.href} href={n.href} className={itemCls(active)}>
                    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <span className="absolute -inset-[120%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </span>

                    <LeftAccent active={active} />

                    <Icon
                      className={[
                        "h-4 w-4 transition-all duration-200",
                        active ? "opacity-90 text-foreground" : "opacity-60 group-hover:opacity-80 group-hover:text-foreground",
                      ].join(" ")}
                    />

                    <span className="min-w-0 truncate">{n.label}</span>

                    {n.badge ? (
                      <span className="ml-auto rounded-lg border border-border/20 bg-background/20 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                        {n.badge}
                      </span>
                    ) : (
                      <span className="ml-auto text-xs text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
                        ›
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

function SidebarFooter({ clientName }: { clientName: string | null }) {
  const version = "v0.3.0";

  return (
    <div className="mt-6">
      <div
        className={[
          "glass rounded-2xl border border-border/10 bg-background/15 backdrop-blur-xl",
          "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
          "p-3",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {clientName ? clientName : "Valora Restaurant"}
            </div>
            {/* <div className="mt-0.5 text-[11px] text-muted-foreground">Signed in</div> */}
          </div>

          <div className="shrink-0 rounded-xl border border-border/20 bg-background/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {version}
          </div>
        </div>
      </div>
    </div>
  );
}