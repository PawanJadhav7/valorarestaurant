# Valora AI Data Dictionary

## Overview

This document describes the core database tables and data fields used by the Valora AI platform.

The data dictionary ensures consistent understanding of:

- business entities
- KPIs
- operational metrics
- AI features

Primary database: **Neon PostgreSQL**

Schemas used:

- `app`
- `restaurant`
- `ml`

---

# 1. Tenant Tables

## app.tenant

Represents a restaurant brand or organization.

| Column | Type | Description |
|------|------|-------------|
tenant_id | UUID | Unique identifier for a restaurant organization |
tenant_name | TEXT | Brand or company name |
created_at | TIMESTAMP | Tenant creation timestamp |

---

## app.tenant_location

Represents individual restaurant locations.

| Column | Type | Description |
|------|------|-------------|
location_id | BIGINT | Unique location identifier |
tenant_id | UUID | Parent tenant |
location_code | TEXT | Short code for location |
name | TEXT | Location name |

---

## app.user_location

Maps users to restaurant locations.

| Column | Type | Description |
|------|------|-------------|
user_id | UUID | System user |
location_id | BIGINT | Restaurant location |

---

# 2. Operational Data Tables

## restaurant.fact_order

Stores restaurant orders.

| Column | Type | Description |
|------|------|-------------|
order_id | BIGINT | Unique order identifier |
tenant_id | UUID | Tenant owning order |
location_id | BIGINT | Location where order occurred |
order_date | DATE | Date of order |

---

## restaurant.fact_order_item

Stores items within an order.

| Column | Type | Description |
|------|------|-------------|
order_item_id | BIGINT | Unique order item identifier |
order_id | BIGINT | Parent order |
menu_item_id | BIGINT | Menu item |
quantity | INTEGER | Item quantity |
price | NUMERIC | Item price |

---

# 3. Menu Data

## restaurant.dim_menu_item

Stores restaurant menu items.

| Column | Type | Description |
|------|------|-------------|
menu_item_id | BIGINT | Unique menu item |
tenant_id | UUID | Tenant |
location_id | BIGINT | Location |
item_name | TEXT | Menu item name |
category | TEXT | Menu category |
base_price | NUMERIC | Item price |
base_cogs | NUMERIC | Cost of goods sold |

---

# 4. Aggregated Analytics Features

## restaurant.f_location_daily_features

Daily aggregated metrics for each restaurant location.

This table powers most dashboards and analytics.

| Column | Type | Description |
|------|------|-------------|
day | DATE | Date of record |
tenant_id | UUID | Tenant identifier |
location_id | BIGINT | Restaurant location |
revenue | NUMERIC | Total revenue |
cogs | NUMERIC | Cost of goods sold |
labor | NUMERIC | Labor cost |
orders | INTEGER | Number of orders |
customers | INTEGER | Number of customers |

---

## Key KPI Fields

| Column | Meaning |
|------|------|
gross_margin | Revenue minus COGS |
food_cost_pct | Food cost percentage |
labor_cost_pct | Labor cost percentage |
prime_cost | Food + labor |
prime_cost_pct | Prime cost percentage |
aov | Average order value |

---

# 5. Financial Metrics

| Metric | Definition |
|------|-------------|
Revenue | Total sales |
COGS | Cost of ingredients |
Labor | Staff cost |
Gross Profit | Revenue - COGS |
Contribution Margin | Revenue - Variable costs |
EBIT | Earnings before interest and tax |

---

# 6. Operational Metrics

| Metric | Definition |
|------|-------------|
Orders | Total orders |
Customers | Total customers |
AOV | Revenue per order |
Sales per Labor Hour | Efficiency metric |

---

# 7. Inventory Metrics

| Metric | Definition |
|------|-------------|
avg_inventory | Average inventory value |
waste_pct | Food waste percentage |
stockout_count | Number of inventory stockouts |

---

# 8. AI Feature Fields

These fields support machine learning models.

| Field | Description |
|------|-------------|
sales_last_7d_avg | 7-day rolling average revenue |
sales_last_14d_avg | 14-day rolling average |
gross_margin_last_7d_avg | Margin trend indicator |

---

# Purpose of the Data Dictionary

This document helps:

- engineers understand schema quickly
- ML engineers build features
- analysts create dashboards
- product teams define KPIs

It serves as the **authoritative reference for Valora data models**.