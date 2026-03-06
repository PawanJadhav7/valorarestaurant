# Valora AI — Blueprint v2 (POS + RLS + Production Hardening)

This is the **future-state** blueprint that upgrades the current system into a fully production-grade, multi-tenant, POS-integrated platform with database-enforced security and scalable ingestion/analytics.

---

## 0) Goals of v2

- Multi-tenant security enforced at the **database** (RLS), not only in app queries
- Pluggable POS integrations (Toast, Square, Clover, etc.)
- Standardized “canonical” restaurant facts independent of provider schema
- KPI computation optimized for low-latency dashboards
- Observability + retries + idempotency for ingestion

---

## 1) Domain Model (Who is who)

**Auth user** = human login identity  
**Tenant** = business group/org (restaurant operator / chain owner)  
**Location** = store/site under a tenant

Core mapping:
- A user can belong to multiple tenants
- A tenant can have multiple locations
- Location access can be limited per user (RBAC + location ACLs)

---

## 2) System Architecture (End-to-end)

```text
[Next.js Web App]
  |
  | session cookie
  v
[Auth]
- auth.app_user
- auth.user_session
  |
  v
[Onboarding / Tenant Admin]
- Profile (name/contact)
- Tenant Setup (create tenant, connect POS, map locations, invite users)
  |
  v
[Multi-Tenant Access Control]
- app.tenant
- app.tenant_user (RBAC)
- app.tenant_location (ACL)
- app.user_preferences (default tenant/location)
  |
  v
[POS Integration Layer]
- app.pos_provider (enum-like)
- app.pos_connection (tenant_id, provider, status)
- app.pos_credentials (encrypted ref / secret manager pointer)
- app.pos_ingestion_cursor (per location/provider incremental sync cursor)
- app.ingestion_run_log + app.ingestion_errors
  |
  v
[Raw Data]
- raw.pos_* (provider payloads, minimally transformed)
  |
  v
[Standardization / Canonical Facts]
- restaurant.fact_sales_daily
- restaurant.fact_sales_line
- restaurant.fact_labor_daily
- restaurant.fact_inventory_daily (or item on hand)
- restaurant.dim_location
- restaurant.dim_item (optional)
- restaurant.dim_employee (optional)
  |
  v
[Analytics / KPIs]
- analytics.* functions/views (KPI bundles, trends, deltas)
- (optional) ai.* (driver bullets, narratives, anomaly detection)
  |
  v
[API Layer]
- Tenant-scoped endpoints (location selector + KPIs)
- Admin endpoints (POS connect, users, locations)
  |
  v
[UI]
- TopNav (tenant/location selector, widgets)
- Sidebar tabs
- Pages per domain (Overview, Sales, Labor, Inventory, Finance)