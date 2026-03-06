-- ============================================================
-- Valora AI (v2) – Production-grade SQL DDL
-- POS control-plane + preferences + run logging + indexes
-- Safe to run multiple times (IF NOT EXISTS where possible)
-- ============================================================

-- Required for gen_random_uuid() on many Postgres setups
create extension if not exists pgcrypto;

create schema if not exists app;

-- ============================================================
-- 1) User preferences (default tenant/location per user)
-- ============================================================
create table if not exists app.user_preferences (
  user_id uuid primary key
    references auth.app_user(user_id) on delete cascade,

  default_tenant_id uuid null
    references app.tenant(tenant_id) on delete set null,

  default_location_id bigint null
    references restaurant.dim_location(location_id) on delete set null,

  updated_at timestamptz not null default now()
);

create index if not exists idx_user_preferences_default_tenant
  on app.user_preferences(default_tenant_id);

create index if not exists idx_user_preferences_default_location
  on app.user_preferences(default_location_id);


-- ============================================================
-- 2) POS Providers (enum-like) + POS Connection per tenant
-- ============================================================
-- Option A: use a CHECK constraint (simplest for deployments)
-- You can extend this list anytime.
create table if not exists app.pos_connection (
  connection_id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null
    references app.tenant(tenant_id) on delete cascade,

  provider text not null,
  status text not null default 'disconnected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Optional metadata (safe JSON bag)
  meta jsonb null,

  constraint pos_connection_provider_chk
    check (provider in ('toast','square','clover','lightspeed','generic_csv')),

  constraint pos_connection_status_chk
    check (status in ('disconnected','connecting','connected','error','paused'))
);

create index if not exists idx_pos_connection_tenant
  on app.pos_connection(tenant_id);

create index if not exists idx_pos_connection_provider
  on app.pos_connection(provider);


-- ============================================================
-- 3) POS credentials (store only references; put secrets in Vercel/Neon/Secrets Manager)
-- ============================================================
-- IMPORTANT: Do NOT store raw access tokens in plaintext.
-- Store a pointer or encrypted blob if you must.
create table if not exists app.pos_credentials (
  connection_id uuid primary key
    references app.pos_connection(connection_id) on delete cascade,

  -- e.g. "vercel:TOAST_TOKEN_TENANT_<id>" or "aws_sm:arn:..."
  secret_ref text not null,

  -- optional: encrypted JSON (if you decide to encrypt app-side)
  encrypted_blob bytea null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4) POS Location mapping (provider location identifier -> dim_location)
-- ============================================================
create table if not exists app.pos_location_map (
  connection_id uuid not null
    references app.pos_connection(connection_id) on delete cascade,

  location_id bigint not null
    references restaurant.dim_location(location_id) on delete cascade,

  provider_location_ref text not null,  -- the POS's store/restaurant id
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (connection_id, location_id),

  constraint pos_location_map_provider_ref_uniq
    unique (connection_id, provider_location_ref)
);

create index if not exists idx_pos_location_map_location
  on app.pos_location_map(location_id);

create index if not exists idx_pos_location_map_active
  on app.pos_location_map(connection_id, is_active);


-- ============================================================
-- 5) POS ingestion cursor (incremental sync per connection+location)
-- ============================================================
create table if not exists app.pos_ingestion_cursor (
  connection_id uuid not null
    references app.pos_connection(connection_id) on delete cascade,

  location_id bigint not null
    references restaurant.dim_location(location_id) on delete cascade,

  -- opaque cursor: timestamp, sequence, token, etc.
  cursor text null,
  cursor_ts timestamptz null,

  updated_at timestamptz not null default now(),

  primary key (connection_id, location_id)
);


-- ============================================================
-- 6) Ingestion run log + errors (observability)
-- ============================================================
create table if not exists app.ingestion_run_log (
  run_id uuid primary key default gen_random_uuid(),

  tenant_id uuid not null
    references app.tenant(tenant_id) on delete cascade,

  connection_id uuid null
    references app.pos_connection(connection_id) on delete set null,

  provider text not null,

  started_at timestamptz not null default now(),
  finished_at timestamptz null,

  status text not null default 'running',
  -- metrics: rows_in, rows_out, durations, etc.
  metrics jsonb null,

  constraint ingestion_run_status_chk
    check (status in ('running','success','failed','partial','skipped'))
);

create index if not exists idx_ingestion_run_tenant_time
  on app.ingestion_run_log(tenant_id, started_at desc);

create index if not exists idx_ingestion_run_status
  on app.ingestion_run_log(status);


create table if not exists app.ingestion_error (
  error_id uuid primary key default gen_random_uuid(),

  run_id uuid not null
    references app.ingestion_run_log(run_id) on delete cascade,

  tenant_id uuid not null
    references app.tenant(tenant_id) on delete cascade,

  scope text null,          -- e.g. "location:101", "orders", "menu_items"
  error_code text null,     -- provider error code
  message text not null,

  payload_preview jsonb null, -- small snippet for debugging
  created_at timestamptz not null default now()
);

create index if not exists idx_ingestion_error_run
  on app.ingestion_error(run_id);

create index if not exists idx_ingestion_error_tenant_time
  on app.ingestion_error(tenant_id, created_at desc);


-- ============================================================
-- 7) Helpful: trigger to auto-update updated_at columns
-- ============================================================
create or replace function app.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_pos_connection_updated_at') then
    create trigger trg_pos_connection_updated_at
    before update on app.pos_connection
    for each row execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_pos_credentials_updated_at') then
    create trigger trg_pos_credentials_updated_at
    before update on app.pos_credentials
    for each row execute function app.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_pos_location_map_updated_at') then
    create trigger trg_pos_location_map_updated_at
    before update on app.pos_location_map
    for each row execute function app.set_updated_at();
  end if;
end $$;


-- ============================================================
-- 8) Optional seed example (you can delete this section)
-- ============================================================
-- Example: set a default tenant/location for a user
-- insert into app.user_preferences(user_id, default_tenant_id, default_location_id)
-- values ('<USER_UUID>', '<TENANT_UUID>', 101)
-- on conflict (user_id) do update
-- set default_tenant_id = excluded.default_tenant_id,
--     default_location_id = excluded.default_location_id,
--     updated_at = now();