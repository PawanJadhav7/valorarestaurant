"use client";
import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
import BillingSection from "./components/BillingSection";

const TABS = [
  { id: "profile", label: "Profile", subtitle: "Your account and personal details." },
  { id: "subscription", label: "Subscription", subtitle: "Manage your plan, billing, and renewal details." },
  { id: "pos", label: "POS & Data", subtitle: "Manage your POS connections and data sync settings." },
  { id: "locations", label: "Locations", subtitle: "Manage your restaurant locations and addresses." },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState("profile");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4">

      {/* Header with tabs inside */}
      <SectionCard
        title="Settings"
        subtitle=""
      >
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border py-2.5 text-sm font-medium transition-all ${activeTab === tab.id
                  ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">{active.subtitle}</div>
        </div>
      </SectionCard>
      {/* Tab content */}
      {activeTab === "subscription" && <BillingSection />}

      {activeTab === "profile" && (
        <SectionCard title="Profile" subtitle="Your account and personal details.">
          <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
            Profile management coming soon. Contact support to update your name or email.
          </div>
        </SectionCard>
      )}

      {activeTab === "pos" && (
        <SectionCard title="POS & Data" subtitle="Connected POS systems and sync status.">
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <div className="text-sm font-semibold text-foreground">Square — Sandbox</div>
              <div className="mt-1 text-xs text-muted-foreground">Bella Napoli · Washington DC · L6C33PJZ851M2</div>
              <div className="mt-2 text-xs text-emerald-400">● Active · Last synced: today</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
              Add or manage additional POS connections coming soon.
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === "locations" && (
        <SectionCard title="Locations" subtitle="Your active restaurant locations.">
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-background/20 p-4">
              <div className="text-sm font-semibold text-foreground">Bella Napoli</div>
              <div className="mt-1 text-xs text-muted-foreground">1600 Pennsylvania Ave NW · Washington, DC 20500</div>
              <div className="mt-2 text-xs text-emerald-400">● Active</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-sm text-muted-foreground">
              Add new locations coming soon.
            </div>
          </div>
        </SectionCard>
      )}

    </div>
  );
}
