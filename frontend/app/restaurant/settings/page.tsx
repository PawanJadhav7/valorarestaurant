"use client";
import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
import BillingSection from "./components/BillingSection";

const TABS = [
  { id: "profile", label: "Profile", subtitle: "" },
  { id: "locations", label: "Locations", subtitle: "Manage your restaurant locations." },
  { id: "subscription", label: "Subscription", subtitle: "Manage your plan and billing details." },
  { id: "pos", label: "POS", subtitle: "Manage your POS connections." },
];

function ProfileTab() {
  const [user, setUser]           = React.useState<any>(null);
  const [locations, setLocations] = React.useState<any[]>([]);
  const [loading, setLoading]     = React.useState(true);
  const [editing, setEditing]     = React.useState(false);
  const [saving, setSaving]       = React.useState(false);
  const [result, setResult]       = React.useState<string | null>(null);
  const [error, setError]         = React.useState<string | null>(null);
  const [form, setForm]           = React.useState({ full_name: "", contact: "" });

  const load = React.useCallback(async () => {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/restaurant/locations", { cache: "no-store" }),
      ]);
      const uJson = await uRes.json();
      const lJson = await lRes.json();
      if (uJson.ok) {
        setUser(uJson.user);
        setForm({ full_name: uJson.user.display_name ?? "", contact: uJson.user.contact ?? "" });
      }
      setLocations(lJson.locations ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSaving(true);
    setResult(null);
    setError(null);
    try {
      const r = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.full_name, contact: form.contact }),
      });
      const j = await r.json();
      if (j.ok) {
        setResult("Profile updated successfully.");
        setEditing(false);
        await load();
      } else {
        setError(j.error ?? "Update failed");
      }
    } catch (e: any) {
      setError(e?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Profile">
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/20" />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

          {/* LEFT */}
          <div className="space-y-3">
            {result && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-foreground">✅ {result}</div>}
            {error  && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-foreground">{error}</div>}

            {/* Avatar */}
            <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/20 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 text-lg font-semibold text-foreground">
                {(user?.display_name ?? user?.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{user?.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{user?.tenant_name ?? "—"}</div>
              </div>
              <button
                onClick={() => { setEditing(!editing); setResult(null); setError(null); }}
                className="ml-auto shrink-0 rounded-xl border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background/60"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>

            {/* Details */}
            <div className="rounded-xl border border-border/60 bg-background/20 p-4 space-y-3">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Full name</label>
                    <input
                      value={form.full_name}
                      onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-amber-400/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Contact</label>
                    <input
                      value={form.contact}
                      onChange={(e) => setForm(f => ({ ...f, contact: e.target.value }))}
                      className="w-full rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-amber-400/40"
                    />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="w-full rounded-xl border border-amber-400/40 bg-amber-400/10 py-2 text-sm font-medium text-amber-400 hover:bg-amber-400/20 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </>
              ) : (
                <>
                  {[
                    { label: "Full name",    value: user?.display_name },
                    { label: "Email",        value: user?.email },
                    { label: "Contact",      value: user?.contact },
                    { label: "Organisation", value: user?.tenant_name },
                    { label: "Onboarding",   value: user?.onboarding_status },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-1 border-b border-border/30 last:border-0">
                      <div className="text-xs text-muted-foreground">{row.label}</div>
                      <div className="text-xs font-medium text-foreground text-right">{row.value ?? "—"}</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="rounded-xl border border-border/40 bg-background/10 p-3 text-xs text-muted-foreground">
              Email and organisation changes: contact support@valoraai.us
            </div>
          </div>

          {/* RIGHT — Account hierarchy */}
          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Account</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <div className="text-sm font-medium text-foreground">{user?.tenant_name ?? "—"}</div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">Tenant</span>
              </div>
              {locations.map((loc: any, i: number) => (
                <div key={i} className="ml-4 flex items-center gap-2 border-l border-border/40 pl-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <div className="text-xs font-medium text-foreground">{loc.business_name ?? loc.location_name}</div>
                  <span className="text-xs text-muted-foreground">{loc.city}{loc.region ? `, ${loc.region}` : ""}</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">Active</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </SectionCard>
  );
}


function LocationsTab() {
  const [locations, setLocations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/restaurant/locations", { cache: "no-store" });
        const j = await r.json();
        setLocations(j.locations ?? []);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <SectionCard title="Locations" subtitle="Your active restaurant locations.">
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/20" />
      ) : (
        <div className="space-y-4">
          {locations.map((loc: any, i: number) => (
            <div key={i} className="space-y-3">
              {/* Location card */}
              <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {loc.business_name ?? loc.location_name}
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                        Active
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <div>Address: <span className="text-foreground">{loc.address_line ?? "—"}</span></div>
                      <div>City: <span className="text-foreground">{loc.city}{loc.region ? `, ${loc.region}` : ""}</span></div>
                      <div>Location ID: <span className="text-foreground">{loc.location_id}</span></div>
                      <div>Currency: <span className="text-foreground">{loc.currency_code ?? "USD"}</span></div>
                      <div>POS: <span className="text-foreground">Square</span></div>
                      <div>Sync: <span className="text-foreground">Every 15 min</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map for this location */}
              {loc.latitude && loc.longitude && (
                <div className="rounded-xl border border-border/60 bg-background/20 overflow-hidden">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/40">
                    {loc.business_name} · {loc.address_line}, {loc.city}, {loc.region}
                  </div>
                  <iframe
                    title={`Map of ${loc.business_name}`}
                    className="w-full h-[400px] border-0"
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}&z=15&output=embed`}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="rounded-xl border border-border/40 bg-background/10 p-3 text-xs text-muted-foreground">
            Adding and managing multiple locations coming soon. Contact support@valoraai.us to add a new location.
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function PosTab() {
  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  async function triggerSync() {
    setSyncing(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 1500));
    setResult("Sync request sent. Data will refresh within 15 minutes.");
    setSyncing(false);
  }

  return (
    <SectionCard title="POS Connections" subtitle="Manage your Point of Sale integrations.">
      <div className="space-y-3">
        {result && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-foreground">
            ✅ {result}
          </div>
        )}

        {/* Active connection */}
        <div className="rounded-xl border border-border/60 bg-background/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Square POS</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Active</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Bella Napoli · Washington DC</div>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <div>Location ID: <span className="text-foreground">L6C33PJZ851M2</span></div>
                <div>Environment: <span className="text-foreground">Sandbox</span></div>
                <div>Sync: <span className="text-foreground">Every 15 min</span></div>
                <div>Status: <span className="text-emerald-400">Connected</span></div>
              </div>
            </div>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="shrink-0 rounded-xl border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background/60 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Add new */}
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">Add connection</div>
        {["Clover POS", "Toast POS", "Lightspeed"].map((pos, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/10 p-4 opacity-60">
            <div className="text-sm text-foreground">{pos}</div>
            <span className="rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground">Coming soon</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState("profile");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4">
      <SectionCard title="Settings" subtitle={active.subtitle || undefined}>
        <div className="grid grid-cols-4 gap-3 pt-1">
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
      </SectionCard>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "locations" && <LocationsTab />}
      {activeTab === "subscription" && <BillingSection />}
      {activeTab === "pos" && <PosTab />}
    </div>
  );
}
