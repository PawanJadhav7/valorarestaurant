const API_BASE =
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getDashboardHome(tenantId: string, day: string) {
  return apiGet(`/api/dashboard/home?tenant_id=${tenantId}&day=${day}`);
}

export async function getDashboardKpis(tenantId: string, day: string) {
  return apiGet(`/api/dashboard/kpis?tenant_id=${tenantId}&day=${day}`);
}

export async function getDashboardRisks(
  tenantId: string,
  day: string,
  limit = 20
) {
  return apiGet(
    `/api/dashboard/risks?tenant_id=${tenantId}&day=${day}&limit=${limit}`
  );
}

export async function getDashboardActions(tenantId: string, day: string) {
  return apiGet(`/api/dashboard/actions?tenant_id=${tenantId}&day=${day}`);
}

export async function getDashboardInsights(tenantId: string, day: string) {
  return apiGet(`/api/dashboard/insights?tenant_id=${tenantId}&day=${day}`);
}

export async function getDashboardForecast(
  tenantId: string,
  metric = "revenue"
) {
  return apiGet(
    `/api/dashboard/forecast?tenant_id=${tenantId}&metric=${metric}`
  );
}

export async function getLocationDetail(
  tenantId: string,
  locationId: number,
  day: string
) {
  return apiGet(
    `/api/location/detail?tenant_id=${tenantId}&location_id=${locationId}&day=${day}`
  );
}

export async function getDashboardOpportunities(
  tenantId: string,
  day: string,
  limit = 20
) {
  return apiGet(
    `/api/dashboard/opportunities?tenant_id=${tenantId}&day=${day}&limit=${limit}`
  );
}

export async function getControlTower(
  tenantId: string,
  day: string,
  limit = 100
) {
  return apiGet(
    `/api/dashboard/control-tower?tenant_id=${tenantId}&day=${day}&limit=${limit}`
  );
}
export async function getDashboardAlerts(
  tenantId: string,
  day: string,
  limit = 20
) {
  return apiGet(
    `/api/dashboard/alerts?tenant_id=${tenantId}&day=${day}&limit=${limit}`
  );
}