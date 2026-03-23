# Valora Restaurant — Data Model Spec (v1)
Version: 1.0  
Last Updated: 2026-02-19  
Scope: CSV-first ingestion → KPI engine → AI Insights  
Supports: Multi-location (MVP)

---

## 1) Design Principles

### Layers
- **raw_***: append-only ingestion (CSV / Toast), minimally transformed
- **stg_***: normalized + typed + cleaned (canonical field names)
- **fact_***: analytic facts (daily aggregates)
- **mart_***: KPI-ready datasets and rollups (30d, MTD, trend series)

### Multi-location
Every table must include:
- `entity_id` (restaurant owner / tenant)
- `location_id` (store/branch)
- `business_date` (restaurant “day”)

### Time & Calendar
- Use **business_date** (date) for restaurant reporting (not timestamp)
- Keep timezone in `location_dim.timezone`

---

## 2) Core Dimensions

## 2.1 entity_dim
Represents the tenant / customer (restaurant owner)

**Table:** `app.entity_dim`
| column | type | notes |
|---|---|---|
| entity_id | text (pk) | "1" for MVP |
| entity_name | text | |
| created_at | timestamptz | default now() |

---

## 2.2 location_dim
Represents each restaurant location.

**Table:** `app.location_dim`
| column | type | notes |
|---|---|---|
| location_id | text (pk) | "loc_001" |
| entity_id | text (fk) | |
| location_name | text | |
| timezone | text | "America/New_York" |
| is_active | boolean | default true |

---

## 3) RAW Ingestion Tables (CSV/Toast)

## 3.1 raw_pos_orders
Order-level POS data (Toast will map cleanly here)

**Table:** `public.raw_pos_orders`
| column | type | notes |
|---|---|---|
| row_id | uuid pk | gen_random_uuid() |
| dataset_id | uuid | ingestion batch id |
| entity_id | text | |
| location_id | text | |
| business_date | date | |
| order_id | text | unique per location |
| channel | text | dine_in / takeout / delivery |
| gross_sales | numeric(14,2) | before discounts |
| discounts | numeric(14,2) | |
| net_sales | numeric(14,2) | after discounts |
| tax | numeric(14,2) | |
| tips | numeric(14,2) | |
| total_collected | numeric(14,2) | |
| guest_count | int | optional |
| created_at | timestamptz | now() |

**Indexes**
- (entity_id, location_id, business_date)
- unique (entity_id, location_id, order_id) if available

---

## 3.2 raw_pos_items
Item-level line items (supports menu optimization + AI drivers)

**Table:** `public.raw_pos_items`
| column | type | notes |
|---|---|---|
| row_id | uuid pk | |
| dataset_id | uuid | |
| entity_id | text | |
| location_id | text | |
| business_date | date | |
| order_id | text | fk to orders (soft) |
| item_id | text | |
| item_name | text | |
| category | text | e.g. "Burgers" |
| qty | numeric(12,3) | |
| net_item_sales | numeric(14,2) | |
| cogs_est | numeric(14,2) | if available |
| created_at | timestamptz | |

---

## 3.3 raw_labor_shifts
Labor cost data (daily or shift level)

**Table:** `public.raw_labor_shifts`
| column | type | notes |
|---|---|---|
| row_id | uuid pk | |
| dataset_id | uuid | |
| entity_id | text | |
| location_id | text | |
| business_date | date | |
| employee_id | text | optional |
| role | text | optional |
| hours | numeric(10,2) | |
| wage_cost | numeric(14,2) | |
| overtime_cost | numeric(14,2) | optional |
| total_labor_cost | numeric(14,2) | |
| created_at | timestamptz | |

---

## 3.4 raw_inventory_daily
Inventory snapshots (for DOH)

**Table:** `public.raw_inventory_daily`
| column | type | notes |
|---|---|---|
| row_id | uuid pk | |
| dataset_id | uuid | |
| entity_id | text | |
| location_id | text | |
| business_date | date | |
| inventory_value | numeric(14,2) | total on-hand value |
| created_at | timestamptz | |

---

## 3.5 raw_ap_ar_daily (optional v1.1)
If you want **Cash Conversion Cycle** properly:
- AR days (gift cards, catering invoices)
- AP days (supplier invoices)

**Table:** `public.raw_ap_ar_daily`
| column | type | notes |
|---|---|---|
| row_id | uuid pk | |
| entity_id | text | |
| location_id | text | |
| business_date | date | |
| ar_balance | numeric(14,2) | |
| ap_balance | numeric(14,2) | |
| created_at | timestamptz | |

---

## 3.6 raw_fixed_costs_monthly
Fixed costs (rent, utilities, subscriptions). Needed for break-even, safety margin, fixed coverage.

