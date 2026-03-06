# Valora AI — End-to-End System Blueprint (Production)

This document describes the production-grade flow from **Login → Onboarding → Tenant Setup → Data Ingestion → KPI Computation → APIs → UI**.

---

## 1) High-level Flow (Auth → Tenant → Data → KPIs → UI)

```text
[Browser / Web App (Next.js)]
   |
   | (session cookie)
   v
[Auth Layer]
- auth.app_user           (identity + onboarding_status)
- auth.user_session       (session token + expiry)
   |
   | (onboarding gate)
   v
[Onboarding Module]
Step 1: Profile
- POST /api/auth/onboarding
- Updates auth.app_user (first_name/last_name/contact)
- Sets onboarding_status = 'profile_done'

Step 2: Tenant Setup
- Creates app.tenant
- Creates app.tenant_user (role: owner/admin/member)
- Creates app.tenant_location (location access mapping)
- Sets onboarding_status = 'tenant_done' or 'complete'
   |
   v
[Multi-tenant Access Control]
- app.tenant_user         (user ↔ tenant membership)
- app.tenant_location     (tenant ↔ allowed locations + is_active)
- (optional) app.user_preferences (default tenant/location)
   |
   v
[Data Layer]
A) Raw / Source
- restaurant.raw_restaurant_daily
- (future POS raw tables: orders/checks/items/payments/labor/inventory)

B) Dimensions
- restaurant.dim_location (canonical location_id BIGINT)
- core.dim_entity         (optional “business entity”; can map to tenant)

C) Analytics / KPI Compute
- analytics.get_executive_kpis_by_location(asof_ts)
- (future: trends, anomalies, forecasts, explanations)
   |
   v
[API Layer (Next.js Route Handlers)]
- /api/auth/me
- /api/auth/onboarding
- /api/restaurant/locations      (tenant-filtered)
- /api/restaurant/overview       (tenant-filtered KPIs)
- /api/cron/ingest               (server-side ingestion trigger)
   |
   v
[UI]
- TopNav (theme + widgets + global selectors)
- Sidebar (tabs)
- Pages (Overview, Inventory, Labor, Finance, etc.)