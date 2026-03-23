#Aligned PostgreSQL DDL for Valora POS Integration
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1) POS connection table
-- One active POS connection per tenant/location/provider
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.pos_connection (
    pos_connection_id         BIGSERIAL PRIMARY KEY,
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT NOT NULL,
    external_merchant_id      TEXT,
    external_location_id      TEXT NOT NULL,
    auth_type                 TEXT NOT NULL DEFAULT 'api_key',
    access_token_encrypted    TEXT,
    refresh_token_encrypted   TEXT,
    token_expires_at          TIMESTAMPTZ,
    api_key_encrypted         TEXT,
    webhook_secret_encrypted  TEXT,
    status                    TEXT NOT NULL DEFAULT 'active',
    last_sync_at              TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_pos_connection_tenant_loc_provider
        UNIQUE (tenant_id, location_id, provider),
    CONSTRAINT chk_pos_connection_auth_type
        CHECK (auth_type IN ('oauth', 'api_key', 'basic', 'custom')),
    CONSTRAINT chk_pos_connection_status
        CHECK (status IN ('active', 'paused', 'error', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_pos_connection_tenant
    ON restaurant.pos_connection (tenant_id);

CREATE INDEX IF NOT EXISTS idx_pos_connection_location
    ON restaurant.pos_connection (location_id);

CREATE INDEX IF NOT EXISTS idx_pos_connection_provider
    ON restaurant.pos_connection (provider);

CREATE INDEX IF NOT EXISTS idx_pos_connection_status
    ON restaurant.pos_connection (status);

CREATE INDEX IF NOT EXISTS idx_pos_connection_provider_ext_loc
    ON restaurant.pos_connection (provider, external_location_id);

-- =========================================================
-- 2) POS sync state
-- Incremental sync cursor per resource
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.pos_sync_state (
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT NOT NULL,
    resource_name             TEXT NOT NULL,
    cursor_type               TEXT NOT NULL,
    cursor_value              TEXT,
    last_success_at           TIMESTAMPTZ,
    last_error_at             TIMESTAMPTZ,
    error_code                TEXT,
    error_message             TEXT,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_pos_sync_state
        PRIMARY KEY (tenant_id, location_id, provider, resource_name),
    CONSTRAINT chk_pos_sync_state_cursor_type
        CHECK (cursor_type IN ('timestamp', 'page_token', 'since_id', 'offset', 'custom'))
);

CREATE INDEX IF NOT EXISTS idx_pos_sync_state_last_success
    ON restaurant.pos_sync_state (last_success_at);

CREATE INDEX IF NOT EXISTS idx_pos_sync_state_last_error
    ON restaurant.pos_sync_state (last_error_at);

-- =========================================================
-- 3) POS raw event landing
-- Immutable raw webhook / poll payload store
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.pos_raw_event (
    raw_event_id              BIGSERIAL PRIMARY KEY,
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT NOT NULL,
    event_source              TEXT NOT NULL DEFAULT 'poll',
    event_type                TEXT NOT NULL,
    provider_event_id         TEXT,
    provider_object_id        TEXT,
    payload_json              JSONB NOT NULL,
    payload_hash              TEXT NOT NULL,
    status                    TEXT NOT NULL DEFAULT 'new',
    received_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at              TIMESTAMPTZ,
    error_message             TEXT,
    CONSTRAINT chk_pos_raw_event_source
        CHECK (event_source IN ('webhook', 'poll', 'backfill', 'manual')),
    CONSTRAINT chk_pos_raw_event_status
        CHECK (status IN ('new', 'processed', 'failed', 'ignored'))
);

CREATE INDEX IF NOT EXISTS idx_pos_raw_event_tenant_location
    ON restaurant.pos_raw_event (tenant_id, location_id);

CREATE INDEX IF NOT EXISTS idx_pos_raw_event_provider
    ON restaurant.pos_raw_event (provider);

CREATE INDEX IF NOT EXISTS idx_pos_raw_event_status
    ON restaurant.pos_raw_event (status);

CREATE INDEX IF NOT EXISTS idx_pos_raw_event_received_at
    ON restaurant.pos_raw_event (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_raw_event_provider_object
    ON restaurant.pos_raw_event (provider, provider_object_id);

CREATE INDEX IF NOT EXISTS idx_pos_raw_event_payload_gin
    ON restaurant.pos_raw_event USING GIN (payload_json);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_raw_event_provider_event
    ON restaurant.pos_raw_event (tenant_id, location_id, provider, provider_event_id)
    WHERE provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pos_raw_event_payload_hash
    ON restaurant.pos_raw_event (tenant_id, location_id, provider, payload_hash);

-- =========================================================
-- 4) POS sync job log
-- Optional but strongly useful for observability
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.pos_sync_job_log (
    sync_job_id               BIGSERIAL PRIMARY KEY,
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT NOT NULL,
    resource_name             TEXT NOT NULL,
    run_type                  TEXT NOT NULL DEFAULT 'incremental',
    started_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at              TIMESTAMPTZ,
    status                    TEXT NOT NULL DEFAULT 'running',
    records_fetched           INTEGER NOT NULL DEFAULT 0,
    records_processed         INTEGER NOT NULL DEFAULT 0,
    records_failed            INTEGER NOT NULL DEFAULT 0,
    error_message             TEXT,
    CONSTRAINT chk_pos_sync_job_run_type
        CHECK (run_type IN ('incremental', 'backfill', 'manual', 'replay')),
    CONSTRAINT chk_pos_sync_job_status
        CHECK (status IN ('running', 'success', 'partial_success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_pos_sync_job_log_tenant_location
    ON restaurant.pos_sync_job_log (tenant_id, location_id, provider);

CREATE INDEX IF NOT EXISTS idx_pos_sync_job_log_started_at
    ON restaurant.pos_sync_job_log (started_at DESC);

-- =========================================================
-- 5) Daily reconciliation table
-- Compare POS summary vs Valora computed totals
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.pos_recon_daily (
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT NOT NULL,
    business_date             DATE NOT NULL,
    pos_report_total          NUMERIC NOT NULL DEFAULT 0,
    valora_total              NUMERIC NOT NULL DEFAULT 0,
    delta                     NUMERIC NOT NULL DEFAULT 0,
    status                    TEXT NOT NULL,
    notes                     TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_pos_recon_daily
        PRIMARY KEY (tenant_id, location_id, provider, business_date),
    CONSTRAINT chk_pos_recon_daily_status
        CHECK (status IN ('ok', 'warn', 'fail'))
);

CREATE INDEX IF NOT EXISTS idx_pos_recon_daily_date
    ON restaurant.pos_recon_daily (business_date);

CREATE INDEX IF NOT EXISTS idx_pos_recon_daily_status
    ON restaurant.pos_recon_daily (status);

-- =========================================================
-- 6) Payment detail table
-- Existing fact_order has sales totals but not payment detail
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.fact_order_payment (
    order_payment_id          BIGSERIAL PRIMARY KEY,
    order_id                  BIGINT NOT NULL REFERENCES restaurant.fact_order(order_id) ON DELETE CASCADE,
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT,
    provider_payment_id       TEXT,
    payment_method            TEXT,
    amount                    NUMERIC NOT NULL DEFAULT 0,
    payment_status            TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_order_payment_order
    ON restaurant.fact_order_payment (order_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_payment_tenant_location
    ON restaurant.fact_order_payment (tenant_id, location_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_payment_provider_payment
    ON restaurant.fact_order_payment (provider_payment_id);

-- =========================================================
-- 7) Refund detail table
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.fact_order_refund (
    order_refund_id           BIGSERIAL PRIMARY KEY,
    order_id                  BIGINT NOT NULL REFERENCES restaurant.fact_order(order_id) ON DELETE CASCADE,
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT,
    provider_refund_id        TEXT,
    refund_amount             NUMERIC NOT NULL DEFAULT 0,
    refund_reason             TEXT,
    created_at_utc            TIMESTAMPTZ,
    inserted_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_order_refund_order
    ON restaurant.fact_order_refund (order_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_refund_tenant_location
    ON restaurant.fact_order_refund (tenant_id, location_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_refund_provider_refund
    ON restaurant.fact_order_refund (provider_refund_id);

-- =========================================================
-- 8) Discount detail table
-- =========================================================
CREATE TABLE IF NOT EXISTS restaurant.fact_order_discount (
    order_discount_id         BIGSERIAL PRIMARY KEY,
    order_id                  BIGINT NOT NULL REFERENCES restaurant.fact_order(order_id) ON DELETE CASCADE,
    tenant_id                 UUID NOT NULL REFERENCES app.tenant(tenant_id) ON DELETE CASCADE,
    location_id               BIGINT NOT NULL REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE,
    provider                  TEXT,
    provider_discount_id      TEXT,
    discount_name             TEXT,
    discount_type             TEXT,
    discount_amount           NUMERIC NOT NULL DEFAULT 0,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_order_discount_order
    ON restaurant.fact_order_discount (order_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_discount_tenant_location
    ON restaurant.fact_order_discount (tenant_id, location_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_discount_provider_discount
    ON restaurant.fact_order_discount (provider_discount_id);

-- =========================================================
-- 9) Extend fact_order for provider-native POS ingestion
-- =========================================================
ALTER TABLE restaurant.fact_order
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
    ADD COLUMN IF NOT EXISTS external_location_id TEXT,
    ADD COLUMN IF NOT EXISTS pos_connection_id BIGINT REFERENCES restaurant.pos_connection(pos_connection_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS raw_event_id BIGINT REFERENCES restaurant.pos_raw_event(raw_event_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS opened_at_utc TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at_utc TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tip_amount NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency_code_pos TEXT,
    ADD COLUMN IF NOT EXISTS provider_updated_at_utc TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS customer_external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_fact_order_provider_order
    ON restaurant.fact_order (tenant_id, location_id, provider, provider_order_id)
    WHERE provider IS NOT NULL AND provider_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_order_provider
    ON restaurant.fact_order (provider);

CREATE INDEX IF NOT EXISTS idx_fact_order_provider_updated
    ON restaurant.fact_order (provider_updated_at_utc);

CREATE INDEX IF NOT EXISTS idx_fact_order_tenant_loc_provider_date
    ON restaurant.fact_order (tenant_id, location_id, provider, order_date);

-- =========================================================
-- 10) Extend fact_order_item for provider-native line detail
-- =========================================================
ALTER TABLE restaurant.fact_order_item
    ADD COLUMN IF NOT EXISTS provider_line_id TEXT,
    ADD COLUMN IF NOT EXISTS external_item_id TEXT,
    ADD COLUMN IF NOT EXISTS modifiers_json JSONB,
    ADD COLUMN IF NOT EXISTS raw_event_id BIGINT REFERENCES restaurant.pos_raw_event(raw_event_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fact_order_item_provider_line
    ON restaurant.fact_order_item (provider_line_id);

CREATE INDEX IF NOT EXISTS idx_fact_order_item_modifiers_gin
    ON restaurant.fact_order_item USING GIN (modifiers_json);

-- =========================================================
-- 11) Extend dim_menu_item for provider-native mapping
-- =========================================================
ALTER TABLE restaurant.dim_menu_item
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS provider_item_id TEXT,
    ADD COLUMN IF NOT EXISTS external_location_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_updated_at_utc TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dim_menu_item_provider_item
    ON restaurant.dim_menu_item (tenant_id, location_id, provider, provider_item_id)
    WHERE provider IS NOT NULL AND provider_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dim_menu_item_provider
    ON restaurant.dim_menu_item (provider);

-- =========================================================
-- 12) Optional: extend dim_location for provider location mapping
-- This is useful if one physical location must be mapped to provider IDs
-- =========================================================
ALTER TABLE restaurant.dim_location
    ADD COLUMN IF NOT EXISTS primary_pos_provider TEXT,
    ADD COLUMN IF NOT EXISTS external_location_id TEXT;

CREATE INDEX IF NOT EXISTS idx_dim_location_primary_provider
    ON restaurant.dim_location (primary_pos_provider);

CREATE INDEX IF NOT EXISTS idx_dim_location_external_location_id
    ON restaurant.dim_location (external_location_id);

COMMIT;