**Table:** `public.raw_fixed_costs_monthly`
| column | type | notes |
|---|---|---|
| row_id | uuid pk | |
| entity_id | text | |
| location_id | text | or "ALL" |
| month_start | date | first day of month |
| fixed_cost | numeric(14,2) | |
| rent | numeric(14,2) | optional |
| utilities | numeric(14,2) | optional |
| subscriptions | numeric(14,2) | optional |
| created_at | timestamptz | |

---

## 4) Staging Tables (Normalized)

## 4.1 stg_daily_sales
Canonical daily sales rollup.

**Table:** `app.stg_daily_sales`
| column | type |
|---|---|
| entity_id | text |
| location_id | text |
| business_date | date |
| revenue | numeric(14,2) |
| discounts | numeric(14,2) |
| tax | numeric(14,2) |
| tips | numeric(14,2) |
| orders | int |
| guests | int |
| created_at | timestamptz |

Unique: (entity_id, location_id, business_date)

---

## 4.2 stg_daily_cogs
COGS computed or ingested (from item cogs or inventory delta)

**Table:** `app.stg_daily_cogs`
| column | type |
|---|---|
| entity_id | text |
| location_id | text |
| business_date | date |
| cogs | numeric(14,2) |

Unique: (entity_id, location_id, business_date)

---

## 4.3 stg_daily_labor
Daily labor totals

**Table:** `app.stg_daily_labor`
| column | type |
|---|---|
| entity_id | text |
| location_id | text |
| business_date | date |
| labor_cost | numeric(14,2) |
| labor_hours | numeric(10,2) |

Unique: (entity_id, location_id, business_date)

---

## 4.4 stg_daily_inventory
Daily inventory snapshots

**Table:** `app.stg_daily_inventory`
| column | type |
|---|---|
| entity_id | text |
| location_id | text |
| business_date | date |
| inventory_value | numeric(14,2) |

Unique: (entity_id, location_id, business_date)

---

## 5) Fact Tables

## 5.1 fact_restaurant_day
Single daily fact grain for KPI compute.

**Table:** `app.fact_restaurant_day`
| column | type |
|---|---|
| entity_id | text |
| location_id | text |
| business_date | date |
| revenue | numeric(14,2) |
| cogs | numeric(14,2) |
| labor_cost | numeric(14,2) |
| gross_profit | numeric(14,2) |
| fixed_cost_daily | numeric(14,2) | from monthly / days_in_month |
| inventory_value | numeric(14,2) |
| orders | int |
| guests | int |

Unique: (entity_id, location_id, business_date)

---

## 6) KPI Mart Tables

## 6.1 mart_kpis_daily
Stores daily KPI values using the **Executive KPI Code Registry**.

**Table:** `app.mart_kpis_daily`
| column | type | notes |
|---|---|---|
| entity_id | text | |
| location_id | text | |
| business_date | date | |
| kpi_code | text | EXECUTIVE_CODE |
| kpi_value | numeric(18,6) | |
| unit | text | usd/pct/days/ratio/count |
| created_at | timestamptz | |

Unique: (entity_id, location_id, business_date, kpi_code)

---

## 6.2 mart_kpis_rollup_30d
Precomputed 30d KPIs for fast dashboard load.

**Table:** `app.mart_kpis_rollup_30d`
| column | type |
|---|---|
| entity_id | text |
| location_id | text |
| as_of | date |
| kpi_code | text |
| kpi_value | numeric(18,6) |
| unit | text |
| kpi_delta | numeric(18,6) | vs prior 30d |
| severity | text | good/warn/risk |
| narrative | text | optional |
| refreshed_at | timestamptz |

Unique: (entity_id, location_id, as_of, kpi_code)

---

## 7) Mapping — Snake Keys vs Executive Codes

Examples:

| Executive Code | Staging/Facts | Raw/DB Snake |
|---|---|---|
| REVENUE | fact_restaurant_day.revenue | revenue |
| COGS | fact_restaurant_day.cogs | cogs |
| GROSS_MARGIN | derived | gross_margin_pct |
| LABOR_COST_RATIO | derived | labor_cost_ratio |
| DAYS_INVENTORY_ON_HAND | derived | days_inventory_on_hand |
| BREAK_EVEN_REVENUE | derived | break_even_revenue |
| SAFETY_MARGIN | derived | safety_margin |

---

## 8) What’s Next

### CSV MVP (1–2 days)
- Create raw tables
- Build a simple CSV upload to raw_pos_orders + raw_labor_shifts + raw_inventory_daily + raw_fixed_costs_monthly
- Build stg + fact + mart

### Toast (next)
- Map Toast orders/items/labor exports → the same raw tables
- Enable refresh every 15 minutes or daily

---

# End of Data Model v1.0


# Data Model v2.0
--Queries for the schemas and table definition
--1. List all schemas
    SELECT schema_name
    FROM information_schema.schemata
    ORDER BY schema_name;
