// // app/page.tsx
// app/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { SectionCard } from "@/components/valora/SectionCard";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background/30 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-5">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{children}</div>
    </div>
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
                Valora AI turns daily business data into clear signals:{" "}
                <span className="text-foreground">what changed</span>,{" "}
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
        <SectionCard
          title="Customer feedback"
          subtitle="Early operator reactions (placeholder copy — we’ll replace with real quotes)."
        >
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

        {/* CONTACT */}
        <SectionCard title="Contact" subtitle="Location + support details.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/30 p-5">
              <div className="text-sm font-semibold text-foreground">Office</div>
              <div className="mt-2 text-sm text-muted-foreground">Boston, MA (remote-first)</div>
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
                <Link
                  href="/signup"
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background/30 px-4 text-sm font-semibold text-foreground hover:bg-muted/40"
                >
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

// // app/page.tsx
// "use client";

// import * as React from "react";
// import Link from "next/link";
// import { SectionCard } from "@/components/valora/SectionCard";

// function Pill({ children }: { children: React.ReactNode }) {
//   return (
//     <span className="inline-flex items-center rounded-full border border-border bg-background/30 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
//       {children}
//     </span>
//   );
// }

// function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div className="rounded-2xl border border-border bg-background/30 p-5">
//       <div className="text-sm font-semibold text-foreground">{title}</div>
//       <div className="mt-2 text-sm text-muted-foreground">{children}</div>
//     </div>
//   );
// }

// export default function HomePage() {
//   return (
//     <div className="mx-auto max-w-[1400px] px-4 py-6">
//       <div className="space-y-6">
//         {/* HERO */}
//         <SectionCard title="Valora AI" subtitle="Executive-grade performance intelligence — dashboards, drivers, and actions.">
//           <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
//             <div>
//               <div className="flex flex-wrap gap-2">
//                 <Pill>Ops Intelligence</Pill>
//                 <Pill>Labor + Inventory</Pill>
//                 <Pill>Multi-location ready</Pill>
//                 <Pill>Executive UI</Pill>
//               </div>

//               <div className="mt-4 text-sm text-muted-foreground">
//                 Valora AI turns daily business data into clear signals:{" "}
//                 <span className="text-foreground">what changed</span>,{" "}
//                 <span className="text-foreground">why it changed</span>,{" "}
//                 <span className="text-foreground">what’s risky</span>, and{" "}
//                 <span className="text-foreground">what action to take next</span> — without drowning you in spreadsheets.
//               </div>
//             </div>
//           </div>
//         </SectionCard>

//         {/* WHAT IS THIS APP */}
//         <SectionCard title="What Valora AI does" subtitle="A practical operating system for daily performance.">
//           <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
//             <GlassCard title="See the truth fast">
//               KPI tiles designed for executive scanning: coverage, ratios, and trend deltas that matter.
//             </GlassCard>
//             <GlassCard title="Explain the “why”">
//               Drivers ranked by impact with severity + rationale — not noisy dashboards.
//             </GlassCard>
//             <GlassCard title="Turn insight into action">
//               “Top 3” actions are operator-ready, with ownership and expected impact.
//             </GlassCard>
//           </div>
//         </SectionCard>

//         {/* FEEDBACK */}
//         <SectionCard title="Customer feedback" subtitle="Early operator reactions (placeholder copy — we’ll replace with real quotes).">
//           <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
//             <GlassCard title="“Finally, it’s clear.”">
//               “The drivers explain what happened without a 30-minute meeting.”
//             </GlassCard>
//             <GlassCard title="“Actionable in minutes.”">
//               “We can decide what to do next right after refresh.”
//             </GlassCard>
//             <GlassCard title="“Premium feel.”">
//               “Looks like an enterprise tool — not another spreadsheet app.”
//             </GlassCard>
//           </div>
//         </SectionCard>

//         {/* CONTACT */}
//         <SectionCard title="Contact" subtitle="Location + support details.">
//           <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//             <div className="rounded-2xl border border-border bg-background/30 p-5">
//               <div className="text-sm font-semibold text-foreground">Office</div>
//               <div className="mt-2 text-sm text-muted-foreground">Boston, MA (remote-first)</div>
//               <div className="mt-3 text-sm text-muted-foreground">
//                 Email: <span className="text-foreground">support@valora.ai</span>
//               </div>
//             </div>

//             <div className="rounded-2xl border border-border bg-background/30 p-5">
//               <div className="text-sm font-semibold text-foreground">Ready to onboard?</div>
//               <div className="mt-2 text-sm text-muted-foreground">
//                 Create an account, pick a plan, then upload your business data to generate your first executive dashboard.
//               </div>
//               <div className="mt-4 flex gap-2">
//                 <Link
//                   href="/signup"
//                   className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
//                 >
//                   Sign up
//                 </Link>
//                 <Link
//                   href="/login"
//                   className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background/30 px-4 text-sm font-semibold text-foreground hover:bg-muted/40"
//                 >
//                   Login
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </SectionCard>

//         <div className="pb-8 text-center text-xs text-muted-foreground">
//           © {new Date().getFullYear()} Valora AI. All rights reserved.
//         </div>
//       </div>
//     </div>
//   );
// }