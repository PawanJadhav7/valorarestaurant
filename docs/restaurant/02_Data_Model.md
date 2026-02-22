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