--2. List all tables in the main schemas
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('app', 'ml', 'public', 'auth')
    ORDER BY table_schema, table_name;
--3. Show columns for the ml schema
    SELECT
    table_schema,
    table_name,
    column_name,
    data_type
    FROM information_schema.columns
    WHERE table_schema = 'ml'
    RDER BY table_name, ordinal_position;
--4. Show columns for the app schema
    SELECT
    table_schema,
    table_name,
    column_name,
    data_type
    FROM information_schema.columns
    WHERE table_schema = 'app'
    ORDER BY table_name, ordinal_position;
--5. Show view definitions in ml
    SELECT schemaname, viewname, definition
    FROM pg_views
    WHERE schemaname = 'ml'
    ORDER BY viewname;
--6. Show materialized views in ml
    SELECT schemaname, matviewname, definition
    FROM pg_matviews
    WHERE schemaname = 'ml'
    ORDER BY matviewname;
--7. Optional: show table row counts for quick sizing
    SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    c.reltuples::bigint AS estimated_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'ml', 'auth')
    AND c.relkind IN ('r', 'm')
    ORDER BY n.nspname, c.relname;


    Table 1 — ai.generation_run
    This is the master job/run log for AI generation.
    Purpose - Track every AI generation batch or targeted run.

    CREATE TABLE ai.generation_run (
    generation_run_id      BIGSERIAL PRIMARY KEY,
    run_type               TEXT NOT NULL,         -- daily_batch, location_regen, tenant_regen, chat_explanation
    run_scope              TEXT NOT NULL,         -- tenant, location, global
    tenant_id              UUID NULL,
    location_id            BIGINT NULL,
    as_of_date             DATE NULL,
    trigger_source         TEXT NOT NULL,         -- cron, manual, profile_update, data_refresh, api
    upstream_snapshot_name TEXT NULL,            -- e.g. ml.mv_valora_control_tower
    upstream_snapshot_ts   TIMESTAMPTZ NULL,
    prompt_template_version TEXT NULL,
    llm_provider           TEXT NULL,             -- gemini, openai, anthropic
    llm_model_name         TEXT NULL,
    llm_model_version      TEXT NULL,
    status                 TEXT NOT NULL,         -- queued, running, succeeded, partial, failed
    started_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at           TIMESTAMPTZ NULL,
    generated_count        INTEGER NOT NULL DEFAULT 0,
    failed_count           INTEGER NOT NULL DEFAULT 0,
    error_message          TEXT NULL,
    metadata_json          JSONB NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
This complements:
	•	app.job_run_log
	•	app.job_heartbeat

Use app.job_run_log for platform job monitoring.
Use ai.generation_run for AI-specific lineage and audit.

Table 2 — ai.location_insight_daily
This should become the primary persisted AI artifact table for dashboard consumption.

Purpose - Store final daily AI insight outputs per tenant/location/date.

Recommended columns
CREATE TABLE ai.location_insight_daily (
    location_insight_id         BIGSERIAL PRIMARY KEY,
    as_of_date                  DATE NOT NULL,
    tenant_id                   UUID NOT NULL,
    location_id                 BIGINT NOT NULL,

    insight_type                TEXT NOT NULL,    -- control_tower, operator_brief, anomaly_explanation, opportunity_summary
    audience_type               TEXT NOT NULL,    -- operator, manager, executive

    headline                    TEXT NOT NULL,
    summary_text                TEXT NOT NULL,
    recommendation_text         TEXT NULL,

    risk_summary_json           JSONB NULL,
    recommended_actions_json    JSONB NULL,
    supporting_facts_json       JSONB NULL,
    explanation_json            JSONB NULL,

    top_risk_type               TEXT NULL,
    top_action_code             TEXT NULL,
    opportunity_type            TEXT NULL,

    confidence_score            NUMERIC NULL,
    priority_rank               INTEGER NULL,

    source_hash                 TEXT NULL,        -- hash of upstream snapshot/context
    source_snapshot_json        JSONB NULL,       -- optional structured upstream facts
    generation_run_id           BIGINT REFERENCES ai.generation_run(generation_run_id),

    prompt_template_version     TEXT NULL,
    llm_provider                TEXT NULL,
    llm_model_name              TEXT NULL,
    llm_model_version           TEXT NULL,

    generation_mode             TEXT NOT NULL DEFAULT 'persisted',  -- persisted, fallback, manual
    generation_status           TEXT NOT NULL DEFAULT 'active',     -- active, superseded, failed, draft
    generated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at                  TIMESTAMPTZ NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (as_of_date, tenant_id, location_id, insight_type, audience_type)
);
Right now ml.insight_brief_daily already stores:
	•	headline
	•	summary_text
	•	risk summary
	•	action json

That means ai.location_insight_daily can become:
	•	the richer, production-grade successor
	•	or the final persisted table fed from ml.insight_brief_daily + LLM enrichment


Table 3 — ai.prompt_audit

This is for traceability and debugging.

Purpose

Store prompt + input context + LLM response metadata for reproducibility.

Recommended columns
CREATE TABLE ai.prompt_audit (
    prompt_audit_id            BIGSERIAL PRIMARY KEY,
    generation_run_id          BIGINT REFERENCES ai.generation_run(generation_run_id),
    tenant_id                  UUID NULL,
    location_id                BIGINT NULL,
    as_of_date                 DATE NULL,

    prompt_type                TEXT NOT NULL,     -- daily_brief, control_tower, anomaly_explanation
    prompt_template_version    TEXT NOT NULL,
    input_context_json         JSONB NOT NULL,
    prompt_text                TEXT NOT NULL,

    llm_provider               TEXT NOT NULL,
    llm_model_name             TEXT NOT NULL,
    llm_model_version          TEXT NULL,

    raw_response_text          TEXT NULL,
    parsed_response_json       JSONB NULL,

    token_input_count          INTEGER NULL,
    token_output_count         INTEGER NULL,
    latency_ms                 INTEGER NULL,
    response_status            TEXT NOT NULL,     -- succeeded, parse_failed, provider_failed
    error_message              TEXT NULL,

    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
Why this is important

You already track ML model registry and training runs.
This gives the same governance discipline to the LLM side.

Table 4 — ai.insight_serving_current

This can be either a table or view. I recommend a view over the daily table.

Purpose

Serve the latest active AI insight per location quickly to UI/API.

View idea
CREATE VIEW ai.v_location_insight_current AS
SELECT *
FROM ai.location_insight_daily
WHERE generation_status = 'active';

Or, if you want supersession support later, use a ranked view selecting latest active row.

Why useful

The dashboard should read a stable AI serving layer, not raw prompt runs.

⸻
Table 5 — ai.chat_explanation_log

This is for live interactive AI, separate from persisted daily insights.

Purpose

Log ad hoc, user-triggered explanations like:
	•	“Why is Queens at risk?”
	•	“Explain stockout risk”
	•	“What if I improve labor by 5%?”

Recommended columns
CREATE TABLE ai.chat_explanation_log (
    chat_log_id                BIGSERIAL PRIMARY KEY,
    tenant_id                  UUID NOT NULL,
    user_id                    UUID NULL,
    location_id                BIGINT NULL,
    as_of_date                 DATE NULL,

    request_type               TEXT NOT NULL,     -- explain_metric, explain_alert, what_if, freeform_chat
    user_message               TEXT NOT NULL,
    resolved_context_json      JSONB NULL,
    response_text              TEXT NULL,

    llm_provider               TEXT NULL,
    llm_model_name             TEXT NULL,
    llm_model_version          TEXT NULL,

    latency_ms                 INTEGER NULL,
    status                     TEXT NOT NULL DEFAULT 'succeeded',
    error_message              TEXT NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
Why separate

Daily persisted dashboard AI and live conversational AI are not the same workload.

Optional Table 6 — ai.insight_feedback

Very useful later.

Purpose

Capture whether users found an insight useful.
CREATE TABLE ai.insight_feedback (
    insight_feedback_id        BIGSERIAL PRIMARY KEY,
    location_insight_id        BIGINT REFERENCES ai.location_insight_daily(location_insight_id),
    tenant_id                  UUID NOT NULL,
    user_id                    UUID NULL,
    feedback_type              TEXT NOT NULL,     -- helpful, not_helpful, inaccurate, dismiss, accepted_action
    feedback_score             INTEGER NULL,
    feedback_note              TEXT NULL,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

5. Recommended relationship with existing ml tables

Now that we have your real schema, here is the clean relationship model.

ml upstream sources for ai

Your best AI source inputs are:

Primary source
	•	ml.mv_valora_control_tower

Secondary sources
	•	ml.risk_signal_daily
	•	ml.recommended_action_daily
	•	ml.profit_opportunity_daily
	•	ml.forecast_daily
	•	ml.anomaly_event

Transitional source
	•	ml.insight_brief_daily

6. Recommended evolution of ml.insight_brief_daily

This is the most important design choice.

Recommendation

Treat ml.insight_brief_daily as a transitional deterministic briefing layer, not the final long-term AI persistence layer.

Why

It currently mixes:
	•	structured outputs
	•	human-readable content
	•	dashboard-ready summaries

That is okay for now, but long-term the richer narrative/audit workload belongs in ai.

Best future pattern
ml.insight_brief_daily
    = deterministic business-summary layer

ai.location_insight_daily
    = final persisted decision-intelligence layer