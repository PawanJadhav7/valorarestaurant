"use client";

import * as React from "react";

export default function SettingsPage() {
  const [provider, setProvider] = React.useState("clover");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  const tenantId = "41f02224-d01f-48be-b0a4-729f2244bb73";
  const locationId = 101;

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/pos/sync/${provider}/${tenantId}/${locationId}`,
        {
          method: "POST",
        }
      );

      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setResult(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">
          POS Integration
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Connect and trigger POS sync (Clover, Toast, Square).
        </div>
      </div>

      {/* Provider Selection */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">
          Select POS Provider
        </div>

        <div className="mt-3 flex gap-4">
          {["clover", "square", "toast", "csv"].map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={p}
                checked={provider === p}
                onChange={() => setProvider(p)}
              />
              {p.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {/* Sync Button */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <button
          onClick={handleSync}
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-80 disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Run POS Sync"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">
            Sync Result
          </div>
          <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}