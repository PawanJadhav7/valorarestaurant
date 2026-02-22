"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { DataHealthDot } from "@/components/restaurant/DataHealthDot";

// lucide icons
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  ClipboardList,
  Database,
  Settings,
} from "lucide-react";

type NavSection = "Executive" | "Operations" | "Admin";
type NavItem = {
  label: string;
  href: string;
  section: NavSection;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { label: "Overview", href: "/restaurant", section: "Executive", icon: LayoutDashboard },
  { label: "Sales", href: "/restaurant/sales", section: "Executive", icon: TrendingUp },
  { label: "Insights", href: "/restaurant/insights", section: "Executive", icon: Sparkles },

  { label: "Ops", href: "/restaurant/ops", section: "Operations", icon: ClipboardList },
  { label: "Data", href: "/restaurant/data", section: "Operations", icon: Database },

  { label: "Settings", href: "/restaurant/settings", section: "Admin", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/restaurant") return pathname === "/restaurant";
  return pathname === href || pathname.startsWith(href + "/");
}

function sectionTitle(s: NavSection) {
  if (s === "Executive") return "Executive";
  if (s === "Operations") return "Operations";
  return "Admin";
}

function sectionCls() {
  return "px-1 pt-4 text-[11px] font-semibold tracking-wide text-muted-foreground/80";
}

function itemCls(active: boolean) {
  return [
    "group relative flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",

    // Base glass tile
    "glass border border-border/10 bg-background/15 backdrop-blur-xl",

    // Depth + hover
    "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
    "hover:bg-background/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]",

    active
      ? "text-foreground bg-background/30 border-border/20"
      : "text-muted-foreground",
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

export function RestaurantSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const groups: Array<{ section: NavSection; items: NavItem[] }> = [
    { section: "Executive", items: NAV.filter((n) => n.section === "Executive") },
    { section: "Operations", items: NAV.filter((n) => n.section === "Operations") },
    { section: "Admin", items: NAV.filter((n) => n.section === "Admin") },
  ];

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
        <SidebarContent pathname={pathname} groups={groups} />
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
                  <SidebarFooter />
                </div>
              </div>
            </div>
          </div>

          <style jsx global>{`
            @keyframes slideIn {
              from { transform: translateX(-10px); opacity: 0.0; }
              to   { transform: translateX(0);     opacity: 1.0; }
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
}: {
  pathname: string;
  groups: Array<{ section: NavSection; items: NavItem[] }>;
}) {
  return (
    <div className="glass rounded-3xl border border-border/20 bg-background/20 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">Valora Restaurant</div>
            <DataHealthDot />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Executive KPIs • Multi-location (MVP)</div>
        </div>
      </div>

      <SidebarNav pathname={pathname} groups={groups} />
      <SidebarFooter />
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
      {groups.map((g) => (
        <div key={g.section}>
          <div className={sectionCls()}>{sectionTitle(g.section)}</div>

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
                      active
                        ? "opacity-90 text-foreground"
                        : "opacity-60 group-hover:opacity-80 group-hover:text-foreground",
                    ].join(" ")}
                  />

                  <span className="min-w-0 truncate">{n.label}</span>

                  {/* subtle chevron only on hover */}
                  <span className="ml-auto text-xs text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
                    ›
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-5 rounded-2xl border border-border/20 bg-background/15 p-3">
      {/* <div className="text-xs font-semibold text-foreground">Next</div> */}
      {/* <div className="mt-1 text-xs text-muted-foreground">
        Upload CSV → validate mapping → compute KPIs. Toast connector after MVP.
      </div> */}
      {/* <div className="mt-2">
        <Link href="/restaurant/data" className="text-xs font-semibold text-foreground hover:underline">
          Open Data setup →
        </Link>
      </div> */}
    </div>
  );
}