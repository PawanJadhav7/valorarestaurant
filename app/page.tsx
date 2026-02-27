// app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionCard } from "@/components/valora/SectionCard";
import { RestaurantTopBar, type LocationOpt as TopBarLocationOpt } from "@/components/restaurant/RestaurantTopBar";

import {
  RestaurantKpiTile,
  type Kpi as RestaurantKpi,
} from "@/components/restaurant/KpiTile";


function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background/30 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function GlassCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-5">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background/30 px-4 text-sm font-semibold text-foreground hover:bg-muted/40"
    >
      {children}
    </Link>
  );
}


export default function HomePage() {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="space-y-6">
        {/* HERO */}
        <SectionCard
          title="Valora AI"
          subtitle="Executive-grade performance intelligence — dashboards, drivers, and actions."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill>Ops Intelligence</Pill>
                <Pill>Labor + Inventory</Pill>
                <Pill>Multi-location ready</Pill>
                <Pill>Executive UI</Pill>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Valora AI turns daily business data into clear signals: <span className="text-foreground">what changed</span>,{" "}
                <span className="text-foreground">why it changed</span>,{" "}
                <span className="text-foreground">what’s risky</span>, and{" "}
                <span className="text-foreground">what action to take next</span> — without drowning you in spreadsheets.
              </div>
            </div>
          </div>
        </SectionCard>

        {/* WHAT IS THIS APP */}
        <SectionCard title="What Valora AI does" subtitle="A practical operating system for daily performance.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <GlassCard title="See the truth fast">
              KPI tiles designed for executive scanning: coverage, ratios, and trend deltas that matter.
            </GlassCard>
            <GlassCard title="Explain the “why”">
              Drivers ranked by impact with severity + rationale — not noisy dashboards.
            </GlassCard>
            <GlassCard title="Turn insight into action">
              “Top 3” actions are operator-ready, with ownership and expected impact.
            </GlassCard>
          </div>
        </SectionCard>

       
        {/* FEEDBACK */}
        <SectionCard title="Customer feedback" subtitle="Early operator reactions (placeholder copy — we’ll replace with real quotes).">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <GlassCard title="“Finally, it’s clear.”">
              “The drivers explain what happened without a 30-minute meeting.”
            </GlassCard>
            <GlassCard title="“Actionable in minutes.”">
              “We can decide what to do next right after refresh.”
            </GlassCard>
            <GlassCard title="“Premium feel.”">
              “Looks like an enterprise tool — not another spreadsheet app.”
            </GlassCard>
          </div>
        </SectionCard>

        {/* PRICING */}
        {/* <SectionCard title="Payment plans" subtitle="Simple pricing that scales with locations.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="text-sm font-semibold text-foreground">Starter</div>
              <div className="mt-1 text-3xl font-semibold text-foreground">$199</div>
              <div className="text-xs text-muted-foreground">/month • 1 location</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Core KPIs + trends</li>
                <li>• Drivers + top actions</li>
                <li>• CSV upload onboarding</li>
              </ul>
              <Link href="/signup" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-background/30 text-sm font-semibold text-foreground hover:bg-muted/40">
                Choose Starter
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Growth</div>
                <Pill>Most popular</Pill>
              </div>
              <div className="mt-1 text-3xl font-semibold text-foreground">$499</div>
              <div className="text-xs text-muted-foreground">/month • up to 5 locations</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Multi-location rollups</li>
                <li>• Alerts + exceptions</li>
                <li>• Priority onboarding</li>
              </ul>
              <Link href="/signup" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-foreground text-sm font-semibold text-background hover:opacity-90">
                Choose Growth
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="text-sm font-semibold text-foreground">Enterprise</div>
              <div className="mt-1 text-3xl font-semibold text-foreground">Custom</div>
              <div className="text-xs text-muted-foreground">Multi-brand • advanced controls</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• SSO + roles</li>
                <li>• Data connectors</li>
                <li>• SLA + support</li>
              </ul>
              <Link href="/contact" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-background/30 text-sm font-semibold text-foreground hover:bg-muted/40">
                Talk to sales
              </Link>
            </div>
          </div>
        </SectionCard> */}

        {/* CONTACT */}
        <SectionCard title="Contact" subtitle="Location + support details.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="text-sm font-semibold text-foreground">Office</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Boston, MA (remote-first)
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Email: <span className="text-foreground">support@valora.ai</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="text-sm font-semibold text-foreground">Ready to onboard?</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Create an account, pick a plan, then upload your business data to generate your first executive dashboard.
              </div>
              <div className="mt-4 flex gap-2">
                <Link href="/signup" className="h-10 flex-1 rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 inline-flex items-center justify-center">
                  Sign up
                </Link>
                <Link href="/login" className="h-10 flex-1 rounded-xl border border-border bg-background/30 px-4 text-sm font-semibold text-foreground hover:bg-muted/40 inline-flex items-center justify-center">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="pb-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Valora AI. All rights reserved.
        </div>
      </div>
      </div>
  );
}