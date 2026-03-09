// app/restaurant/data/DataClient.tsx
"use client";

import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";

type UploadRow = {
  upload_id: string;
  created_at: string;
  filename: string;
  size_bytes: number;
  row_count: number;
  columns: string[] | any;
  location_id: string | null;
  dataset: "labor" | "sales" | "inventory" | string;
};

type UploadListResp =
  | { ok: true; uploads: UploadRow[] }
  | { ok: false; uploads: UploadRow[]; error?: string };

type UploadPostResp =
  | {
      ok: true;
      upload_id: string;
      created_at: string;
      filename: string;
      size_bytes: number;
      row_count: number;
      columns: string[];
      location_id: string | null;
      dataset: string;
    }
  | { ok: false; error?: string };

function fmtBytes(n: number) {
  if (!Number.isFinite(n)) return "—";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function safeJsonParse<T>(text: string, status: number): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Non-JSON (${status}). BodyPreview=${text.slice(0, 180)}`);
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-xl border border-border/20 bg-background/20 px-2 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export default function DataClient() {
  const [dataset, setDataset] = React.useState<"labor" | "sales" | "inventory">("labor");
  const [file, setFile] = React.useState<File | null>(null);

  const [uploads, setUploads] = React.useState<UploadRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [uploading, setUploading] = React.useState<boolean>(false);

  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadUploads = React.useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/restaurant/upload", { cache: "no-store" });
      const text = await res.text();
      const json = safeJsonParse<UploadListResp>(text, res.status);

      if (!json.ok) {
        throw new Error(json.error ?? "Failed to load uploads");
      }
      setUploads(json.uploads ?? []);
    } catch (e: any) {
      setUploads([]);
      setMsg({ kind: "err", text: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  async function onUpload() {
    setMsg(null);

    if (!file) {
      setMsg({ kind: "err", text: "Choose a CSV file first." });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("dataset", dataset);
      fd.set("file", file);

      const res = await fetch("/api/restaurant/upload", {
        method: "POST",
        body: fd,
      });

      const text = await res.text();
      const json = safeJsonParse<UploadPostResp>(text, res.status);

      if (!json.ok) {
        throw new Error(json.error ?? "Upload failed");
      }

      setMsg({ kind: "ok", text: `Uploaded: ${json.filename} (${json.row_count} rows)` });
      setFile(null);

      // reset native input value (so same file can be re-selected)
      const el = document.getElementById("csv_file_input") as HTMLInputElement | null;
      if (el) el.value = "";

      await loadUploads();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? String(e) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-6">
      <SectionCard
        title="Data"
        subtitle="Upload datasets (sales, labor, inventory). Next we’ll map columns → promote into facts."
        right={
          <button
            className="h-9 rounded-xl border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-60"
            onClick={loadUploads}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      >
        {/* Upload box */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/20 bg-background/15 p-4">
            <div className="text-sm font-semibold text-foreground">Upload CSV</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Choose a dataset type so we know how to map it later.
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="w-20 text-xs text-muted-foreground">Dataset</label>
                <select
                  className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value as any)}
                >
                  <option value="labor">Labor</option>
                  <option value="sales">Sales</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>

              <div className="flex items-start gap-2">
                <label className="mt-2 w-20 text-xs text-muted-foreground">File</label>
                <div className="flex-1">
                  <input
                    id="csv_file_input"
                    type="file"
                    accept=".csv,text/csv"
                    className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:bg-muted/40"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {file ? (
                      <>
                        Selected: <span className="text-foreground">{file.name}</span> •{" "}
                        <span className="text-muted-foreground">{fmtBytes(file.size)}</span>
                      </>
                    ) : (
                      "No file selected."
                    )}
                  </div>
                </div>
              </div>

              <button
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                onClick={onUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>

              {msg ? (
                <div
                  className={[
                    "rounded-xl border p-3 text-sm",
                    msg.kind === "ok"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                      : "border-rose-500/30 bg-rose-500/10 text-foreground",
                  ].join(" ")}
                >
                  <div className="text-xs text-muted-foreground">{msg.kind === "ok" ? "Success" : "Error"}</div>
                  <div className="mt-1">{msg.text}</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Templates / Next steps */}
          <div className="rounded-2xl border border-border/20 bg-background/15 p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-foreground">What happens next</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Mapping → Validation → Promote into analytics facts (Drivers Layer).
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip>Step 1: Upload</Chip>
                <Chip>Step 2: Map columns</Chip>
                <Chip>Step 3: Promote</Chip>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/20 bg-background/20 p-3">
                <div className="text-xs font-semibold text-foreground">Labor template</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Date, Location, Hours, Labor Cost, Overtime Hours, Overtime Cost, Headcount
                </div>
              </div>
              <div className="rounded-xl border border-border/20 bg-background/20 p-3">
                <div className="text-xs font-semibold text-foreground">Sales template</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Date, Location, Orders, Gross Sales, Net Sales, Discounts, Tax, Tips
                </div>
              </div>
              <div className="rounded-xl border border-border/20 bg-background/20 p-3">
                <div className="text-xs font-semibold text-foreground">Inventory template</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Date, Location, SKU, Item, On Hand, Unit Cost, Waste Qty, Stockouts, Purchases
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              After upload is stable, we’ll add a **Map Columns** panel and then a **Promote → facts** button.
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent uploads" subtitle="Last 25 uploads stored in staging.">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30" />
            ))}
          </div>
        ) : uploads.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {uploads.map((u) => (
              <div key={u.upload_id} className="rounded-2xl border border-border bg-background/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{u.filename}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {u.dataset} • {u.row_count} rows • {fmtBytes(u.size_bytes)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-xl border border-border/20 bg-background/20 px-2 py-1 text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(Array.isArray(u.columns) ? u.columns : []).slice(0, 6).map((c: any) => (
                    <Chip key={String(c)}>{String(c)}</Chip>
                  ))}
                  {Array.isArray(u.columns) && u.columns.length > 6 ? <Chip>+{u.columns.length - 6} more</Chip> : null}
                </div>

                <div className="mt-3 text-[11px] text-muted-foreground">
                  Upload ID: <span className="text-foreground">{u.upload_id}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm text-muted-foreground">
            No uploads yet. Upload your first CSV above.
          </div>
        )}
      </SectionCard>
    </div>
  );
}