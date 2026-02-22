// app/restaurant/data/page.tsx
"use client";

import * as React from "react";
import { RestaurantTopBar } from "@/components/restaurant/RestaurantTopBar";
import { SectionCard } from "@/components/valora/SectionCard";
import { Card, CardContent } from "@/components/ui/card";

type UploadResult = {
  ok: boolean;
  file?: string;
  inserted?: number;
  updated?: number;
  total?: number;
  warnings?: string[];
  error?: string;
};

type DataStatus = {
  ok: boolean;
  latest_day: string | null;
  last_ingested_at: string | null;
  rows_24h: string;
  last_source_file: string | null;
};

type LocationOpt = { id: string; name: string; rows: number };

const TEMPLATE_HEADER =
  "location_id,location_name,day,revenue,cogs,labor,fixed_costs,marketing_spend,interest_expense,orders,customers,new_customers,avg_inventory,ar_balance,ap_balance,ebit";

function downloadTemplate() {
  const sample =
    `${TEMPLATE_HEADER}\n` +
    `loc_001,All Locations,2026-02-19,12000,4200,2600,1200,300,50,210,180,12,900,400,250,1800\n`;

  const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "valora_restaurant_daily_template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function RestaurantDataPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [locationIdOverride, setLocationIdOverride] = React.useState<string>("");
  const [replaceDays, setReplaceDays] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<UploadResult | null>(null);

  // For top bar consistency (optional, non-blocking)
  const [status, setStatus] = React.useState<DataStatus | null>(null);
  const [locations, setLocations] = React.useState<LocationOpt[]>([]);
  const [locationId, setLocationId] = React.useState<string>("all");

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const [s, l] = await Promise.all([
          fetch("/api/restaurant/data-status", { cache: "no-store", signal: ac.signal }),
          fetch("/api/restaurant/locations", { cache: "no-store", signal: ac.signal }),
        ]);

        if (s.ok) setStatus((await s.json()) as DataStatus);
        if (l.ok) {
          const j = await l.json();
          setLocations((j?.locations ?? []) as LocationOpt[]);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          // ignore (non-critical for upload UI)
        }
      }
    })();

    return () => ac.abort();
  }, []);

  async function onUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      // Optional controls (safe to send even if API ignores them)
      if (locationIdOverride.trim()) fd.append("location_id", locationIdOverride.trim());
      fd.append("replace_days", replaceDays ? "1" : "0");

      const res = await fetch("/api/restaurant/upload", { method: "POST", body: fd });
      const json = (await res.json()) as UploadResult;

      if (!res.ok) {
        setResult({ ok: false, error: json?.error ?? `Upload failed (HTTP ${res.status})` });
        return;
      }

      setResult(json);

      // Refresh status after upload
      try {
        const s = await fetch("/api/restaurant/data-status", { cache: "no-store" });
        if (s.ok) setStatus((await s.json()) as DataStatus);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "Upload failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <RestaurantTopBar
        title="Restaurant Data"
        subtitle="CSV-first ingestion (MVP). Upload daily-level metrics now; Toast connector comes next."
        locations={locations}
        locationId={locationId}
        onLocationChange={setLocationId}
        status={status}
        showActions={true}
      />

      <SectionCard
        title="CSV upload (MVP)"
        subtitle="Upload a daily fact CSV. We validate + upsert into raw tables."
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2">
            <CardContent className="p-4 space-y-4">
              {/* File */}
              <div>
                <div className="text-sm font-semibold text-foreground">Select file</div>
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:rounded-xl file:border file:border-border
                      file:bg-background/40 file:px-3 file:py-2 file:text-sm file:text-foreground
                      hover:file:bg-muted/30"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Recommended: UTF-8 CSV with header row.
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">Location override (optional)</div>
                  <input
                    value={locationIdOverride}
                    onChange={(e) => setLocationIdOverride(e.target.value)}
                    placeholder="e.g., loc_001"
                    className="mt-2 w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Use this only if your CSV does not include <span className="text-foreground">location_id</span>.
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-foreground">Upsert behavior</div>
                  <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={replaceDays}
                      onChange={(e) => setReplaceDays(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Replace existing rows for same (location_id, day)
                  </label>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Use when re-uploading corrected files.
                  </div>
                </div>
              </div>

              {/* Upload CTA */}
              <button
                type="button"
                disabled={!file || loading}
                onClick={onUpload}
                className={[
                  "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  !file || loading
                    ? "border-border/60 bg-muted/20 text-muted-foreground cursor-not-allowed"
                    : "border-border bg-card text-foreground hover:bg-muted/30",
                ].join(" ")}
              >
                {loading ? "Uploading…" : "Upload CSV"}
              </button>

              <div className="text-xs text-muted-foreground">
                After upload, refresh the Overview page to confirm KPI changes.
              </div>
            </CardContent>
          </Card>

          {/* Right panel */}
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Expected header</div>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
                  {TEMPLATE_HEADER}
                </pre>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="mt-3 w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground hover:bg-muted/30"
                >
                  Download CSV template
                </button>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">Result</div>
                <div className="mt-2 rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground min-h-[96px]">
                  {!result ? (
                    <div>Upload a file to see inserted/updated totals.</div>
                  ) : result.ok ? (
                    <div className="space-y-1">
                      <div>
                        <span className="text-foreground">File:</span> {result.file ?? "—"}
                      </div>
                      <div>
                        <span className="text-foreground">Inserted:</span> {result.inserted ?? 0}
                      </div>
                      <div>
                        <span className="text-foreground">Updated:</span> {result.updated ?? 0}
                      </div>
                      <div>
                        <span className="text-foreground">Total:</span> {result.total ?? 0}
                      </div>

                      {result.warnings?.length ? (
                        <div className="pt-2">
                          <div className="text-foreground">Warnings:</div>
                          <ul className="list-disc pl-4">
                            {result.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-danger">{result.error ?? "Upload failed"}</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                DB check:
                <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
{`select location_id, day, revenue, cogs, labor, fixed_costs, source_file, created_at
from restaurant.raw_restaurant_daily
order by day desc
limit 20;`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionCard>
    </div>
  );
}