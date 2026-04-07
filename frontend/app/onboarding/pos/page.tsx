"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import GlassCardGlow from "@/components/ui/GlassCardGlow";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import FormField from "@/components/ui/FormField";
import FormMessage from "@/components/ui/FormMessage";
import OnboardingStepHeader from "@/components/onboarding/OnboardingStepHeader";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type POSProvider = {
  key: string;
  name: string;
  description: string;
  available: boolean;
  logo: string;
};

type POSLocation = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  selected: boolean;
};

type Step = "select_provider" | "enter_credentials" | "select_locations" | "connected";

// ─────────────────────────────────────────────
// POS PROVIDERS
// ─────────────────────────────────────────────

const POS_PROVIDERS: POSProvider[] = [
  {
    key: "square",
    name: "Square",
    description: "Connect via Square API key. Syncs orders, payments, and items in real-time.",
    available: true,
    logo: "□",
  },
  {
    key: "clover",
    name: "Clover",
    description: "Connect via Clover API key. Imports orders, line items, and payments.",
    available: true,
    logo: "◇",
  },
  {
    key: "toast",
    name: "Toast",
    description: "Toast integration is currently pending API approval.",
    available: false,
    logo: "◈",
  },
  {
    key: "lightspeed",
    name: "Lightspeed",
    description: "Coming soon — Lightspeed Restaurant connector.",
    available: false,
    logo: "◉",
  },
  {
    key: "revel",
    name: "Revel Systems",
    description: "Coming soon — Revel iPad POS connector.",
    available: false,
    logo: "◎",
  },
  {
    key: "csv",
    name: "CSV Upload",
    description: "No POS? Upload a CSV file with your historical sales data.",
    available: true,
    logo: "↑",
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON (${res.status}). BodyPreview=${text.slice(0, 160)}`);
  }
}

function ValuePill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
      {children}
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/30 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{text}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 1 — SELECT PROVIDER
// ─────────────────────────────────────────────

function StepSelectProvider({
  selected,
  onSelect,
  search,
  onSearchChange,
}: {
  selected: string | null;
  onSelect: (key: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const filtered = POS_PROVIDERS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          ⌕
        </div>
        <input
          type="text"
          placeholder="Search POS providers..."
          title="Search POS providers"
          aria-label="Search POS providers"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-background/30 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Provider grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((p) => {
          const isSelected = selected === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={!p.available}
              onClick={() => p.available && onSelect(p.key)}
              className={[
                "relative rounded-2xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(34,197,94,0.20)]"
                  : p.available
                  ? "border-border/60 bg-background/30 hover:border-border hover:bg-background/40"
                  : "cursor-not-allowed border-border/30 bg-background/10 opacity-50",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {/* Logo placeholder */}
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-lg font-bold",
                    isSelected
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                      : "border-border/60 bg-background/40 text-foreground/60",
                  ].join(" ")}
                >
                  {p.logo}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    {!p.available && (
                      <span className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Soon
                      </span>
                    )}
                    {isSelected && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs leading-5 text-muted-foreground line-clamp-2">
                    {p.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 2 — ENTER CREDENTIALS
// ─────────────────────────────────────────────

function StepEnterCredentials({
  provider,
  apiKey,
  onApiKeyChange,
  merchantId,
  onMerchantIdChange,
}: {
  provider: POSProvider;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  merchantId: string;
  onMerchantIdChange: (v: string) => void;
}) {
  const needsMerchantId = provider.key === "clover";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/50 bg-background/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/40 text-lg font-bold text-foreground/60">
            {provider.logo}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{provider.name}</div>
            <div className="text-xs text-muted-foreground">Enter your API credentials below</div>
          </div>
        </div>
      </div>

      <FormField
        label={`${provider.name} API Key`}
        htmlFor="apiKey"
        required
      >
        <Input
          id="apiKey"
          type="password"
          placeholder={
            provider.key === "square"
              ? "EAAAl..."
              : provider.key === "clover"
              ? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              : "Enter API key"
          }
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          required
        />
      </FormField>

      {needsMerchantId && (
        <FormField label="Merchant ID" htmlFor="merchantId" required>
          <Input
            id="merchantId"
            placeholder="e.g. WZ33QNPQRDX41"
            value={merchantId}
            onChange={(e) => onMerchantIdChange(e.target.value)}
            required
          />
        </FormField>
      )}

      {/* Where to find credentials */}
      <div className="rounded-2xl border border-border/50 bg-background/20 p-4 space-y-2">
        <div className="text-xs font-semibold text-foreground">Where to find your credentials</div>
        {provider.key === "square" && (
          <div className="text-xs text-muted-foreground leading-5">
            Go to{" "}
            <span className="font-medium text-foreground">developer.squareup.com</span>
            {" → "} Your Application {" → "} Credentials {" → "} Sandbox/Production Access Token
          </div>
        )}
        {provider.key === "clover" && (
          <div className="text-xs text-muted-foreground leading-5">
            Go to{" "}
            <span className="font-medium text-foreground">sandbox.dev.clover.com</span>
            {" → "} Your Merchant Dashboard {" → "} Account & Settings {" → "} API Tokens.
            Merchant ID is shown in your dashboard URL.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 3 — SELECT LOCATIONS
// ─────────────────────────────────────────────

function StepSelectLocations({
  provider,
  locations,
  onToggle,
  onSelectAll,
}: {
  provider: POSProvider;
  locations: POSLocation[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}) {
  const allSelected = locations.every((l) => l.selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {locations.length} location{locations.length !== 1 ? "s" : ""} found
          </div>
          <div className="text-xs text-muted-foreground">
            Select which locations to connect to Valora
          </div>
        </div>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs font-medium text-foreground/60 hover:text-foreground transition"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="space-y-2">
        {locations.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => onToggle(loc.id)}
            className={[
              "w-full rounded-2xl border p-4 text-left transition-all duration-200",
              loc.selected
                ? "border-emerald-400/60 bg-emerald-500/10"
                : "border-border/60 bg-background/30 hover:bg-background/40",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <div
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition",
                  loc.selected
                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
                    : "border-border/60 bg-background/40 text-transparent",
                ].join(" ")}
              >
                ✓
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{loc.name}</div>
                {(loc.city || loc.state) && (
                  <div className="text-xs text-muted-foreground">
                    {[loc.city, loc.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/20 p-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {locations.filter((l) => l.selected).length} location
            {locations.filter((l) => l.selected).length !== 1 ? "s" : ""}
          </span>{" "}
          selected · Billing is based on active locations.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 4 — CONNECTED
// ─────────────────────────────────────────────

function StepConnected({
  provider,
  locations,
}: {
  provider: POSProvider;
  locations: POSLocation[];
}) {
  const selected = locations.filter((l) => l.selected);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15 text-2xl text-emerald-300">
          ✓
        </div>
        <div>
          <div className="text-lg font-semibold text-foreground">
            {provider.name} connected!
          </div>
          <div className="text-sm text-muted-foreground">
            {selected.length} location{selected.length !== 1 ? "s" : ""} activated
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {selected.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-3"
          >
            <span className="text-emerald-400 text-sm">✓</span>
            <div>
              <div className="text-sm font-medium text-foreground">{loc.name}</div>
              {(loc.city || loc.state) && (
                <div className="text-xs text-muted-foreground">
                  {[loc.city, loc.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/20 p-4">
        <div className="text-xs text-muted-foreground leading-5">
          Your POS is now syncing. Historical data will appear in your dashboard shortly.
          Real-time orders will sync automatically every 15 minutes.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function POSPage() {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("select_provider");
  const [search, setSearch] = React.useState("");
  const [selectedProviderKey, setSelectedProviderKey] = React.useState<string | null>(null);
  const [apiKey, setApiKey] = React.useState("");
  const [merchantId, setMerchantId] = React.useState("");
  const [locations, setLocations] = React.useState<POSLocation[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // CSV state
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const selectedProvider = POS_PROVIDERS.find((p) => p.key === selectedProviderKey) ?? null;

  // ── Fetch locations from backend ──────────────

  async function fetchLocations() {
    if (!selectedProviderKey || !apiKey) return;
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/onboarding/pos/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProviderKey,
          api_key: apiKey,
          merchant_id: merchantId || undefined,
        }),
      });

      const j = await safeJson(res);

      if (!j.ok) throw new Error(j.error ?? "Failed to fetch locations");

      const locs: POSLocation[] = (j.locations ?? []).map((l: any) => ({
        id: l.id ?? l.external_location_id,
        name: l.name ?? l.location_name,
        address: l.address,
        city: l.city,
        state: l.state,
        selected: true, // default all selected
      }));

      if (locs.length === 0) throw new Error("No locations found for this account");

      setLocations(locs);
      setStep("select_locations");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to fetch locations");
    } finally {
      setBusy(false);
    }
  }

  // ── Save connection ───────────────────────────

  async function saveConnection() {
    const selectedLocs = locations.filter((l) => l.selected);
    if (selectedLocs.length === 0) {
      setErr("Please select at least one location.");
      return;
    }

    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/onboarding/pos/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProviderKey,
          api_key: apiKey,
          merchant_id: merchantId || undefined,
          location_ids: selectedLocs.map((l) => l.id),
        }),
      });

      const j = await safeJson(res);
      if (!j.ok) throw new Error(j.error ?? "Failed to save connection");

      setStep("connected");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to save connection");
    } finally {
      setBusy(false);
    }
  }

  // ── CSV upload ────────────────────────────────

  async function uploadCsv() {
    if (!file) {
      setErr("Please upload a CSV file.");
      return;
    }
    setBusy(true);
    setErr(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", "csv");
      formData.append("mode", "manual");

      const res = await fetch("/api/onboarding/pos", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Upload failed (${res.status})`);
      }

      if (!res.ok || !data.ok) {
        throw new Error(data?.error ?? data?.detail ?? `Upload failed (${res.status})`);
      }

      router.push(data.redirect || "/restaurant");
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // ── Location toggle ───────────────────────────

  function toggleLocation(id: string) {
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l))
    );
  }

  function toggleSelectAll() {
    const allSelected = locations.every((l) => l.selected);
    setLocations((prev) => prev.map((l) => ({ ...l, selected: !allSelected })));
  }

  // ── Step titles ───────────────────────────────

  const stepTitle = {
    select_provider: "Connect your POS",
    enter_credentials: `Connect ${selectedProvider?.name ?? "POS"}`,
    select_locations: "Select your locations",
    connected: "You're all set!",
  }[step];

  const stepSubtitle = {
    select_provider: "Choose your POS provider to start syncing real-time order data.",
    enter_credentials: "Enter your API credentials to allow Valora to fetch your data.",
    select_locations: "Choose which locations to connect. Billing is per active location.",
    connected: "Your POS is connected and syncing. Head to your dashboard to explore.",
  }[step];

  // ── Right panel info ──────────────────────────

  const rightPanelContent = {
    select_provider: {
      pills: ["Real-time sync", "Secure connection", "Multi-POS support"],
      title: "Why connect your POS?",
      body: "Valora pulls your order data directly from your POS so you get live KPIs, trend analysis, and performance alerts without any manual exports.",
      cards: [
        { title: "Real-time order sync", text: "Orders sync automatically every 15 minutes from your POS." },
        { title: "Secure API connection", text: "Your credentials are encrypted and never stored in plain text." },
        { title: "Multiple providers", text: "Connect Square, Clover, and more as your business grows." },
      ],
    },
    enter_credentials: {
      pills: ["Encrypted storage", "Read-only access", "Sandbox safe"],
      title: "Your data is secure",
      body: "Valora uses read-only API access to fetch your order data. We never modify your POS data or store credentials in plain text.",
      cards: [
        { title: "Read-only access", text: "We only read order and location data. Nothing is ever written back to your POS." },
        { title: "Encrypted credentials", text: "API keys are encrypted at rest using industry-standard encryption." },
        { title: "Sandbox compatible", text: "Works with both sandbox and production credentials for safe testing." },
      ],
    },
    select_locations: {
      pills: ["Per-location billing", "Easy to add more", "Instant activation"],
      title: "Location-based billing",
      body: "Your Valora plan is priced per active location. Select only the locations you want to track — you can always add more later from your dashboard.",
      cards: [
        { title: "Starter: 1 location included", text: "Your base plan covers one location. Additional locations are $29/month each." },
        { title: "Growth: 5 locations included", text: "Growth plan covers 5 locations. Additional locations are $25/month each." },
        { title: "Add locations anytime", text: "Head to Settings > Locations in your dashboard to connect more locations." },
      ],
    },
    connected: {
      pills: ["Sync active", "Dashboard ready", "Data flowing"],
      title: "What happens next",
      body: "Your POS connection is live. Here's what to expect over the next few minutes.",
      cards: [
        { title: "Historical sync", text: "We'll import your recent order history so your dashboard has data immediately." },
        { title: "Real-time updates", text: "New orders will sync every 15 minutes automatically." },
        { title: "Dashboard unlocked", text: "Head to your restaurant dashboard to explore your KPIs and analytics." },
      ],
    },
  }[step];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <OnboardingStepHeader
        currentStep="pos"
        title={stepTitle}
        subtitle={stepSubtitle}
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Left panel ─────────────────────── */}
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[11px] font-semibold tracking-wide text-foreground/80 shadow-sm">
            POS integration
          </div>

          <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {stepTitle}
          </div>

          <div className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {stepSubtitle}
          </div>

          {err && (
            <FormMessage className="mt-5" type="error">
              {err}
            </FormMessage>
          )}

          <div className="mt-6">
            {/* STEP 1: Select provider */}
            {step === "select_provider" && (
              <>
                <StepSelectProvider
                  selected={selectedProviderKey}
                  onSelect={(key) => {
                    setSelectedProviderKey(key);
                    setErr(null);
                  }}
                  search={search}
                  onSearchChange={setSearch}
                />

                {/* CSV upload area */}
                {selectedProviderKey === "csv" && (
                  <div className="mt-5 space-y-4">
                    <div
                      className={[
                        "flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed text-center transition",
                        "border-border/60 bg-background/20 backdrop-blur-xl",
                        dragActive ? "border-foreground/40 bg-background/30" : "",
                      ].join(" ")}
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f?.name.endsWith(".csv")) { setFile(f); setErr(null); }
                        else setErr("Only CSV files supported.");
                      }}
                    >
                      <div className="text-sm font-medium text-foreground">Drag & drop CSV file</div>
                      <div className="mt-1 text-xs text-muted-foreground">or choose manually</div>
                      <input
                        type="file"
                        accept=".csv"
                        className="mt-3 text-xs text-muted-foreground file:mr-2 file:rounded-xl file:border file:border-border/60 file:bg-background/40 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { setFile(f); setErr(null); }
                        }}
                      />
                      {file && (
                        <div className="mt-3 rounded-xl border border-border/60 bg-background/30 px-3 py-1.5 text-xs text-foreground">
                          {file.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  {selectedProviderKey === "csv" ? (
                    <Button
                      variant="primary"
                      className="h-12 w-full"
                      disabled={!file || busy}
                      loading={busy}
                      onClick={uploadCsv}
                    >
                      {busy ? "Uploading..." : "Upload & continue →"}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="h-12 w-full"
                      disabled={!selectedProviderKey || busy}
                      onClick={() => {
                        if (selectedProviderKey) {
                          setErr(null);
                          setStep("enter_credentials");
                        }
                      }}
                    >
                      Continue with {selectedProvider?.name ?? "selected POS"} →
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* STEP 2: Enter credentials */}
            {step === "enter_credentials" && selectedProvider && (
              <>
                <StepEnterCredentials
                  provider={selectedProvider}
                  apiKey={apiKey}
                  onApiKeyChange={setApiKey}
                  merchantId={merchantId}
                  onMerchantIdChange={setMerchantId}
                />

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => { setStep("select_provider"); setErr(null); }}
                    disabled={busy}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="h-12 flex-1"
                    disabled={!apiKey || busy}
                    loading={busy}
                    onClick={fetchLocations}
                  >
                    {busy ? "Fetching locations..." : "Fetch locations →"}
                  </Button>
                </div>
              </>
            )}

            {/* STEP 3: Select locations */}
            {step === "select_locations" && selectedProvider && (
              <>
                <StepSelectLocations
                  provider={selectedProvider}
                  locations={locations}
                  onToggle={toggleLocation}
                  onSelectAll={toggleSelectAll}
                />

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => { setStep("enter_credentials"); setErr(null); }}
                    disabled={busy}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="h-12 flex-1"
                    disabled={locations.filter((l) => l.selected).length === 0 || busy}
                    loading={busy}
                    onClick={saveConnection}
                  >
                    {busy
                      ? "Connecting..."
                      : `Connect ${locations.filter((l) => l.selected).length} location${locations.filter((l) => l.selected).length !== 1 ? "s" : ""} →`}
                  </Button>
                </div>
              </>
            )}

            {/* STEP 4: Connected */}
            {step === "connected" && selectedProvider && (
              <>
                <StepConnected
                  provider={selectedProvider}
                  locations={locations}
                />

                <div className="mt-6">
                  <Button
                    variant="primary"
                    className="h-12 w-full"
                    onClick={() => router.push("/onboarding/success")}
                  >
                    Review your setup →
                  </Button>
                </div>
              </>
            )}
          </div>
        </GlassCardGlow>

        {/* ── Right panel ────────────────────── */}
        <GlassCardGlow className="h-full p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            {rightPanelContent.pills.map((p) => (
              <ValuePill key={p}>{p}</ValuePill>
            ))}
          </div>

          <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            {rightPanelContent.title}
          </div>

          <div className="mt-3 text-sm leading-7 text-muted-foreground">
            {rightPanelContent.body}
          </div>

          <div className="mt-6 space-y-3">
            {rightPanelContent.cards.map((c) => (
              <InfoCard key={c.title} title={c.title} text={c.text} />
            ))}
          </div>
        </GlassCardGlow>
      </div>
    </div>
  );
}
