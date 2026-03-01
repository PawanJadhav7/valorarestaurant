// components/restaurant/RestaurantSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronDown,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ALWAYS: NavItem[] = [
  { label: "Overview", href: "/restaurant", icon: LayoutDashboard },
  { label: "Sales & Demand", href: "/restaurant/sales", icon: TrendingUp },
  { label: "Ops Dashboard", href: "/restaurant/ops", icon: ClipboardList },
  { label: "Alerts", href: "/restaurant/ops/alerts", icon: Bell },
  { label: "Data", href: "/restaurant/data", icon: Database },
];

const MORE: NavItem[] = [
  { label: "Cost Control", href: "/restaurant/cost-control", icon: Sparkles },
  { label: "Inventory", href: "/restaurant/ops/inventory", icon: Boxes },
  { label: "Staff", href: "/restaurant/ops/labor", icon: Users },
  { label: "AI Insights", href: "/restaurant/insights", icon: Sparkles },
  { label: "Settings", href: "/restaurant/settings", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/restaurant") return pathname === "/restaurant";
  return pathname === href || pathname.startsWith(href + "/");
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

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link href={item.href} className={itemCls(active)}>
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

      <span className="min-w-0 truncate">{item.label}</span>

      <span className="ml-auto text-xs text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100">
        ›
      </span>
    </Link>
  );
}

function GlassAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className={[
          "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200",
          "glass border border-border/10 bg-background/15 backdrop-blur-xl",
          "shadow-[0_4px_20px_rgba(0,0,0,0.05)]",
          "hover:bg-background/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        ].join(" ")}
        aria-expanded={open}
      >
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{title}</span>
          <ChevronDown
            className={[
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open ? "rotate-180" : "rotate-0",
            ].join(" ")}
          />
        </div>
      </button>

      {/* Smooth open/close using CSS grid rows */}
      <div className={["grid transition-all duration-250 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"].join(" ")}>
        <div className="overflow-hidden">
          <div className="mt-2 space-y-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function RestaurantSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMore, setOpenMore] = React.useState(false);
  const [clientName, setClientName] = React.useState<string | null>(null);

  // Auto-open "More" if the active route is inside MORE
  React.useEffect(() => {
    const activeInMore = MORE.some((n) => isActivePath(pathname, n.href));
    if (activeInMore) setOpenMore(true);
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
        const name = j?.user?.client_name ?? j?.user?.full_name ?? null;
        if (alive) setClientName(typeof name === "string" && name.trim() ? name.trim() : null);
      } catch {
        if (alive) setClientName(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="glass rounded-3xl border border-border/20 bg-background/20 p-4 shadow-lg">
      {/* Header */}
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
                Executive KPIs • Multi-location (MVP)
              </>
            ) : (
              "Executive KPIs • Multi-location (MVP)"
            )}
          </div>
        </div>
      </div>

      {/* Always-visible */}
      <div className="mt-4 space-y-2">
        {ALWAYS.map((n) => (
          <NavLink key={n.href} item={n} pathname={pathname} />
        ))}
      </div>

      {/* More accordion */}
      <GlassAccordion title="More" open={openMore} onToggle={() => setOpenMore((v) => !v)}>
        {MORE.map((n) => (
          <NavLink key={n.href} item={n} pathname={pathname} />
        ))}
      </GlassAccordion>

      {/* Footer (short) */}
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
              <div className="truncate text-sm font-semibold text-foreground">{clientName ?? "Valora Restaurant"}</div>
            </div>

            <div className="shrink-0 rounded-xl border border-border/20 bg-background/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              v0.3.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}