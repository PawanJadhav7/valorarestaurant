"use client";

import * as React from "react";

type TenantRow = {
  tenant_id: string;
  tenant_name: string;
  role: string;
};

export default function TenantSwitcher({ userId }: { userId: string }) {
  const [tenants, setTenants] = React.useState<TenantRow[]>([]);
  const [activeTenantId, setActiveTenantId] = React.useState<string>("");

  React.useEffect(() => {
    if (!userId) return;

    const API_BASE =
      process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

    fetch(`${API_BASE}/api/user/tenants?user_id=${userId}`)
      .then((res) => res.json())
      .then((j) => {
        if (!j?.ok) return;
        const rows = (j.tenants ?? []) as TenantRow[];
        setTenants(rows);
        if (rows.length > 0) {
          setActiveTenantId(rows[0].tenant_id);
        }
      })
      .catch((e) => {
        console.error("Failed to load tenants", e);
      });
  }, [userId]);

  async function handleSwitchTenant(tenantId: string) {
    setActiveTenantId(tenantId);

    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

      const r = await fetch(`${API_BASE}/api/user/switch-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          tenant_id: tenantId,
        }),
      });

      const j = await r.json();
      if (!j?.ok) throw new Error(j?.detail || "Failed to switch tenant");

      window.location.reload();
    } catch (e) {
      console.error("Failed to switch tenant", e);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Tenant</label>
      <select
        value={activeTenantId}
        onChange={(e) => handleSwitchTenant(e.target.value)}
        className="h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/40"
      >
        <option value="">Select tenant</option>
        {tenants.map((t) => (
          <option key={t.tenant_id} value={t.tenant_id}>
            {t.tenant_name} ({t.role})
          </option>
        ))}
      </select>
    </div>
  );
}