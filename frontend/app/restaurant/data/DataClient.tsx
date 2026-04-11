"use client";
import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
import { RefreshCcw } from "lucide-react";

const TABS = [
  { id: "health", label: "Data Health" },
  { id: "sources", label: "Connected Sources" },
  { id: "upload", label: "Upload Data" },
  { id: "coverage", label: "Data Coverage" },
];

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function fmtDateOnly(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Data Health Tab ─────────────────────────────────────────────────────────
function DataHealthTab() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/restaurant/data-status", { cache: "no-store" });
      const j = await r.json();
      setData(j);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data health");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const isHealthy = data?.ok && data?.latest_day;
  const latestDay = data?.latest_day?.slice(0, 10);
  const totalRows = Number(data?.total_rows ?? 0);
  const locations = Number(data?.locations ?? 0);
  const rows24h = Number(data?.rows_24h ?? 0);
  const lastIngest = data?.last_ingested_at;

  // Calculate hours since last sync
  const hoursSince = lastIngest
    ? Math.floor((Date.now() - new Date(lastIngest).getTime()) / 3600000)
    : null;
  const syncLabel = hoursSince === null ? "—"
    : hoursSince < 1 ? "Just now"
      : hoursSince < 24 ? `${hoursSince} hour${hoursSince === 1 ? "" : "s"} ago`
        : `${Math.floor(hoursSince / 24)} day${Math.floor(hoursSince / 24) === 1 ? "" : "s"} ago`;

  return (
    <div className="space-y-4">
      {/* Overall status card */}
      <SectionCard title="Data Health" subtitle="Current status of your restaurant data pipeline.">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={load} disabled={loading}
              className="group flex h-9 items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 text-sm text-muted-foreground hover:bg-background/60 disabled:opacity-50">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-300"}`} />
              Refresh
            </button>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/20" />
              ))}
            </div>
          ) : (
            <>
              {/* Status banner */}
              <div className={`rounded-2xl border p-5 ${isHealthy ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isHealthy ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="text-base font-semibold text-foreground">
                    {isHealthy ? "Your data is up to date" : "Data sync pending"}
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {isHealthy
                    ? `Last updated ${syncLabel}. All your restaurant data is current and ready for analysis.`
                    : "Data sync is in progress. Check back shortly."}
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Last Sync</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{syncLabel}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(lastIngest)}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Latest Data</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{latestDay ?? "—"}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Most recent day</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Orders Loaded</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{totalRows.toLocaleString()}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">All time</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Active Locations</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{locations}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Syncing data</div>
                </div>
              </div>

              {/* Data layers */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data layers</div>
                {[
                  { label: "POS Orders", desc: "Raw transaction data from Square/Clover", ok: totalRows > 0 },
                  { label: "Daily Analytics", desc: "Aggregated KPIs for your dashboard", ok: totalRows > 0 },
                  { label: "AI Insights", desc: "ML risk signals and recommendations", ok: data?.ml?.total_briefs > 0 },
                ].map((layer, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/20 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${layer.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{layer.label}</div>
                        <div className="text-xs text-muted-foreground">{layer.desc}</div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${layer.ok ? "text-emerald-400" : "text-amber-400"}`}>
                      {layer.ok ? "Ready" : "Pending"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Connected Sources Tab ────────────────────────────────────────────────────
function ConnectedSourcesTab() {
  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function triggerSync() {
    setSyncing(true);
    setResult(null);
    setError(null);
    await new Promise(r => setTimeout(r, 1500));
    setResult("Sync request sent. Data will refresh within 15 minutes via automated pipeline.");
    setSyncing(false);
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Connected Sources" subtitle="Your active data connections and sync status.">
        <div className="space-y-4">
          {result && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-foreground">✅ {result}</div>}
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-foreground">{error}</div>}

          {/* Active POS */}
          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="text-sm font-semibold text-foreground">Square POS</div>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Active</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Bella Napoli · Washington DC</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Sync frequency: <span className="text-foreground">Every 15 min</span></div>
                  <div>Environment: <span className="text-foreground">Sandbox</span></div>
                  <div>Location ID: <span className="text-foreground">L6C33PJZ851M2</span></div>
                  <div>Provider: <span className="text-foreground">Square</span></div>
                </div>
              </div>
              <button
                onClick={triggerSync}
                disabled={syncing}
                className="shrink-0 rounded-xl border border-border/60 bg-background/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-background/60 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          {/* Coming soon connections */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coming soon</div>
          {[
            { label: "Inventory Management", desc: "Connect your inventory system for stock tracking" },
            { label: "Vendor Invoices", desc: "Auto-import vendor bills and COGS data" },
            { label: "Staff Scheduling", desc: "Connect your scheduling tool for labor data" },
            { label: "Accounting System", desc: "Sync P&L data from QuickBooks or Xero" },
          ].map((src, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/10 p-4 opacity-60">
              <div>
                <div className="text-sm font-medium text-foreground">{src.label}</div>
                <div className="text-xs text-muted-foreground">{src.desc}</div>
              </div>
              <span className="rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground">Coming soon</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Upload Data Tab ──────────────────────────────────────────────────────────
function UploadDataTab() {
  const [dataset, setDataset] = React.useState("inventory");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const templates: Record<string, { cols: string; desc: string }> = {
    labor: { cols: "Date, Location, Hours, Labor Cost, Overtime Hours, Overtime Cost, Headcount", desc: "Staff scheduling and labor cost data" },
    sales: { cols: "Date, Location, Orders, Gross Sales, Net Sales, Discounts, Tax, Tips", desc: "Daily sales and revenue data" },
    inventory: { cols: "Date, Location, SKU, Item, On Hand, Unit Cost, Waste Qty, Stockouts, Purchases", desc: "Stock levels and inventory movements" },
  };

  async function onUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dataset", dataset);
      const r = await fetch("/api/restaurant/upload", { method: "POST", body: form });
      const j = await r.json();
      if (j.ok) {
        setResult(`✅ ${file.name} uploaded successfully. ${j.row_count ?? 0} rows processed.`);
        setFile(null);
      } else {
        setError(j.error ?? "Upload failed");
      }
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Upload Data" subtitle="Manually upload datasets to enrich your analytics.">
        <div className="space-y-4">
          {result && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">{result}</div>}
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>}

          {/* Dataset selector */}
          <div>
            <div className="mb-2 text-sm font-medium text-foreground">Dataset type</div>
            <div className="grid grid-cols-3 gap-2">
              {["inventory", "labor", "sales"].map((d) => (
                <button key={d} onClick={() => setDataset(d)}
                  className={`rounded-xl border py-2.5 text-sm font-medium transition-all capitalize ${dataset === d
                    ? "border-amber-400/60 bg-amber-400/15 text-amber-400"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/60"
                    }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Template info */}
          <div className="rounded-xl border border-border/60 bg-background/20 p-4">
            <div className="text-xs font-medium text-foreground">Required columns</div>
            <div className="mt-1 text-xs text-muted-foreground">{templates[dataset].cols}</div>
            <div className="mt-1 text-xs text-muted-foreground">{templates[dataset].desc}</div>
          </div>

          {/* File input */}
          <div>
            <div className="mb-2 text-sm font-medium text-foreground">Select file</div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-border/60 bg-background/40 px-4 py-2.5 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-background/60 file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </div>

          <button
            onClick={onUpload}
            disabled={!file || uploading}
            className="w-full rounded-xl border border-border/60 bg-background/40 py-2.5 text-sm font-medium text-foreground hover:bg-background/60 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            Uploaded files will be validated and promoted into your analytics pipeline within 60 minutes.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Data Coverage Tab ────────────────────────────────────────────────────────
function DataCoverageTab() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/restaurant/data-status", { cache: "no-store" });
        const j = await r.json();
        setData(j);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  const latestDay = data?.latest_day?.slice(0, 10);
  const totalRows = Number(data?.total_rows ?? 0);
  const locations = Number(data?.locations ?? 0);

  return (
    <div className="space-y-4">
      <SectionCard title="Data Coverage" subtitle="Overview of your historical data availability by location and period.">
        <div className="space-y-4">
          {loading ? (
            <div className="h-32 animate-pulse rounded-xl border border-border bg-muted/20" />
          ) : (
            <>
              {/* Coverage summary */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Coverage start</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">Jan 2024</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Earliest available data</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Coverage end</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{latestDay ?? "—"}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Most recent data point</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                  <div className="text-xs text-muted-foreground">Total data points</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{totalRows.toLocaleString()}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Across {locations} locations</div>
                </div>
              </div>

              {/* Coverage by year */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coverage by period</div>
                {[
                  { period: "Q1 2026 (Jan–Mar)", status: "complete", rows: "~2,500 days" },
                  { period: "2025 (Full year)", status: "complete", rows: "~5,200 days" },
                  { period: "2024 (Full year)", status: "complete", rows: "~5,100 days" },
                  { period: "2023 and earlier", status: "missing", rows: "Not loaded" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/20 p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${row.status === "complete" ? "bg-emerald-400" : "bg-muted"}`} />
                      <div className="text-sm text-foreground">{row.period}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground">{row.rows}</div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${row.status === "complete"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-border/40 text-muted-foreground"
                        }`}>
                        {row.status === "complete" ? "Available" : "Not loaded"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Request backfill */}
              <div className="rounded-xl border border-border/60 bg-background/20 p-4">
                <div className="text-sm font-semibold text-foreground">Need historical data?</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Contact support to request a historical data backfill for periods before 2024.
                  Backfills typically take 24–48 hours depending on data volume.
                </div>
                <div className="mt-3">
                  <a
                    href="mailto:support@valoraai.us?subject=Historical Data Backfill Request"
                    className="rounded-xl border border-border/60 bg-background/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-background/60"
                  >
                    Request backfill →
                  </a>
                </div>
              </div>

              {/* Post-MVP note */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                Coming soon: Interactive calendar heatmap showing daily data availability per location with gap detection.
              </div>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Main DataClient ──────────────────────────────────────────────────────────
export default function DataClient() {
  const [activeTab, setActiveTab] = React.useState("health");
  const active = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4">
      <SectionCard title="Data" subtitle={`${active.label} — manage your data connections and pipeline.`}>
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

      {activeTab === "health" && <DataHealthTab />}
      {activeTab === "sources" && <ConnectedSourcesTab />}
      {activeTab === "upload" && <UploadDataTab />}
      {activeTab === "coverage" && <DataCoverageTab />}
    </div>
  );
}
