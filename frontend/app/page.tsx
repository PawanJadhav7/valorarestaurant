// frontend/app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { SectionCard } from "@/components/valora/SectionCard";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
        active
          ? "border border-white/20 bg-white/10 text-foreground shadow-md backdrop-blur"
          : "border border-transparent bg-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function HomePage() {
  const [tab, setTab] = React.useState<"platform" | "contact" | "faq">("platform");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="space-y-6">
        <SectionCard title={null} subtitle={null}>
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 px-6 py-8 shadow-2xl backdrop-blur-2xl md:px-10 md:py-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
            </div>

            <div className="relative">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center rounded-full border border-border bg-muted/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-foreground/80 shadow-sm">
                  Operational intelligence for restaurant operators
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="max-w-2xl">
                  <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl xl:text-6xl">
                    Turn restaurant business data into
                    <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                      {" "}
                      smarter operating decisions
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                    Valora AI helps operators monitor sales, labor, inventory, and margin in one
                    decision-ready workspace — with clear alerts, key drivers, and next actions.
                  </p>

                  <div className="mt-8 flex flex-col items-start gap-8">
                    <Link
                      href="/signup"
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:scale-[1.02] hover:shadow-indigo-500/30"
                    >
                      Start your workspace
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl">
                    <div className="rounded-[24px] border border-white/10 bg-background/40 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Today’s operating health</div>
                        </div>

                        <div className="inline-flex items-center gap-2 rounded-full border border-green-700/30 bg-green-700/15 px-3 py-1 text-xs font-semibold text-green-900 dark:text-green-300">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-700" />
                          </span>
                          Live
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                          <div className="text-[11px] text-muted-foreground">Net Sales</div>
                          <div className="mt-2 text-xl font-semibold text-foreground">$18.4K</div>
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-400">
                            <span className="text-purple-800 dark:text-purple-400">▲</span>
                            +6.2% vs prior
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                          <div className="text-[11px] text-muted-foreground">Prime Cost</div>
                          <div className="mt-2 text-xl font-semibold text-foreground">58.4%</div>
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-violet-900 dark:text-violet-400">
                            <span className="text-violet-800 dark:text-violet-400">▲</span>
                            watch labor drift
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                          <div className="text-[11px] text-muted-foreground">Inventory Risk</div>
                          <div className="mt-2 text-xl font-semibold text-foreground">Low</div>
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-green-950 dark:text-green-400">
                            <span className="text-green-900 dark:text-green-400">▲</span>
                            1 slow-moving category
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                          <div className="text-[11px] text-muted-foreground">Next Best Action</div>
                          <div className="mt-2 text-sm font-medium leading-6 text-foreground">
                            Trim next purchase cycle and review weekend labor mix.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex w-full flex-col gap-4 border-t border-border/60 pt-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-3 text-xs font-medium">
                    <span className="rounded-full border border-border bg-muted/60 px-4 py-1.5 text-foreground/80 shadow-sm">
                      Detect profit leaks early
                    </span>

                    <span className="rounded-full border border-border bg-muted/60 px-4 py-1.5 text-foreground/80 shadow-sm">
                      Control labor costs
                    </span>

                    <span className="rounded-full border border-border bg-muted/60 px-4 py-1.5 text-foreground/80 shadow-sm">
                      Monitor inventory risk
                    </span>

                    <span className="rounded-full border border-border bg-muted/60 px-4 py-1.5 text-foreground/80 shadow-sm">
                      Run multi-location operations with clarity
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <TabButton active={tab === "platform"} onClick={() => setTab("platform")}>
                      Platform
                    </TabButton>

                    <TabButton active={tab === "contact"} onClick={() => setTab("contact")}>
                      Contact
                    </TabButton>

                    <TabButton active={tab === "faq"} onClick={() => setTab("faq")}>
                      FAQ
                    </TabButton>
                  </div>
                </div>

                <div id="tab-content" className="pt-2">
                  {tab === "platform" ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl">
                        <div className="rounded-[24px] border border-white/10 bg-background/40 p-5">
                          <div className="text-sm font-semibold text-foreground">What Valora AI does</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            Valora helps restaurant operators understand performance, detect risk earlier,
                            and act on the few decisions that actually move margin.
                          </div>

                          <div className="mt-5 space-y-3">
                            <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                              <div className="text-sm font-semibold text-foreground">See performance clearly</div>
                              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                Bring sales, labor, inventory, and margin into one clean operating view.
                              </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                              <div className="text-sm font-semibold text-foreground">Understand what changed</div>
                              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                Surface the drivers behind movement so operators know what is helping and what is drifting.
                              </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/40 p-4 shadow-sm">
                              <div className="text-sm font-semibold text-foreground">Act with clarity</div>
                              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                Turn daily performance signals into practical next actions for the team.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-2xl">
                        <div className="rounded-[24px] border border-white/10 bg-background/40 p-5">
                          <div className="text-sm font-semibold text-foreground">Product walkthrough</div>
                          <div className="mt-2 text-sm leading-6 text-muted-foreground">
                            A short product demo or explainer video can live here to show how the platform works.
                          </div>

                          <div className="mt-5 flex min-h-[280px] items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 shadow-sm">
                            <div className="text-center">
                              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background/60 text-lg text-foreground shadow-sm">
                                ▶
                              </div>
                              <div className="mt-4 text-sm font-semibold text-foreground">Demo video area</div>
                              <div className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                                Add a short walkthrough here to show operators how Valora turns business data into action.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "contact" ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</div>
                        <div className="mt-2 text-sm font-medium text-foreground">support@valora.ai</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          General product and onboarding support
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">LinkedIn</div>
                        <div className="mt-2 text-sm font-medium text-foreground">Valora AI</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Company updates and product visibility
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">X / Twitter</div>
                        <div className="mt-2 text-sm font-medium text-foreground">@ValoraAI</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Announcements, launch updates, and insights
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</div>
                        <div className="mt-2 text-sm font-medium text-foreground">+1 (000) 000-0000</div>
                        <div className="mt-1 text-sm text-muted-foreground">Boston, MA · remote-first</div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "faq" ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-sm font-semibold text-foreground">
                          What does Valora AI help me monitor?
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Valora is designed to help restaurant operators monitor sales, margin, labor,
                          inventory, and operational risk in one decision-ready view.
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-sm font-semibold text-foreground">
                          Is it built for one location or many?
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          It is designed to support both individual restaurant operators and growing
                          multi-location teams.
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-sm font-semibold text-foreground">How do I get started?</div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Create your workspace, choose a plan, and connect or upload business data to
                          generate your first operating view.
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/40 p-5 shadow-sm">
                        <div className="text-sm font-semibold text-foreground">
                          What makes it different from another dashboard?
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Valora focuses on signals, drivers, and actions — not just charts. The goal is
                          faster, clearer operating decisions.
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </SectionCard>

        <div className="pb-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Valora AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}