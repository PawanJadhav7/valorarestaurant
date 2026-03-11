--
-- PostgreSQL database dump
--

\restrict imC60VYOxgQuursdezBX2sCcHvHbRgQWQb9spesdkUEQHCWw1WBF2v6XETpc3gA

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CSV_ecommerce; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA "CSV_ecommerce";


ALTER SCHEMA "CSV_ecommerce" OWNER TO neondb_owner;

--
-- Name: CSV_finance; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA "CSV_finance";


ALTER SCHEMA "CSV_finance" OWNER TO neondb_owner;

--
-- Name: CSV_healthcare; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA "CSV_healthcare";


ALTER SCHEMA "CSV_healthcare" OWNER TO neondb_owner;

--
-- Name: CSV_insurance; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA "CSV_insurance";


ALTER SCHEMA "CSV_insurance" OWNER TO neondb_owner;

--
-- Name: CSV_saas; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA "CSV_saas";


ALTER SCHEMA "CSV_saas" OWNER TO neondb_owner;

--
-- Name: CSV_supplychain; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA "CSV_supplychain";


ALTER SCHEMA "CSV_supplychain" OWNER TO neondb_owner;

--
-- Name: ai; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA ai;


ALTER SCHEMA ai OWNER TO neondb_owner;

--
-- Name: analytics; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA analytics;


ALTER SCHEMA analytics OWNER TO neondb_owner;

--
-- Name: app; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA app;


ALTER SCHEMA app OWNER TO neondb_owner;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO neondb_owner;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA core;


ALTER SCHEMA core OWNER TO neondb_owner;

--
-- Name: kpi; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA kpi;


ALTER SCHEMA kpi OWNER TO neondb_owner;

--
-- Name: mart; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA mart;


ALTER SCHEMA mart OWNER TO neondb_owner;

--
-- Name: ops; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA ops;


ALTER SCHEMA ops OWNER TO neondb_owner;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: restaurant; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA restaurant;


ALTER SCHEMA restaurant OWNER TO neondb_owner;

--
-- Name: staging; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA staging;


ALTER SCHEMA staging OWNER TO neondb_owner;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: tablefunc; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS tablefunc WITH SCHEMA public;


--
-- Name: EXTENSION tablefunc; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION tablefunc IS 'functions that manipulate whole tables, including crosstab';


--
-- Name: alert_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.alert_status AS ENUM (
    'open',
    'acknowledged',
    'snoozed',
    'resolved',
    'dismissed'
);


ALTER TYPE public.alert_status OWNER TO neondb_owner;

--
-- Name: event_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.event_status AS ENUM (
    'new',
    'validated',
    'rejected',
    'processed'
);


ALTER TYPE public.event_status OWNER TO neondb_owner;

--
-- Name: inventory_movement_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.inventory_movement_type AS ENUM (
    'purchase',
    'usage',
    'waste',
    'transfer_in',
    'transfer_out',
    'adjustment',
    'count_correction',
    'return_to_vendor'
);


ALTER TYPE public.inventory_movement_type OWNER TO neondb_owner;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.invoice_status AS ENUM (
    'received',
    'approved',
    'paid',
    'void'
);


ALTER TYPE public.invoice_status OWNER TO neondb_owner;

--
-- Name: po_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.po_status AS ENUM (
    'draft',
    'submitted',
    'approved',
    'received',
    'closed',
    'canceled'
);


ALTER TYPE public.po_status OWNER TO neondb_owner;

--
-- Name: severity; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.severity AS ENUM (
    'info',
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public.severity OWNER TO neondb_owner;

--
-- Name: get_executive_kpis_all_locations(timestamp with time zone); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_executive_kpis_all_locations(as_of_ts timestamp with time zone) RETURNS TABLE(as_of_ts timestamp with time zone, revenue_30d numeric, orders_30d bigint, cogs_30d numeric, gross_profit_30d numeric, gross_margin_pct numeric, food_cost_ratio_pct numeric, labor_cost_30d numeric, labor_cost_ratio_pct numeric, prime_cost_ratio_pct numeric, fixed_costs_30d numeric, fixed_cost_coverage_ratio numeric, break_even_revenue_30d numeric, safety_margin_pct numeric, days_inventory_on_hand numeric, ar_days numeric, ap_days numeric, cash_conversion_cycle_days numeric, avg_revenue_per_order numeric, ebit_30d numeric, interest_expense_30d numeric, interest_coverage_ratio numeric)
    LANGUAGE sql
    AS $$
WITH tw AS (
  SELECT
    as_of_ts AS as_of_ts,
    (as_of_ts - interval '30 days') AS start_ts,
    (as_of_ts::date - 30) AS start_date,
    (as_of_ts::date) AS end_date
),

sales AS (
  SELECT
    COUNT(*) AS orders_30d,
    COALESCE(SUM(gross_sales - discount),0)::numeric AS revenue_30d
  FROM restaurant.fact_order o JOIN tw ON TRUE
  WHERE o.order_ts >= tw.start_ts AND o.order_ts < tw.as_of_ts
),

cogs AS (
  SELECT
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs_30d
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN tw ON TRUE
  WHERE o.order_ts >= tw.start_ts AND o.order_ts < tw.as_of_ts
),

labor AS (
  SELECT
    COALESCE(SUM(ls.hours_worked * ls.hourly_rate),0)::numeric AS labor_30d
  FROM restaurant.fact_labor_shift ls
  JOIN tw ON TRUE
  WHERE ls.shift_date >= tw.start_date AND ls.shift_date < tw.end_date
),

fixed AS (
  SELECT
    COALESCE(SUM(f.amount),0)::numeric AS fixed_costs_30d
  FROM restaurant.fact_fixed_cost_daily f
  JOIN tw ON TRUE
  WHERE f.cost_date >= tw.start_date AND f.cost_date < tw.end_date
    AND f.cost_type = 'Fixed'
),

interest AS (
  SELECT
    COALESCE(SUM(f.amount),0)::numeric AS interest_expense_30d
  FROM restaurant.fact_fixed_cost_daily f
  JOIN tw ON TRUE
  WHERE f.cost_date >= tw.start_date AND f.cost_date < tw.end_date
    AND f.cost_type = 'Interest'
),

-- All-locations snapshots: sum per day then average
ar_daily AS (
  SELECT snapshot_date, SUM(ar_balance)::numeric AS ar_total
  FROM restaurant.fact_ar_snapshot_daily a JOIN tw ON TRUE
  WHERE a.snapshot_date >= tw.start_date AND a.snapshot_date < tw.end_date
  GROUP BY 1
),
ap_daily AS (
  SELECT snapshot_date, SUM(ap_balance)::numeric AS ap_total
  FROM restaurant.fact_ap_snapshot_daily p JOIN tw ON TRUE
  WHERE p.snapshot_date >= tw.start_date AND p.snapshot_date < tw.end_date
  GROUP BY 1
),
inv_daily AS (
  SELECT snapshot_date, SUM(inventory_value)::numeric AS inv_total
  FROM restaurant.fact_inventory_on_hand_daily i JOIN tw ON TRUE
  WHERE i.snapshot_date >= tw.start_date AND i.snapshot_date < tw.end_date
  GROUP BY 1
),

ar AS (SELECT AVG(ar_total)  ::numeric AS avg_ar_balance_30d FROM ar_daily),
ap AS (SELECT AVG(ap_total)  ::numeric AS avg_ap_balance_30d FROM ap_daily),
inv AS (SELECT AVG(inv_total)::numeric AS avg_inv_value_30d FROM inv_daily),

rates AS (
  SELECT 365::numeric AS days_year, 30::numeric AS days_window
)

SELECT
  tw.as_of_ts,

  ROUND(s.revenue_30d, 2),
  s.orders_30d,

  ROUND(c.cogs_30d, 2),
  ROUND((s.revenue_30d - c.cogs_30d), 2),

  ROUND(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d,0)) * 100, 2),
  ROUND((c.cogs_30d / NULLIF(s.revenue_30d,0)) * 100, 2),

  ROUND(l.labor_30d, 2),
  ROUND((l.labor_30d / NULLIF(s.revenue_30d,0)) * 100, 2),

  ROUND(((c.cogs_30d + l.labor_30d) / NULLIF(s.revenue_30d,0)) * 100, 2),

  ROUND(f.fixed_costs_30d, 2),
  ROUND(((s.revenue_30d - c.cogs_30d) / NULLIF(f.fixed_costs_30d,0)), 2),

  ROUND(
    f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d,0)), 0),
    2
  ),

  ROUND(
    (
      s.revenue_30d
      - (f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d,0)), 0))
    ) / NULLIF(s.revenue_30d,0) * 100,
    2
  ),

  -- DIH / AR / AP / CCC numeric-only
  ROUND((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year, 1),
  ROUND((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * rates.days_year / rates.days_window),0)) * rates.days_year, 1),
  ROUND((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year, 1),

  ROUND(
    (
      (inv.avg_inv_value_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year
      + (ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * rates.days_year / rates.days_window),0)) * rates.days_year
      - (ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year
    ),
    1
  ),

  ROUND((s.revenue_30d / NULLIF(s.orders_30d,0)), 2),

  ROUND((s.revenue_30d - c.cogs_30d - l.labor_30d - f.fixed_costs_30d), 2),

  ROUND(interest.interest_expense_30d, 2),

  CASE
    WHEN interest.interest_expense_30d = 0 THEN NULL
    ELSE ROUND((s.revenue_30d - c.cogs_30d - l.labor_30d - f.fixed_costs_30d) / NULLIF(interest.interest_expense_30d,0), 2)
  END

FROM tw
CROSS JOIN sales s
CROSS JOIN cogs c
CROSS JOIN labor l
CROSS JOIN fixed f
CROSS JOIN interest
CROSS JOIN ar
CROSS JOIN ap
CROSS JOIN inv
CROSS JOIN rates;
$$;


ALTER FUNCTION analytics.get_executive_kpis_all_locations(as_of_ts timestamp with time zone) OWNER TO neondb_owner;

--
-- Name: get_executive_kpis_by_location(timestamp with time zone); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_executive_kpis_by_location(as_of_ts timestamp with time zone) RETURNS TABLE(as_of_ts timestamp with time zone, location_id uuid, location_code text, location_name text, revenue_30d numeric, orders_30d bigint, cogs_30d numeric, gross_profit_30d numeric, gross_margin_pct numeric, food_cost_ratio_pct numeric, labor_cost_30d numeric, labor_cost_ratio_pct numeric, prime_cost_ratio_pct numeric, fixed_costs_30d numeric, fixed_cost_coverage_ratio numeric, break_even_revenue_30d numeric, safety_margin_pct numeric, days_inventory_on_hand numeric, ar_days numeric, ap_days numeric, cash_conversion_cycle_days numeric, avg_revenue_per_order numeric, ebit_30d numeric, interest_expense_30d numeric, interest_coverage_ratio numeric)
    LANGUAGE sql
    AS $$
WITH tw AS (
  SELECT
    as_of_ts AS as_of_ts,
    (as_of_ts - interval '30 days') AS start_ts,
    (as_of_ts::date - 30) AS start_date,
    (as_of_ts::date) AS end_date
),

sales AS (
  SELECT
    o.location_id,
    COUNT(*) AS orders_30d,
    COALESCE(SUM(o.gross_sales - o.discount),0)::numeric AS revenue_30d
  FROM restaurant.fact_order o
  JOIN tw ON TRUE
  WHERE o.order_ts >= tw.start_ts AND o.order_ts < tw.as_of_ts
  GROUP BY 1
),

cogs AS (
  SELECT
    o.location_id,
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs_30d
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN tw ON TRUE
  WHERE o.order_ts >= tw.start_ts AND o.order_ts < tw.as_of_ts
  GROUP BY 1
),

labor AS (
  SELECT
    location_id,
    COALESCE(SUM(hours_worked * hourly_rate),0)::numeric AS labor_30d
  FROM restaurant.fact_labor_shift ls
  JOIN tw ON TRUE
  WHERE ls.shift_date >= tw.start_date AND ls.shift_date < tw.end_date
  GROUP BY 1
),

fixed AS (
  SELECT
    location_id,
    COALESCE(SUM(amount),0)::numeric AS fixed_costs_30d
  FROM restaurant.fact_fixed_cost_daily f
  JOIN tw ON TRUE
  WHERE f.cost_date >= tw.start_date AND f.cost_date < tw.end_date
    AND f.cost_type = 'Fixed'
  GROUP BY 1
),

interest AS (
  SELECT
    location_id,
    COALESCE(SUM(amount),0)::numeric AS interest_expense_30d
  FROM restaurant.fact_fixed_cost_daily f
  JOIN tw ON TRUE
  WHERE f.cost_date >= tw.start_date AND f.cost_date < tw.end_date
    AND f.cost_type = 'Interest'
  GROUP BY 1
),

ar AS (
  SELECT
    location_id,
    AVG(ar_balance)::numeric AS avg_ar_balance_30d
  FROM restaurant.fact_ar_snapshot_daily a
  JOIN tw ON TRUE
  WHERE a.snapshot_date >= tw.start_date AND a.snapshot_date < tw.end_date
  GROUP BY 1
),

ap AS (
  SELECT
    location_id,
    AVG(ap_balance)::numeric AS avg_ap_balance_30d
  FROM restaurant.fact_ap_snapshot_daily p
  JOIN tw ON TRUE
  WHERE p.snapshot_date >= tw.start_date AND p.snapshot_date < tw.end_date
  GROUP BY 1
),

inv AS (
  SELECT
    location_id,
    AVG(inventory_value)::numeric AS avg_inv_value_30d
  FROM restaurant.fact_inventory_on_hand_daily i
  JOIN tw ON TRUE
  WHERE i.snapshot_date >= tw.start_date AND i.snapshot_date < tw.end_date
  GROUP BY 1
),

rates AS (
  -- numeric annualization factors (no floats)
  SELECT
    365::numeric AS days_year,
    30::numeric  AS days_window
)

SELECT
  tw.as_of_ts,
  dl.location_id,
  dl.location_code,
  dl.name AS location_name,

  ROUND(s.revenue_30d, 2) AS revenue_30d,
  s.orders_30d,

  ROUND(c.cogs_30d, 2) AS cogs_30d,
  ROUND((s.revenue_30d - c.cogs_30d), 2) AS gross_profit_30d,

  ROUND(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d,0)) * 100, 2) AS gross_margin_pct,
  ROUND((c.cogs_30d / NULLIF(s.revenue_30d,0)) * 100, 2) AS food_cost_ratio_pct,

  ROUND(l.labor_30d, 2) AS labor_cost_30d,
  ROUND((l.labor_30d / NULLIF(s.revenue_30d,0)) * 100, 2) AS labor_cost_ratio_pct,

  ROUND(((c.cogs_30d + l.labor_30d) / NULLIF(s.revenue_30d,0)) * 100, 2) AS prime_cost_ratio_pct,

  ROUND(f.fixed_costs_30d, 2) AS fixed_costs_30d,
  ROUND(((s.revenue_30d - c.cogs_30d) / NULLIF(f.fixed_costs_30d,0)), 2) AS fixed_cost_coverage_ratio,

  ROUND(
    f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d,0)), 0),
    2
  ) AS break_even_revenue_30d,

  ROUND(
    (
      s.revenue_30d
      - (f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d,0)), 0))
    ) / NULLIF(s.revenue_30d,0) * 100,
    2
  ) AS safety_margin_pct,

  -- DIH / AR / AP / CCC using numeric-only annualization
  ROUND(
    (inv.avg_inv_value_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year,
    1
  ) AS days_inventory_on_hand,

  ROUND(
    (ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * rates.days_year / rates.days_window),0)) * rates.days_year,
    1
  ) AS ar_days,

  ROUND(
    (ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year,
    1
  ) AS ap_days,

  ROUND(
    (
      (inv.avg_inv_value_30d / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year
      + (ar.avg_ar_balance_30d  / NULLIF((s.revenue_30d * rates.days_year / rates.days_window),0)) * rates.days_year
      - (ap.avg_ap_balance_30d  / NULLIF((c.cogs_30d * rates.days_year / rates.days_window),0)) * rates.days_year
    ),
    1
  ) AS cash_conversion_cycle_days,

  ROUND((s.revenue_30d / NULLIF(s.orders_30d,0)), 2) AS avg_revenue_per_order,

  ROUND((s.revenue_30d - c.cogs_30d - l.labor_30d - f.fixed_costs_30d), 2) AS ebit_30d,

  ROUND(COALESCE(i.interest_expense_30d,0), 2) AS interest_expense_30d,

  CASE
    WHEN COALESCE(i.interest_expense_30d,0) = 0 THEN NULL
    ELSE ROUND((s.revenue_30d - c.cogs_30d - l.labor_30d - f.fixed_costs_30d) / NULLIF(i.interest_expense_30d,0), 2)
  END AS interest_coverage_ratio

FROM tw
JOIN sales s ON TRUE
JOIN cogs c ON c.location_id = s.location_id
JOIN labor l ON l.location_id = s.location_id
JOIN fixed f ON f.location_id = s.location_id
LEFT JOIN interest i ON i.location_id = s.location_id
LEFT JOIN ar ON ar.location_id = s.location_id
LEFT JOIN ap ON ap.location_id = s.location_id
LEFT JOIN inv ON inv.location_id = s.location_id
JOIN restaurant.dim_location dl ON dl.location_id = s.location_id
CROSS JOIN rates
ORDER BY revenue_30d DESC;
$$;


ALTER FUNCTION analytics.get_executive_kpis_by_location(as_of_ts timestamp with time zone) OWNER TO neondb_owner;

--
-- Name: get_inventory_actions(timestamp with time zone, text, uuid, numeric, numeric, numeric); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_inventory_actions(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, target_dih_days numeric DEFAULT 60, warn_dih_days numeric DEFAULT 75, risk_dih_days numeric DEFAULT 100) RETURNS TABLE(action_id text, priority integer, owner text, title text, rationale text, expected_impact text)
    LANGUAGE sql
    AS $_$
WITH k AS (
  SELECT *
  FROM analytics.get_inventory_kpis(as_of_ts, window_code, p_location_id, target_dih_days)
),
a AS (
  SELECT *
  FROM analytics.get_inventory_alerts(as_of_ts, window_code, p_location_id, target_dih_days, warn_dih_days, risk_dih_days)
),
f AS (
  SELECT
    k.dih_days,
    k.excess_inventory_value,
    EXISTS (SELECT 1 FROM a WHERE alert_id='inv_dih' AND severity='risk')  AS dih_risk,
    EXISTS (SELECT 1 FROM a WHERE alert_id='inv_dih' AND severity='warn')  AS dih_warn,
    EXISTS (SELECT 1 FROM a WHERE alert_id='inv_excess_cash' AND severity='risk') AS excess_risk,
    EXISTS (SELECT 1 FROM a WHERE alert_id='inv_excess_cash' AND severity='warn') AS excess_warn
  FROM k
)
SELECT *
FROM (
  SELECT
    'inv_act_freeze_buys' AS action_id,
    1 AS priority,
    'Purchasing' AS owner,
    'Freeze or reduce POs on slow-moving categories (48 hours)' AS title,
    'DIH is materially above target; immediate PO controls prevent further cash lock-up.' AS rationale,
    ('Target: ' || target_dih_days || 'd. Current: ' || ROUND(f.dih_days,1) || 'd. Cash trapped: $' ||
     TO_CHAR(ROUND(f.excess_inventory_value,0),'FM999,999,999')) AS expected_impact
  FROM f
  WHERE f.dih_risk OR f.excess_risk

  UNION ALL

  SELECT
    'inv_act_promote_high_onhand',
    2,
    'Marketing / GM',
    'Run targeted promos to burn down high on-hand inventory',
    'Demand-shaping (bundles, features, LTOs) reduces on-hand without waste.',
    ('Aim to free $' || TO_CHAR(ROUND(f.excess_inventory_value,0),'FM999,999,999') ||
     ' over 2 cycles by accelerating sell-through.') AS expected_impact
  FROM f
  WHERE f.dih_risk OR f.dih_warn

  UNION ALL

  SELECT
    'inv_act_adjust_par',
    3,
    'Kitchen / Purchasing',
    'Reduce par levels and reorder points for the next 2 cycles',
    'High DIH indicates pars/MOQs are too high for current sales velocity.',
    ('Reduce average inventory by ~$' || TO_CHAR(ROUND(f.excess_inventory_value,0),'FM999,999,999') ||
     ' to approach ' || target_dih_days || 'd DIH.') AS expected_impact
  FROM f
  WHERE f.dih_risk OR f.dih_warn OR f.excess_warn OR f.excess_risk

  UNION ALL

  SELECT
    'inv_act_receiving_audit',
    4,
    'Kitchen',
    'Audit receiving for over-deliveries and mis-weights (weekly)',
    'Inventory bloat often comes from receiving variance and miscounts.',
    'Improves inventory accuracy; prevents silent accumulation and shrink.' AS expected_impact
  FROM f
  WHERE f.dih_risk OR f.excess_risk

  UNION ALL

  SELECT
    'inv_act_vendor_terms',
    5,
    'Owner / Finance',
    'Negotiate MOQs + delivery cadence; extend payment terms where possible',
    'Lower MOQs/cadence reduces required safety stock; terms improve working capital.',
    ('Lower required inventory buffer; improves CCC over 30–90 days. Potential cash freed: $' ||
     TO_CHAR(ROUND(f.excess_inventory_value,0),'FM999,999,999')) AS expected_impact
  FROM f
  WHERE f.excess_risk OR f.dih_risk
) x
ORDER BY priority;
$_$;


ALTER FUNCTION analytics.get_inventory_actions(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, target_dih_days numeric, warn_dih_days numeric, risk_dih_days numeric) OWNER TO neondb_owner;

--
-- Name: get_inventory_alerts(timestamp with time zone, text, uuid, numeric, numeric, numeric); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_inventory_alerts(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, target_dih_days numeric DEFAULT 60, warn_dih_days numeric DEFAULT 75, risk_dih_days numeric DEFAULT 100) RETURNS TABLE(alert_id text, severity text, title text, rationale text, metric_value numeric, unit text)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code)='7d'  THEN as_of_ts - interval '7 days'
      WHEN lower(window_code)='30d' THEN as_of_ts - interval '30 days'
      WHEN lower(window_code)='90d' THEN as_of_ts - interval '90 days'
      WHEN lower(window_code)='ytd' THEN date_trunc('year', as_of_ts)
      ELSE as_of_ts - interval '30 days'
    END AS start_ts
),
len AS (
  SELECT (end_ts - start_ts) AS win_len
  FROM w
),
k AS (
  SELECT *
  FROM analytics.get_inventory_kpis(as_of_ts, window_code, p_location_id, target_dih_days)
),
prev AS (
  SELECT *
  FROM analytics.get_inventory_kpis(
    as_of_ts - (SELECT win_len FROM len),
    window_code,
    p_location_id,
    target_dih_days
  )
),
delta AS (
  SELECT
    k.avg_inventory_value AS inv_now,
    prev.avg_inventory_value AS inv_prev,
    CASE
      WHEN prev.avg_inventory_value IS NULL OR prev.avg_inventory_value = 0 THEN NULL
      ELSE (k.avg_inventory_value - prev.avg_inventory_value)
           / prev.avg_inventory_value * 100
    END AS inv_delta_pct,
    k.dih_days,
    k.excess_inventory_value
  FROM k, prev
)
SELECT *
FROM (
  SELECT
    'inv_dih' AS alert_id,
    CASE
      WHEN d.dih_days >= risk_dih_days THEN 'risk'
      WHEN d.dih_days >= warn_dih_days THEN 'warn'
      ELSE 'good'
    END AS severity,
    'Inventory Days too high' AS title,
    'High DIH ties up cash and increases spoilage/obsolescence risk.' AS rationale,
    d.dih_days AS metric_value,
    'days' AS unit
  FROM delta d

  UNION ALL

  SELECT
    'inv_spike' AS alert_id,
    CASE
      -- ✅ suppress spike alert when previous inventory is too small (seed / missing history)
      WHEN d.inv_prev IS NULL OR d.inv_prev < 500 THEN 'good'
      WHEN d.inv_delta_pct IS NULL THEN 'good'
      WHEN d.inv_delta_pct >= 25 THEN 'risk'
      WHEN d.inv_delta_pct >= 12 THEN 'warn'
      ELSE 'good'
    END AS severity,
    'Inventory value spike' AS title,
    'Inventory increased vs previous window; review ordering.' AS rationale,
    COALESCE(ROUND(d.inv_delta_pct::numeric,2),0) AS metric_value,
    'pct' AS unit
  FROM delta d

  UNION ALL

  SELECT
    'inv_excess_cash' AS alert_id,
    CASE
      WHEN d.excess_inventory_value >= 5000 THEN 'risk'
      WHEN d.excess_inventory_value >= 1500 THEN 'warn'
      ELSE 'good'
    END AS severity,
    'Excess inventory cash trapped' AS title,
    'Inventory above target DIH; reduce buys or move slow movers.' AS rationale,
    d.excess_inventory_value AS metric_value,
    'usd' AS unit
  FROM delta d
) x
WHERE x.severity <> 'good'
ORDER BY
  CASE x.severity
    WHEN 'risk' THEN 1
    WHEN 'warn' THEN 2
    ELSE 3
  END,
  x.alert_id;
$$;


ALTER FUNCTION analytics.get_inventory_alerts(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, target_dih_days numeric, warn_dih_days numeric, risk_dih_days numeric) OWNER TO neondb_owner;

--
-- Name: get_inventory_category_mix(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_inventory_category_mix(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(category text, avg_on_hand_value numeric, pct_of_total numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts::date AS end_d,
    CASE
      WHEN lower(window_code)='7d'  THEN (as_of_ts::date - 7)
      WHEN lower(window_code)='30d' THEN (as_of_ts::date - 30)
      WHEN lower(window_code)='90d' THEN (as_of_ts::date - 90)
      WHEN lower(window_code)='ytd' THEN date_trunc('year', as_of_ts)::date
      ELSE (as_of_ts::date - 30)
    END AS start_d
),
base AS (
  SELECT
    mi.category,
    AVG(i.qty_on_hand * i.unit_cost)::numeric AS avg_val
  FROM restaurant.fact_inventory_item_on_hand_daily i
  JOIN restaurant.dim_menu_item mi ON mi.menu_item_id = i.menu_item_id
  JOIN w ON TRUE
  WHERE i.snapshot_date >= w.start_d
    AND i.snapshot_date <  w.end_d
    AND (p_location_id IS NULL OR i.location_id = p_location_id)
  GROUP BY 1
),
tot AS (
  SELECT SUM(avg_val)::numeric AS total FROM base
)
SELECT
  b.category,
  ROUND(b.avg_val,2) AS avg_on_hand_value,
  ROUND((b.avg_val / NULLIF(t.total,0) * 100)::numeric, 2) AS pct_of_total
FROM base b
CROSS JOIN tot t
ORDER BY avg_on_hand_value DESC;
$$;


ALTER FUNCTION analytics.get_inventory_category_mix(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_inventory_kpis(timestamp with time zone, text, uuid, numeric); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_inventory_kpis(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, target_dih_days numeric DEFAULT 60) RETURNS TABLE(as_of_ts timestamp with time zone, window_code text, start_ts timestamp with time zone, end_ts timestamp with time zone, avg_inventory_value numeric, cogs numeric, dih_days numeric, inventory_turns numeric, excess_inventory_value numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code)='7d'  THEN as_of_ts - interval '7 days'
      WHEN lower(window_code)='30d' THEN as_of_ts - interval '30 days'
      WHEN lower(window_code)='90d' THEN as_of_ts - interval '90 days'
      WHEN lower(window_code)='ytd' THEN date_trunc('year', as_of_ts)
      ELSE as_of_ts - interval '30 days'
    END AS start_ts
),
inv AS (
  SELECT
    COALESCE(AVG(i.inventory_value),0)::numeric AS avg_inv
  FROM restaurant.fact_inventory_on_hand_daily i
  JOIN w ON TRUE
  WHERE i.snapshot_date >= w.start_ts::date
    AND i.snapshot_date <  w.end_ts::date
    AND (p_location_id IS NULL OR i.location_id = p_location_id)
),
cogs AS (
  SELECT
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),
calc AS (
  SELECT
    (SELECT start_ts FROM w) AS start_ts,
    (SELECT end_ts FROM w) AS end_ts,
    inv.avg_inv,
    cogs.cogs,
    GREATEST(((SELECT end_ts FROM w)::date - (SELECT start_ts FROM w)::date)::numeric, 1) AS win_days
  FROM inv CROSS JOIN cogs
)
SELECT
  as_of_ts,
  lower(window_code) AS window_code,
  start_ts,
  end_ts,
  ROUND(avg_inv,2) AS avg_inventory_value,
  ROUND(cogs,2) AS cogs,
  ROUND((avg_inv / NULLIF(cogs / win_days,0))::numeric, 1) AS dih_days,
  ROUND((((cogs / win_days) * 365.0) / NULLIF(avg_inv,0))::numeric, 2) AS inventory_turns,
  ROUND(GREATEST(avg_inv - (target_dih_days * (cogs / win_days)), 0)::numeric, 2) AS excess_inventory_value
FROM calc;
$$;


ALTER FUNCTION analytics.get_inventory_kpis(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, target_dih_days numeric) OWNER TO neondb_owner;

--
-- Name: get_inventory_slow_movers(timestamp with time zone, text, uuid, integer); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_inventory_slow_movers(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10) RETURNS TABLE(menu_item_id uuid, item_name text, category text, avg_qty numeric, avg_unit_cost numeric, avg_on_hand_value numeric, sold_qty numeric, sold_revenue numeric, sell_through_pct numeric, slow_score numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN as_of_ts - interval '7 days'
      WHEN lower(window_code) = '30d' THEN as_of_ts - interval '30 days'
      WHEN lower(window_code) = '90d' THEN as_of_ts - interval '90 days'
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE as_of_ts - interval '30 days'
    END AS start_ts
),

inv AS (
  SELECT
    i.menu_item_id,
    AVG(i.qty_on_hand)::numeric AS avg_qty,
    AVG(i.unit_cost)::numeric AS avg_unit_cost,
    AVG(i.inventory_value)::numeric AS avg_on_hand_value
  FROM restaurant.fact_inventory_item_on_hand_daily i
  JOIN w ON TRUE
  WHERE i.snapshot_date >= w.start_ts::date
    AND i.snapshot_date <  w.end_ts::date
    AND (p_location_id IS NULL OR i.location_id = p_location_id)
  GROUP BY 1
),

sales AS (
  SELECT
    oi.menu_item_id,
    COALESCE(SUM(oi.qty), 0)::numeric AS sold_qty,
    COALESCE(SUM(oi.qty * oi.unit_price), 0)::numeric AS sold_revenue
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts
    AND o.order_ts <  w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
  GROUP BY 1
),

m AS (
  SELECT
    inv.menu_item_id,
    mi.name AS item_name,
    mi.category,
    inv.avg_qty,
    inv.avg_unit_cost,
    inv.avg_on_hand_value,
    COALESCE(s.sold_qty, 0) AS sold_qty,
    COALESCE(s.sold_revenue, 0) AS sold_revenue,

    -- ✅ Correct sell-through formula
    CASE
      WHEN (COALESCE(s.sold_qty,0) + inv.avg_qty) = 0 THEN NULL
      ELSE (
        COALESCE(s.sold_qty,0) /
        (COALESCE(s.sold_qty,0) + inv.avg_qty)
      ) * 100
    END AS sell_through_pct,

    -- Slow score: high value + low sell-through = worse
    (
      inv.avg_on_hand_value /
      NULLIF(COALESCE(s.sold_revenue,0) + 1, 0)
    )::numeric AS slow_score

  FROM inv
  JOIN restaurant.dim_menu_item mi
    ON mi.menu_item_id = inv.menu_item_id
  LEFT JOIN sales s
    ON s.menu_item_id = inv.menu_item_id
)

SELECT
  menu_item_id,
  item_name,
  category,
  ROUND(avg_qty, 2),
  ROUND(avg_unit_cost, 2),
  ROUND(avg_on_hand_value, 2),
  ROUND(sold_qty, 2),
  ROUND(sold_revenue, 2),
  CASE WHEN sell_through_pct IS NULL
       THEN NULL
       ELSE ROUND(sell_through_pct, 2)
  END,
  ROUND(slow_score, 4)
FROM m
WHERE avg_on_hand_value > 0
ORDER BY slow_score DESC, avg_on_hand_value DESC
LIMIT GREATEST(p_limit, 1);
$$;


ALTER FUNCTION analytics.get_inventory_slow_movers(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, p_limit integer) OWNER TO neondb_owner;

--
-- Name: get_inventory_top_onhand_items(timestamp with time zone, text, uuid, integer); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_inventory_top_onhand_items(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10) RETURNS TABLE(menu_item_id uuid, item_name text, category text, avg_qty numeric, avg_unit_cost numeric, avg_on_hand_value numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts::date AS end_d,
    CASE
      WHEN lower(window_code)='7d'  THEN (as_of_ts::date - 7)
      WHEN lower(window_code)='30d' THEN (as_of_ts::date - 30)
      WHEN lower(window_code)='90d' THEN (as_of_ts::date - 90)
      WHEN lower(window_code)='ytd' THEN date_trunc('year', as_of_ts)::date
      ELSE (as_of_ts::date - 30)
    END AS start_d
)
SELECT
  i.menu_item_id,
  mi.name AS item_name,
  mi.category,
  ROUND(AVG(i.qty_on_hand)::numeric, 2) AS avg_qty,
  ROUND(AVG(i.unit_cost)::numeric, 2) AS avg_unit_cost,
  ROUND(AVG((i.qty_on_hand * i.unit_cost))::numeric, 2) AS avg_on_hand_value
FROM restaurant.fact_inventory_item_on_hand_daily i
JOIN restaurant.dim_menu_item mi ON mi.menu_item_id = i.menu_item_id
JOIN w ON TRUE
WHERE i.snapshot_date >= w.start_d
  AND i.snapshot_date <  w.end_d
  AND (p_location_id IS NULL OR i.location_id = p_location_id)
GROUP BY 1,2,3
ORDER BY avg_on_hand_value DESC
LIMIT p_limit;
$$;


ALTER FUNCTION analytics.get_inventory_top_onhand_items(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, p_limit integer) OWNER TO neondb_owner;

--
-- Name: get_ops_kpis_delta(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_ops_kpis_delta(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(as_of_ts timestamp with time zone, window_code text, start_ts timestamp with time zone, end_ts timestamp with time zone, prev_start_ts timestamp with time zone, prev_end_ts timestamp with time zone, revenue numeric, labor_cost numeric, labor_hours numeric, avg_hourly_rate numeric, labor_cost_ratio_pct numeric, sales_per_labor_hour numeric, avg_inventory_value numeric, dih_days numeric, inventory_turns numeric, ar_days numeric, ap_days numeric, ccc_days numeric, labor_cost_delta_pct numeric, labor_hours_delta_pct numeric, labor_ratio_delta_pp numeric, sales_per_labor_hour_delta_pct numeric, avg_inventory_delta_pct numeric, dih_delta_pct numeric, inv_turns_delta_pct numeric, ccc_delta_days numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts,
    CASE
      WHEN lower(window_code) IN ('7d','30d','90d','ytd') THEN lower(window_code)
      ELSE '30d'
    END AS win
),
lens AS (
  SELECT w.*, (w.end_ts - w.start_ts) AS win_len
  FROM w
),
r AS (
  SELECT
    as_of_ts,
    win AS window_code,
    start_ts,
    end_ts,
    (start_ts - win_len) AS prev_start_ts,
    start_ts AS prev_end_ts,
    GREATEST((end_ts::date - start_ts::date)::int, 1) AS win_days
  FROM lens
),

-- ✅ Revenue comes from Sales KPI function (single source of truth)
rev_cur AS (
  SELECT COALESCE(s.revenue,0)::numeric AS revenue
  FROM analytics.get_sales_kpis(as_of_ts, window_code, p_location_id) s
),
rev_prev AS (
  SELECT COALESCE(s.revenue,0)::numeric AS revenue
  FROM analytics.get_sales_kpis((SELECT prev_end_ts FROM r), window_code, p_location_id) s
),

-- COGS still from order items (or later, from a proper COGS fact)
cogs_cur AS (
  SELECT COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN r ON TRUE
  WHERE o.order_ts >= r.start_ts AND o.order_ts < r.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),
cogs_prev AS (
  SELECT COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN r ON TRUE
  WHERE o.order_ts >= r.prev_start_ts AND o.order_ts < r.prev_end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),

labor_cur AS (
  SELECT
    COALESCE(SUM(ls.hours_worked * ls.hourly_rate),0)::numeric AS labor_cost,
    COALESCE(SUM(ls.hours_worked),0)::numeric AS labor_hours
  FROM restaurant.fact_labor_shift ls
  JOIN r ON TRUE
  WHERE ls.shift_date >= r.start_ts::date
    AND ls.shift_date <  r.end_ts::date
    AND (p_location_id IS NULL OR ls.location_id = p_location_id)
),
labor_prev AS (
  SELECT
    COALESCE(SUM(ls.hours_worked * ls.hourly_rate),0)::numeric AS labor_cost,
    COALESCE(SUM(ls.hours_worked),0)::numeric AS labor_hours
  FROM restaurant.fact_labor_shift ls
  JOIN r ON TRUE
  WHERE ls.shift_date >= r.prev_start_ts::date
    AND ls.shift_date <  r.prev_end_ts::date
    AND (p_location_id IS NULL OR ls.location_id = p_location_id)
),

inv_cur AS (
  SELECT COALESCE(AVG(i.inventory_value),0)::numeric AS inv
  FROM restaurant.fact_inventory_on_hand_daily i
  JOIN r ON TRUE
  WHERE i.snapshot_date >= r.start_ts::date
    AND i.snapshot_date <  r.end_ts::date
    AND (p_location_id IS NULL OR i.location_id = p_location_id)
),
inv_prev AS (
  SELECT COALESCE(AVG(i.inventory_value),0)::numeric AS inv
  FROM restaurant.fact_inventory_on_hand_daily i
  JOIN r ON TRUE
  WHERE i.snapshot_date >= r.prev_start_ts::date
    AND i.snapshot_date <  r.prev_end_ts::date
    AND (p_location_id IS NULL OR i.location_id = p_location_id)
),

ar_cur AS (
  SELECT COALESCE(AVG(a.ar_balance),0)::numeric AS ar_bal
  FROM restaurant.fact_ar_snapshot_daily a
  JOIN r ON TRUE
  WHERE a.snapshot_date >= r.start_ts::date
    AND a.snapshot_date <  r.end_ts::date
    AND (p_location_id IS NULL OR a.location_id = p_location_id)
),
ap_cur AS (
  SELECT COALESCE(AVG(p.ap_balance),0)::numeric AS ap_bal
  FROM restaurant.fact_ap_snapshot_daily p
  JOIN r ON TRUE
  WHERE p.snapshot_date >= r.start_ts::date
    AND p.snapshot_date <  r.end_ts::date
    AND (p_location_id IS NULL OR p.location_id = p_location_id)
),
ar_prev AS (
  SELECT COALESCE(AVG(a.ar_balance),0)::numeric AS ar_bal
  FROM restaurant.fact_ar_snapshot_daily a
  JOIN r ON TRUE
  WHERE a.snapshot_date >= r.prev_start_ts::date
    AND a.snapshot_date <  r.prev_end_ts::date
    AND (p_location_id IS NULL OR a.location_id = p_location_id)
),
ap_prev AS (
  SELECT COALESCE(AVG(p.ap_balance),0)::numeric AS ap_bal
  FROM restaurant.fact_ap_snapshot_daily p
  JOIN r ON TRUE
  WHERE p.snapshot_date >= r.prev_start_ts::date
    AND p.snapshot_date <  r.prev_end_ts::date
    AND (p_location_id IS NULL OR p.location_id = p_location_id)
),

m AS (
  SELECT
    r.*,
    rc.revenue AS revenue_cur,
    rp.revenue AS revenue_prev,
    cc.cogs AS cogs_cur,
    cp.cogs AS cogs_prev,
    lc.labor_cost AS labor_cost_cur,
    lc.labor_hours AS labor_hours_cur,
    lp.labor_cost AS labor_cost_prev,
    lp.labor_hours AS labor_hours_prev,
    ic.inv AS inv_cur,
    ip.inv AS inv_prev,
    arc.ar_bal AS ar_cur,
    apc.ap_bal AS ap_cur,
    arp.ar_bal AS ar_prev,
    app.ap_bal AS ap_prev
  FROM r
  CROSS JOIN rev_cur rc
  CROSS JOIN rev_prev rp
  CROSS JOIN cogs_cur cc
  CROSS JOIN cogs_prev cp
  CROSS JOIN labor_cur lc
  CROSS JOIN labor_prev lp
  CROSS JOIN inv_cur ic
  CROSS JOIN inv_prev ip
  CROSS JOIN ar_cur arc
  CROSS JOIN ap_cur apc
  CROSS JOIN ar_prev arp
  CROSS JOIN ap_prev app
),
calc AS (
  SELECT
    m.*,
    (m.revenue_cur / m.win_days)::numeric AS daily_rev_cur,
    (m.cogs_cur    / m.win_days)::numeric AS daily_cogs_cur,
    (m.revenue_prev / m.win_days)::numeric AS daily_rev_prev,
    (m.cogs_prev    / m.win_days)::numeric AS daily_cogs_prev
  FROM m
),
out AS (
  SELECT
    as_of_ts, window_code, start_ts, end_ts, prev_start_ts, prev_end_ts,

    revenue_cur AS revenue,

    labor_cost_cur AS labor_cost,
    labor_hours_cur AS labor_hours,
    (labor_cost_cur / NULLIF(labor_hours_cur,0))::numeric AS avg_hourly_rate,
    (labor_cost_cur / NULLIF(revenue_cur,0) * 100)::numeric AS labor_cost_ratio_pct,
    (revenue_cur / NULLIF(labor_hours_cur,0))::numeric AS sales_per_labor_hour,

    inv_cur AS avg_inventory_value,
    (inv_cur / NULLIF(daily_cogs_cur,0))::numeric AS dih_days,
    ((cogs_cur / win_days * 365.0) / NULLIF(inv_cur,0))::numeric AS inventory_turns,

    (ar_cur / NULLIF(daily_rev_cur,0))::numeric AS ar_days,
    (ap_cur / NULLIF(daily_cogs_cur,0))::numeric AS ap_days,
    ( (inv_cur / NULLIF(daily_cogs_cur,0)) + (ar_cur / NULLIF(daily_rev_cur,0)) - (ap_cur / NULLIF(daily_cogs_cur,0)) )::numeric AS ccc_days,

    labor_cost_prev,
    labor_hours_prev,
    inv_prev,
    (labor_cost_prev / NULLIF(revenue_prev,0) * 100)::numeric AS labor_ratio_prev_pct,
    (revenue_prev / NULLIF(labor_hours_prev,0))::numeric AS sales_per_labor_hour_prev,
    (inv_prev / NULLIF(daily_cogs_prev,0))::numeric AS dih_prev,
    ((cogs_prev / win_days * 365.0) / NULLIF(inv_prev,0))::numeric AS inv_turns_prev,
    ( (inv_prev / NULLIF(daily_cogs_prev,0)) + (ar_prev / NULLIF(daily_rev_prev,0)) - (ap_prev / NULLIF(daily_cogs_prev,0)) )::numeric AS ccc_prev
  FROM calc
)
SELECT
  as_of_ts, window_code, start_ts, end_ts, prev_start_ts, prev_end_ts,

  ROUND(revenue,2),

  ROUND(labor_cost,2),
  ROUND(labor_hours,2),
  ROUND(avg_hourly_rate,2),
  ROUND(labor_cost_ratio_pct,2),
  ROUND(sales_per_labor_hour,2),

  ROUND(avg_inventory_value,2),
  ROUND(dih_days,1),
  ROUND(inventory_turns,2),

  ROUND(ar_days,1),
  ROUND(ap_days,1),
  ROUND(ccc_days,1),

  ROUND(((labor_cost - labor_cost_prev) / NULLIF(labor_cost_prev,0) * 100)::numeric, 2),
  ROUND(((labor_hours - labor_hours_prev) / NULLIF(labor_hours_prev,0) * 100)::numeric, 2),
  ROUND((labor_cost_ratio_pct - labor_ratio_prev_pct)::numeric, 2),
  ROUND(((sales_per_labor_hour - sales_per_labor_hour_prev) / NULLIF(sales_per_labor_hour_prev,0) * 100)::numeric, 2),

  ROUND(((avg_inventory_value - inv_prev) / NULLIF(inv_prev,0) * 100)::numeric, 2),
  ROUND(((dih_days - dih_prev) / NULLIF(dih_prev,0) * 100)::numeric, 2),
  ROUND(((inventory_turns - inv_turns_prev) / NULLIF(inv_turns_prev,0) * 100)::numeric, 2),

  ROUND((ccc_days - ccc_prev)::numeric, 1)
FROM out;
$$;


ALTER FUNCTION analytics.get_ops_kpis_delta(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_ops_timeseries_daily(timestamp with time zone, text, text); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_ops_timeseries_daily(p_as_of_ts timestamp with time zone, p_window_code text, p_location_id text) RETURNS TABLE(day date, revenue numeric, labor_cost numeric, labor_hours numeric, overtime_hours numeric, waste_cost numeric, labor_cost_ratio_pct numeric, sales_per_labor_hour numeric, inventory_value numeric, cogs numeric)
    LANGUAGE sql STABLE
    AS $$
  WITH params AS (
    SELECT
      (p_as_of_ts AT TIME ZONE 'UTC')::date AS as_of_day,
      CASE lower(coalesce(p_window_code,'30d'))
        WHEN '7d'  THEN 7
        WHEN '30d' THEN 30
        WHEN '90d' THEN 90
        WHEN 'ytd' THEN 366
        ELSE 30
      END AS days_back,
      NULLIF(trim(coalesce(p_location_id,'')), '') AS loc
  ),
  spine AS (
    SELECT (p.as_of_day - (gs.i || ' days')::interval)::date AS day
    FROM params p
    CROSS JOIN generate_series(0, (SELECT days_back - 1 FROM params)) AS gs(i)
  ),
  src AS (
    SELECT
      r.day::date AS day,
      r.revenue::numeric AS revenue,
      r.cogs::numeric AS cogs,
      r.labor::numeric AS labor_cost,
      NULL::numeric AS labor_hours,       -- until client provides hours OR you add a timesheet table
      NULL::numeric AS overtime_hours,    -- until client provides OT hours OR you add a timesheet table
      NULL::numeric AS waste_cost,        -- until you add waste/spoilage source
      r.avg_inventory::numeric AS inventory_value
    FROM restaurant.raw_restaurant_daily r
    JOIN params p ON true
    WHERE r.day::date BETWEEN (p.as_of_day - ((p.days_back - 1) || ' days')::interval)::date AND p.as_of_day
      AND (p.loc IS NULL OR r.location_id = p.loc)
  )
  SELECT
    s.day,
    x.revenue,
    x.labor_cost,
    x.labor_hours,
    x.overtime_hours,
    x.waste_cost,
    CASE
      WHEN x.revenue IS NULL OR x.revenue <= 0 OR x.labor_cost IS NULL THEN NULL
      ELSE (x.labor_cost / x.revenue) * 100
    END AS labor_cost_ratio_pct,
    CASE
      WHEN x.revenue IS NULL OR x.revenue <= 0 OR x.labor_hours IS NULL OR x.labor_hours <= 0 THEN NULL
      ELSE (x.revenue / x.labor_hours)
    END AS sales_per_labor_hour,
    x.inventory_value,
    x.cogs
  FROM spine s
  LEFT JOIN src x USING (day)
  ORDER BY s.day;
$$;


ALTER FUNCTION analytics.get_ops_timeseries_daily(p_as_of_ts timestamp with time zone, p_window_code text, p_location_id text) OWNER TO neondb_owner;

--
-- Name: get_ops_timeseries_daily(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_ops_timeseries_daily(p_as_of_ts timestamp with time zone, p_window_code text, p_location_id uuid) RETURNS TABLE(day date, revenue numeric, labor_cost numeric, labor_hours numeric, overtime_hours numeric, waste_cost numeric, labor_cost_ratio_pct numeric, sales_per_labor_hour numeric, inventory_value numeric, cogs numeric)
    LANGUAGE sql STABLE
    AS $_$
WITH params AS (
  SELECT
    (p_as_of_ts AT TIME ZONE 'UTC')::date AS as_of_day,
    CASE
      WHEN lower(p_window_code) = '7d'  THEN ((p_as_of_ts AT TIME ZONE 'UTC')::date - 6)
      WHEN lower(p_window_code) = '30d' THEN ((p_as_of_ts AT TIME ZONE 'UTC')::date - 29)
      WHEN lower(p_window_code) = '90d' THEN ((p_as_of_ts AT TIME ZONE 'UTC')::date - 89)
      WHEN lower(p_window_code) = 'ytd' THEN date_trunc('year', (p_as_of_ts AT TIME ZONE 'UTC')::date)::date
      ELSE ((p_as_of_ts AT TIME ZONE 'UTC')::date - 29)
    END AS start_day
),
days AS (
  SELECT generate_series(p.start_day, p.as_of_day, interval '1 day')::date AS day
  FROM params p
),
base AS (
  SELECT
    d.day::date AS day,
    SUM(d.revenue)::numeric AS revenue,
    SUM(d.cogs)::numeric AS cogs,
    SUM(d.labor)::numeric AS labor_cost,
    SUM(d.avg_inventory)::numeric AS inventory_value
  FROM restaurant.raw_restaurant_daily d
  JOIN params p ON d.day BETWEEN p.start_day AND p.as_of_day
  WHERE (p_location_id IS NULL OR d.location_id = p_location_id::text)
  GROUP BY 1
),
discounts AS (
  SELECT
    (fo.order_ts AT TIME ZONE 'UTC')::date AS day,
    SUM(COALESCE(fo.discount, 0))::numeric AS waste_cost
  FROM restaurant.fact_order fo
  JOIN params p
    ON (fo.order_ts AT TIME ZONE 'UTC')::date BETWEEN p.start_day AND p.as_of_day
  WHERE (p_location_id IS NULL OR fo.location_id = p_location_id)
  GROUP BY 1
),
joined AS (
  SELECT
    d.day,
    COALESCE(b.revenue, 0) AS revenue,
    COALESCE(b.labor_cost, 0) AS labor_cost,
    COALESCE(x.waste_cost, 0) AS waste_cost,
    COALESCE(b.inventory_value, 0) AS inventory_value,
    COALESCE(b.cogs, 0) AS cogs
  FROM days d
  LEFT JOIN base b ON b.day = d.day
  LEFT JOIN discounts x ON x.day = d.day
)
SELECT
  j.day,
  j.revenue,
  j.labor_cost,

  -- B assumption: $20/hr blended
  CASE WHEN j.labor_cost > 0 THEN j.labor_cost / 20.0 END AS labor_hours,

  -- 10% overtime proxy
  CASE WHEN j.labor_cost > 0 THEN (j.labor_cost / 20.0) * 0.10 END AS overtime_hours,

  j.waste_cost,

  CASE WHEN j.revenue > 0 THEN (j.labor_cost / j.revenue) * 100 END AS labor_cost_ratio_pct,

  CASE WHEN j.labor_cost > 0 THEN j.revenue / (j.labor_cost / 20.0) END AS sales_per_labor_hour,

  j.inventory_value,
  j.cogs
FROM joined j
ORDER BY j.day;
$_$;


ALTER FUNCTION analytics.get_ops_timeseries_daily(p_as_of_ts timestamp with time zone, p_window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_sales_aov_histogram(timestamp with time zone, text, uuid, numeric, numeric); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_aov_histogram(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, bucket_size numeric DEFAULT 10, max_value numeric DEFAULT 200) RETURNS TABLE(bucket_from numeric, bucket_to numeric, orders bigint, share_pct numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts
),
base AS (
  SELECT
    GREATEST(0, (o.gross_sales - o.discount))::numeric AS net_value
  FROM restaurant.fact_order o
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),
b AS (
  SELECT
    LEAST(max_value, FLOOR(net_value / NULLIF(bucket_size,0)) * bucket_size) AS bucket_from
  FROM base
),
agg AS (
  SELECT
    bucket_from,
    (bucket_from + bucket_size) AS bucket_to,
    COUNT(*)::bigint AS orders
  FROM b
  GROUP BY 1,2
),
tot AS (
  SELECT COALESCE(SUM(orders),0)::numeric AS total_orders FROM agg
)
SELECT
  a.bucket_from,
  a.bucket_to,
  a.orders,
  ROUND((a.orders::numeric / NULLIF(t.total_orders,0) * 100), 2) AS share_pct
FROM agg a
CROSS JOIN tot t
ORDER BY a.bucket_from ASC;
$$;


ALTER FUNCTION analytics.get_sales_aov_histogram(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, bucket_size numeric, max_value numeric) OWNER TO neondb_owner;

--
-- Name: get_sales_category_mix(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_category_mix(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(category text, revenue numeric, qty numeric, orders bigint, revenue_share_pct numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts
),
base AS (
  SELECT
    COALESCE(mi.category, 'Uncategorized') AS category,
    SUM(oi.qty)::numeric AS qty,
    SUM(oi.qty * oi.unit_price)::numeric AS revenue,
    COUNT(DISTINCT o.order_id)::bigint AS orders
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN w ON TRUE
  LEFT JOIN restaurant.dim_menu_item mi
    ON mi.menu_item_id = oi.menu_item_id
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
  GROUP BY 1
),
tot AS (
  SELECT COALESCE(SUM(revenue),0)::numeric AS total_revenue
  FROM base
)
SELECT
  b.category,
  ROUND(b.revenue, 2) AS revenue,
  ROUND(b.qty, 2) AS qty,
  b.orders,
  ROUND((b.revenue / NULLIF(t.total_revenue,0) * 100)::numeric, 2) AS revenue_share_pct
FROM base b
CROSS JOIN tot t
ORDER BY b.revenue DESC;
$$;


ALTER FUNCTION analytics.get_sales_category_mix(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_sales_channel_mix(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_channel_mix(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(channel text, revenue numeric, orders bigint, revenue_share_pct numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts
),
base AS (
  SELECT
    COALESCE(NULLIF(o.channel,''),'Unknown') AS channel,
    COALESCE(SUM(o.gross_sales - o.discount),0)::numeric AS revenue,
    COUNT(*)::bigint AS orders
  FROM restaurant.fact_order o
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
  GROUP BY 1
),
tot AS (
  SELECT COALESCE(SUM(revenue),0)::numeric AS total_revenue FROM base
)
SELECT
  b.channel,
  ROUND(b.revenue,2) AS revenue,
  b.orders,
  ROUND((b.revenue / NULLIF(t.total_revenue,0) * 100)::numeric, 2) AS revenue_share_pct
FROM base b
CROSS JOIN tot t
ORDER BY b.revenue DESC;
$$;


ALTER FUNCTION analytics.get_sales_channel_mix(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_sales_kpis(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_kpis(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(as_of_ts timestamp with time zone, window_code text, start_ts timestamp with time zone, end_ts timestamp with time zone, revenue numeric, orders bigint, aov numeric, cogs numeric, gross_profit numeric, gross_margin_pct numeric, discount numeric, discount_rate_pct numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts,
    CASE
      WHEN lower(window_code) IN ('7d','30d','90d','ytd') THEN lower(window_code)
      ELSE '30d'
    END AS win
),

sales AS (
  SELECT
    COALESCE(SUM(o.gross_sales - o.discount),0)::numeric AS revenue,
    COALESCE(SUM(o.discount),0)::numeric AS discount,
    COUNT(*)::bigint AS orders
  FROM restaurant.fact_order o
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),

cogs AS (
  SELECT
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
)

SELECT
  as_of_ts,
  w.win AS window_code,
  w.start_ts,
  w.end_ts,

  ROUND(s.revenue, 2) AS revenue,
  s.orders,
  ROUND((s.revenue / NULLIF(s.orders,0))::numeric, 2) AS aov,

  ROUND(c.cogs, 2) AS cogs,
  ROUND((s.revenue - c.cogs), 2) AS gross_profit,
  ROUND(((s.revenue - c.cogs) / NULLIF(s.revenue,0) * 100)::numeric, 2) AS gross_margin_pct,

  ROUND(s.discount, 2) AS discount,
  ROUND((s.discount / NULLIF((s.revenue + s.discount),0) * 100)::numeric, 2) AS discount_rate_pct
FROM w
CROSS JOIN sales s
CROSS JOIN cogs c;
$$;


ALTER FUNCTION analytics.get_sales_kpis(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_sales_kpis_delta(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_kpis_delta(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(as_of_ts timestamp with time zone, window_code text, start_ts timestamp with time zone, end_ts timestamp with time zone, prev_start_ts timestamp with time zone, prev_end_ts timestamp with time zone, revenue numeric, orders bigint, aov numeric, gross_margin_pct numeric, discount_rate_pct numeric, revenue_prev numeric, orders_prev bigint, aov_prev numeric, gross_margin_pct_prev numeric, discount_rate_pct_prev numeric, revenue_delta numeric, revenue_delta_pct numeric, orders_delta bigint, orders_delta_pct numeric, aov_delta numeric, aov_delta_pct numeric, gross_margin_delta_pp numeric, discount_rate_delta_pp numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts,
    CASE
      WHEN lower(window_code) IN ('7d','30d','90d','ytd') THEN lower(window_code)
      ELSE '30d'
    END AS win
),
lens AS (
  SELECT
    w.*,
    (w.end_ts - w.start_ts) AS win_len
  FROM w
),
ranges AS (
  SELECT
    as_of_ts,
    win AS window_code,
    start_ts,
    end_ts,
    (start_ts - win_len) AS prev_start_ts,
    start_ts AS prev_end_ts
  FROM lens
),

cur_sales AS (
  SELECT
    COALESCE(SUM(o.gross_sales - o.discount),0)::numeric AS revenue,
    COALESCE(SUM(o.discount),0)::numeric AS discount,
    COUNT(*)::bigint AS orders
  FROM restaurant.fact_order o
  JOIN ranges r ON TRUE
  WHERE o.order_ts >= r.start_ts AND o.order_ts < r.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),
cur_cogs AS (
  SELECT
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN ranges r ON TRUE
  WHERE o.order_ts >= r.start_ts AND o.order_ts < r.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),

prev_sales AS (
  SELECT
    COALESCE(SUM(o.gross_sales - o.discount),0)::numeric AS revenue,
    COALESCE(SUM(o.discount),0)::numeric AS discount,
    COUNT(*)::bigint AS orders
  FROM restaurant.fact_order o
  JOIN ranges r ON TRUE
  WHERE o.order_ts >= r.prev_start_ts AND o.order_ts < r.prev_end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),
prev_cogs AS (
  SELECT
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN ranges r ON TRUE
  WHERE o.order_ts >= r.prev_start_ts AND o.order_ts < r.prev_end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
),

calc AS (
  SELECT
    r.as_of_ts,
    r.window_code,
    r.start_ts,
    r.end_ts,
    r.prev_start_ts,
    r.prev_end_ts,

    cs.revenue AS revenue,
    cs.orders  AS orders,
    (cs.revenue / NULLIF(cs.orders,0))::numeric AS aov,
    ((cs.revenue - cc.cogs) / NULLIF(cs.revenue,0) * 100)::numeric AS gross_margin_pct,
    (cs.discount / NULLIF((cs.revenue + cs.discount),0) * 100)::numeric AS discount_rate_pct,

    ps.revenue AS revenue_prev,
    ps.orders  AS orders_prev,
    (ps.revenue / NULLIF(ps.orders,0))::numeric AS aov_prev,
    ((ps.revenue - pc.cogs) / NULLIF(ps.revenue,0) * 100)::numeric AS gross_margin_pct_prev,
    (ps.discount / NULLIF((ps.revenue + ps.discount),0) * 100)::numeric AS discount_rate_pct_prev
  FROM ranges r
  CROSS JOIN cur_sales cs
  CROSS JOIN cur_cogs cc
  CROSS JOIN prev_sales ps
  CROSS JOIN prev_cogs pc
),

guard AS (
  SELECT
    *,
    -- ✅ baseline requirement: you can tune this
    CASE WHEN orders_prev >= 50 THEN TRUE ELSE FALSE END AS has_baseline
  FROM calc
)

SELECT
  as_of_ts,
  window_code,
  start_ts,
  end_ts,
  prev_start_ts,
  prev_end_ts,

  ROUND(revenue, 2) AS revenue,
  orders,
  ROUND(aov, 2) AS aov,
  ROUND(gross_margin_pct, 2) AS gross_margin_pct,
  ROUND(discount_rate_pct, 2) AS discount_rate_pct,

  ROUND(revenue_prev, 2) AS revenue_prev,
  orders_prev,
  ROUND(aov_prev, 2) AS aov_prev,
  ROUND(gross_margin_pct_prev, 2) AS gross_margin_pct_prev,
  ROUND(discount_rate_pct_prev, 2) AS discount_rate_pct_prev,

  CASE WHEN has_baseline THEN ROUND((revenue - revenue_prev), 2) ELSE NULL END AS revenue_delta,
  CASE WHEN has_baseline THEN ROUND(((revenue - revenue_prev) / NULLIF(revenue_prev,0) * 100)::numeric, 2) ELSE NULL END AS revenue_delta_pct,

  CASE WHEN has_baseline THEN (orders - orders_prev) ELSE NULL END AS orders_delta,
  CASE WHEN has_baseline THEN ROUND(((orders - orders_prev)::numeric / NULLIF(orders_prev,0) * 100)::numeric, 2) ELSE NULL END AS orders_delta_pct,

  CASE WHEN has_baseline THEN ROUND((aov - aov_prev), 2) ELSE NULL END AS aov_delta,
  CASE WHEN has_baseline THEN ROUND(((aov - aov_prev) / NULLIF(aov_prev,0) * 100)::numeric, 2) ELSE NULL END AS aov_delta_pct,

  CASE WHEN has_baseline THEN ROUND((gross_margin_pct - gross_margin_pct_prev), 2) ELSE NULL END AS gross_margin_delta_pp,
  CASE WHEN has_baseline THEN ROUND((discount_rate_pct - discount_rate_pct_prev), 2) ELSE NULL END AS discount_rate_delta_pp
FROM guard;
$$;


ALTER FUNCTION analytics.get_sales_kpis_delta(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_sales_timeseries_daily(timestamp with time zone, text, uuid); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_timeseries_daily(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid) RETURNS TABLE(day date, revenue numeric, orders bigint, aov numeric, cogs numeric, gross_margin_pct numeric, discount numeric, discount_rate_pct numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts,
    CASE
      WHEN lower(window_code) IN ('7d','30d','90d','ytd') THEN lower(window_code)
      ELSE '30d'
    END AS win
),

days AS (
  SELECT generate_series(w.start_ts::date, (w.end_ts::date - 1), interval '1 day')::date AS day
  FROM w
),

orders_by_day AS (
  SELECT
    o.order_ts::date AS day,
    COUNT(*)::bigint AS orders,
    COALESCE(SUM(o.gross_sales - o.discount),0)::numeric AS revenue,
    COALESCE(SUM(o.discount),0)::numeric AS discount
  FROM restaurant.fact_order o
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
  GROUP BY 1
),

cogs_by_day AS (
  SELECT
    o.order_ts::date AS day,
    COALESCE(SUM(oi.qty * oi.unit_cost),0)::numeric AS cogs
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
  GROUP BY 1
)

SELECT
  d.day,
  ROUND(COALESCE(obd.revenue,0), 2) AS revenue,
  COALESCE(obd.orders,0) AS orders,
  ROUND((COALESCE(obd.revenue,0) / NULLIF(COALESCE(obd.orders,0),0))::numeric, 2) AS aov,
  ROUND(COALESCE(cbd.cogs,0), 2) AS cogs,
  ROUND(((COALESCE(obd.revenue,0) - COALESCE(cbd.cogs,0)) / NULLIF(COALESCE(obd.revenue,0),0) * 100)::numeric, 2) AS gross_margin_pct,
  ROUND(COALESCE(obd.discount,0), 2) AS discount,
  ROUND((COALESCE(obd.discount,0) / NULLIF((COALESCE(obd.revenue,0) + COALESCE(obd.discount,0)),0) * 100)::numeric, 2) AS discount_rate_pct
FROM days d
LEFT JOIN orders_by_day obd ON obd.day = d.day
LEFT JOIN cogs_by_day cbd ON cbd.day = d.day
ORDER BY d.day;
$$;


ALTER FUNCTION analytics.get_sales_timeseries_daily(as_of_ts timestamp with time zone, window_code text, p_location_id uuid) OWNER TO neondb_owner;

--
-- Name: get_sales_top_items(timestamp with time zone, text, uuid, integer); Type: FUNCTION; Schema: analytics; Owner: neondb_owner
--

CREATE FUNCTION analytics.get_sales_top_items(as_of_ts timestamp with time zone, window_code text DEFAULT '30d'::text, p_location_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10) RETURNS TABLE(menu_item_id uuid, item_name text, category text, qty numeric, item_revenue numeric, orders bigint, revenue_share_pct numeric)
    LANGUAGE sql
    AS $$
WITH w AS (
  SELECT
    as_of_ts AS end_ts,
    CASE
      WHEN lower(window_code) = '7d'  THEN (as_of_ts - interval '7 days')
      WHEN lower(window_code) = '30d' THEN (as_of_ts - interval '30 days')
      WHEN lower(window_code) = '90d' THEN (as_of_ts - interval '90 days')
      WHEN lower(window_code) = 'ytd' THEN date_trunc('year', as_of_ts)
      ELSE (as_of_ts - interval '30 days')
    END AS start_ts
),
items AS (
  SELECT
    oi.menu_item_id,
    SUM(oi.qty)::numeric AS qty,
    SUM(oi.qty * oi.unit_price)::numeric AS item_revenue,
    COUNT(DISTINCT o.order_id)::bigint AS orders
  FROM restaurant.fact_order o
  JOIN restaurant.fact_order_item oi ON oi.order_id = o.order_id
  JOIN w ON TRUE
  WHERE o.order_ts >= w.start_ts AND o.order_ts < w.end_ts
    AND (p_location_id IS NULL OR o.location_id = p_location_id)
  GROUP BY 1
),
tot AS (
  SELECT COALESCE(SUM(item_revenue),0)::numeric AS total_item_revenue
  FROM items
)
SELECT
  it.menu_item_id,
  COALESCE(mi.name, it.menu_item_id::text) AS item_name,
  COALESCE(mi.category, 'Uncategorized') AS category,
  ROUND(it.qty, 2) AS qty,
  ROUND(it.item_revenue, 2) AS item_revenue,
  it.orders,
  ROUND((it.item_revenue / NULLIF(t.total_item_revenue,0) * 100)::numeric, 2) AS revenue_share_pct
FROM items it
CROSS JOIN tot t
LEFT JOIN restaurant.dim_menu_item mi
  ON mi.menu_item_id = it.menu_item_id
ORDER BY it.item_revenue DESC
LIMIT GREATEST(p_limit, 1);
$$;


ALTER FUNCTION analytics.get_sales_top_items(as_of_ts timestamp with time zone, window_code text, p_location_id uuid, p_limit integer) OWNER TO neondb_owner;

--
-- Name: finance_generate_live_txns(date, uuid, integer); Type: FUNCTION; Schema: app; Owner: neondb_owner
--

CREATE FUNCTION app.finance_generate_live_txns(p_as_of date, p_dataset uuid, p_rows integer DEFAULT 40) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_inserted int := 0;
    v_batch text;
BEGIN
    IF p_as_of IS NULL THEN
        RAISE EXCEPTION 'p_as_of cannot be null';
    END IF;

    IF p_dataset IS NULL THEN
        RAISE EXCEPTION 'p_dataset cannot be null';
    END IF;

    IF p_rows IS NULL OR p_rows <= 0 THEN
        RETURN 0;
    END IF;

    -- 15-min bucket (stable within a cron window, changes each 15 min)
    v_batch :=
            to_char(
                    date_trunc('hour', clock_timestamp())
                        + (floor(extract(minute from clock_timestamp()) / 15) * interval '15 minutes'),
                    'YYYYMMDDHH24MI'
            );

    WITH gen AS (
        SELECT
            p_dataset AS dataset_id,
            p_as_of   AS txn_date,
            gs.i      AS i
        FROM generate_series(1, p_rows) gs(i)
    ),
         rows_to_insert AS (
             SELECT
                 gen_random_uuid() AS row_id,
                 g.dataset_id,
                 -- ✅ txn_id now includes batch to avoid duplicates within same day
                 ('gen-' || to_char(g.txn_date, 'YYYYMMDD') || '-b' || v_batch || '-' || lpad(g.i::text, 4, '0')) AS txn_id,
                 g.txn_date,
                 (ARRAY['Operating - Chase','Operating - Stripe','Savings - Ally','Payroll - Gusto'])[1 + (abs(hashtext(v_batch || ':' || g.i::text)) % 4)] AS account,
                 (ARRAY['Software','Tools','Marketing','Payroll','Rent','Cloud','Fees','Travel','Refunds','Customers'])[1 + (abs(hashtext(v_batch || ':cat:' || g.i::text)) % 10)] AS category,
                 CASE WHEN (abs(hashtext(v_batch || ':dir:' || g.i::text)) % 100) < 55 THEN 'outflow' ELSE 'inflow' END AS direction,
                 round(
                         (20 + (abs(hashtext(v_batch || ':amt:' || g.i::text)) % 5000))::numeric
                     , 2) AS amount,
                 'USD'::text AS currency,
                 (ARRAY['Slack','Notion','AWS','GCP','Gusto','ADP','WeWork','Google Ads','Meta Ads','Customer A','Customer B','Customer C'])[1 + (abs(hashtext(v_batch || ':cp:' || g.i::text)) % 12)] AS counterparty,
                 ('[gen-live] batch ' || v_batch) AS memo,
                 now() AS created_at
             FROM gen g
         )
    INSERT INTO public.raw_finance_cashflow
    (row_id, dataset_id, txn_id, txn_date, account, category, direction, amount, currency, counterparty, memo, created_at)
    SELECT
        row_id, dataset_id, txn_id, txn_date, account, category, direction, amount, currency, counterparty, memo, created_at
    FROM rows_to_insert
    ON CONFLICT (dataset_id, txn_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;


ALTER FUNCTION app.finance_generate_live_txns(p_as_of date, p_dataset uuid, p_rows integer) OWNER TO neondb_owner;

--
-- Name: job_heartbeat_touch(text, text, text); Type: FUNCTION; Schema: app; Owner: neondb_owner
--

CREATE FUNCTION app.job_heartbeat_touch(p_job_key text, p_status text, p_message text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO app.job_heartbeat (job_key, last_run_at, last_ok_at, last_status, last_message, updated_at)
  VALUES (
    p_job_key,
    now(),
    CASE WHEN p_status IN ('ok','warn','risk') THEN now() ELSE NULL END,
    p_status,
    p_message,
    now()
  )
  ON CONFLICT (job_key) DO UPDATE SET
    last_run_at  = EXCLUDED.last_run_at,
    last_ok_at   = COALESCE(EXCLUDED.last_ok_at, app.job_heartbeat.last_ok_at),
    last_status  = EXCLUDED.last_status,
    last_message = EXCLUDED.last_message,
    updated_at   = now();
END;
$$;


ALTER FUNCTION app.job_heartbeat_touch(p_job_key text, p_status text, p_message text) OWNER TO neondb_owner;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: auth; Owner: neondb_owner
--

CREATE FUNCTION auth.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION auth.touch_updated_at() OWNER TO neondb_owner;

--
-- Name: ensure_inventory_movement_partition(date); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.ensure_inventory_movement_partition(p_date date) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
  start_date date;
  end_date date;
  part_name text;
BEGIN
  start_date := date_trunc('month', p_date)::date;
  end_date   := (start_date + interval '1 month')::date;
  part_name  := format('inventory_movement_%s', to_char(start_date, 'YYYY_MM'));

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS %I
    PARTITION OF inventory_movement
    FOR VALUES FROM (%L) TO (%L);
  $f$, part_name, start_date, end_date);

  -- Partition-local indexes
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (location_id, business_date);',
                 part_name||'_loc_date', part_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (product_id, business_date);',
                 part_name||'_prod_date', part_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (movement_type, occurred_at DESC);',
                 part_name||'_type_time', part_name);
END $_$;


ALTER FUNCTION public.ensure_inventory_movement_partition(p_date date) OWNER TO neondb_owner;

--
-- Name: ensure_pos_line_item_partition(date); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.ensure_pos_line_item_partition(p_date date) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
  start_date date;
  end_date date;
  part_name text;
BEGIN
  start_date := date_trunc('month', p_date)::date;
  end_date   := (start_date + interval '1 month')::date;
  part_name  := format('pos_line_item_%s', to_char(start_date, 'YYYY_MM'));

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS %I
    PARTITION OF pos_line_item
    FOR VALUES FROM (%L) TO (%L);
  $f$, part_name, start_date, end_date);

  -- Partition-local indexes (critical at scale)
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (check_id);', part_name||'_check', part_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (location_id, business_date);', part_name||'_loc_date', part_name);
END $_$;


ALTER FUNCTION public.ensure_pos_line_item_partition(p_date date) OWNER TO neondb_owner;

--
-- Name: inventory_movement_partition_trigger(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.inventory_movement_partition_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM ensure_inventory_movement_partition(NEW.business_date);
  RETURN NEW;
END $$;


ALTER FUNCTION public.inventory_movement_partition_trigger() OWNER TO neondb_owner;

--
-- Name: pos_line_item_partition_trigger(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.pos_line_item_partition_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM ensure_pos_line_item_partition(NEW.business_date);
  RETURN NEW;
END $$;


ALTER FUNCTION public.pos_line_item_partition_trigger() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ecommerce_orders; Type: TABLE; Schema: CSV_ecommerce; Owner: neondb_owner
--

CREATE TABLE "CSV_ecommerce".ecommerce_orders (
    order_id text,
    order_date date,
    customer_id text,
    revenue numeric(8,3),
    product_id text,
    currency text,
    status text,
    sku text,
    item_price numeric,
    discount_amount numeric,
    shipping_amount numeric,
    tax_amount numeric,
    order_total numeric
);


ALTER TABLE "CSV_ecommerce".ecommerce_orders OWNER TO neondb_owner;

--
-- Name: finance_cashflow; Type: TABLE; Schema: CSV_finance; Owner: neondb_owner
--

CREATE TABLE "CSV_finance".finance_cashflow (
    txn_id text,
    txn_date date,
    "amount " numeric,
    category text,
    currency text,
    account text,
    counterparty text
);


ALTER TABLE "CSV_finance".finance_cashflow OWNER TO neondb_owner;

--
-- Name: healthcare_claims; Type: TABLE; Schema: CSV_healthcare; Owner: neondb_owner
--

CREATE TABLE "CSV_healthcare".healthcare_claims (
    claim_id text,
    service_date date,
    patient_id text,
    provider_id text,
    charged_amount numeric,
    paid_amount numeric,
    claim_status text,
    denial_flag boolean,
    denial_reason text,
    cpt_code text
);


ALTER TABLE "CSV_healthcare".healthcare_claims OWNER TO neondb_owner;

--
-- Name: insurance_claims; Type: TABLE; Schema: CSV_insurance; Owner: neondb_owner
--

CREATE TABLE "CSV_insurance".insurance_claims (
    claim_id text,
    loss_date date,
    policy_id text,
    claim_amount numeric,
    claim_status text,
    currency text,
    premium_earned numeric,
    fraud_flag boolean,
    line_of_business text
);


ALTER TABLE "CSV_insurance".insurance_claims OWNER TO neondb_owner;

--
-- Name: saas_events; Type: TABLE; Schema: CSV_saas; Owner: neondb_owner
--

CREATE TABLE "CSV_saas".saas_events (
    event_id text,
    event_time timestamp with time zone,
    customer_id text,
    event_type text,
    mrr_delta numeric,
    currency text,
    plan text,
    source text
);


ALTER TABLE "CSV_saas".saas_events OWNER TO neondb_owner;

--
-- Name: supply_shipments; Type: TABLE; Schema: CSV_supplychain; Owner: neondb_owner
--

CREATE TABLE "CSV_supplychain".supply_shipments (
    shipment_id text,
    ship_date date,
    expected_delivery_date date,
    actual_delivery_date date,
    status text,
    sku text,
    destination text
);


ALTER TABLE "CSV_supplychain".supply_shipments OWNER TO neondb_owner;

--
-- Name: dim_account; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.dim_account (
    account_id bigint NOT NULL,
    account_code text NOT NULL,
    account_name text NOT NULL,
    account_type text NOT NULL,
    statement_group text NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    CONSTRAINT dim_account_account_type_check CHECK ((account_type = ANY (ARRAY['ASSET'::text, 'LIABILITY'::text, 'EQUITY'::text, 'REVENUE'::text, 'EXPENSE'::text])))
);


ALTER TABLE core.dim_account OWNER TO neondb_owner;

--
-- Name: dim_date; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.dim_date (
    date_key integer NOT NULL,
    date date NOT NULL,
    month_start date NOT NULL,
    quarter_start date NOT NULL,
    year_start date NOT NULL,
    year_part integer,
    quarter_part integer,
    month_part integer,
    day_part integer,
    day_of_week_iso integer NOT NULL,
    day_name text,
    is_weekend boolean NOT NULL,
    iso_year integer NOT NULL,
    iso_week integer NOT NULL,
    iso_week_start date NOT NULL,
    fiscal_year integer NOT NULL,
    fiscal_quarter integer NOT NULL,
    fiscal_month integer NOT NULL,
    fiscal_year_start date NOT NULL,
    fiscal_quarter_start date NOT NULL
);


ALTER TABLE core.dim_date OWNER TO neondb_owner;

--
-- Name: fact_ap_snapshot; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.fact_ap_snapshot (
    date_key integer NOT NULL,
    entity_id bigint NOT NULL,
    ap_balance numeric(18,2) NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL
);


ALTER TABLE core.fact_ap_snapshot OWNER TO neondb_owner;

--
-- Name: fact_ar_snapshot; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.fact_ar_snapshot (
    date_key integer NOT NULL,
    entity_id bigint NOT NULL,
    ar_balance numeric(18,2) NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL
);


ALTER TABLE core.fact_ar_snapshot OWNER TO neondb_owner;

--
-- Name: fact_cash_txn; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.fact_cash_txn (
    cash_txn_id bigint NOT NULL,
    date_key integer NOT NULL,
    entity_id bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    direction text NOT NULL,
    category text NOT NULL,
    subcategory text,
    counterparty text,
    source_doc_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_cash_txn_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT fact_cash_txn_category_check CHECK ((category = ANY (ARRAY['OPERATING'::text, 'INVESTING'::text, 'FINANCING'::text]))),
    CONSTRAINT fact_cash_txn_direction_check CHECK ((direction = ANY (ARRAY['IN'::text, 'OUT'::text])))
);


ALTER TABLE core.fact_cash_txn OWNER TO neondb_owner;

--
-- Name: fact_gl_activity; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.fact_gl_activity (
    activity_id bigint NOT NULL,
    date_key integer NOT NULL,
    entity_id bigint NOT NULL,
    account_id bigint NOT NULL,
    amount numeric(18,2) NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    source_system text,
    source_doc_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE core.fact_gl_activity OWNER TO neondb_owner;

--
-- Name: fact_gl_balance; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.fact_gl_balance (
    balance_id bigint NOT NULL,
    date_key integer NOT NULL,
    entity_id bigint NOT NULL,
    account_id bigint NOT NULL,
    ending_balance numeric(18,2) NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    source_system text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE core.fact_gl_balance OWNER TO neondb_owner;

--
-- Name: fact_inventory_snapshot; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.fact_inventory_snapshot (
    date_key integer NOT NULL,
    entity_id bigint NOT NULL,
    inventory_balance numeric(18,2) NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL
);


ALTER TABLE core.fact_inventory_snapshot OWNER TO neondb_owner;

--
-- Name: v_month_end_balances; Type: VIEW; Schema: core; Owner: neondb_owner
--

CREATE VIEW core.v_month_end_balances AS
 WITH month_ends AS (
         SELECT dim_date.month_start,
            max(dim_date.date_key) AS month_end_date_key
           FROM core.dim_date
          GROUP BY dim_date.month_start
        ), bal AS (
         SELECT d.month_start AS month_start_date,
            b.entity_id,
            acc.statement_group,
            sum(b.ending_balance) AS ending_balance
           FROM (((core.fact_gl_balance b
             JOIN month_ends me ON ((me.month_end_date_key = b.date_key)))
             JOIN core.dim_date d ON ((d.date_key = b.date_key)))
             JOIN core.dim_account acc ON ((acc.account_id = b.account_id)))
          GROUP BY d.month_start, b.entity_id, acc.statement_group
        )
 SELECT month_start_date,
    entity_id,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'CASH'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS cash_end,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'AR'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS ar_end,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'AP'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS ap_end,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'INVENTORY'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS inv_end,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'DEBT'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS debt_end,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'EQUITY'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS equity_end,
    ((COALESCE(sum(
        CASE
            WHEN (statement_group = 'CASH'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) + COALESCE(sum(
        CASE
            WHEN (statement_group = 'AR'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric)) + COALESCE(sum(
        CASE
            WHEN (statement_group = 'INVENTORY'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric)) AS current_assets_end,
    COALESCE(sum(
        CASE
            WHEN (statement_group = 'AP'::text) THEN ending_balance
            ELSE NULL::numeric
        END), (0)::numeric) AS current_liabilities_end
   FROM bal
  GROUP BY month_start_date, entity_id;


ALTER VIEW core.v_month_end_balances OWNER TO neondb_owner;

--
-- Name: v_monthly_ap_averages; Type: VIEW; Schema: core; Owner: neondb_owner
--

CREATE VIEW core.v_monthly_ap_averages AS
 SELECT d.month_start AS month_start_date,
    s.entity_id,
    avg(s.ap_balance) AS ap_avg
   FROM (core.fact_ap_snapshot s
     JOIN core.dim_date d ON ((d.date_key = s.date_key)))
  GROUP BY d.month_start, s.entity_id;


ALTER VIEW core.v_monthly_ap_averages OWNER TO neondb_owner;

--
-- Name: v_monthly_cash; Type: VIEW; Schema: core; Owner: neondb_owner
--

CREATE VIEW core.v_monthly_cash AS
 WITH base AS (
         SELECT d.month_start AS month_start_date,
            c.entity_id,
            c.category,
            c.subcategory,
            sum(
                CASE
                    WHEN (c.direction = 'IN'::text) THEN c.amount
                    ELSE (0)::numeric
                END) AS cash_in,
            sum(
                CASE
                    WHEN (c.direction = 'OUT'::text) THEN c.amount
                    ELSE (0)::numeric
                END) AS cash_out
           FROM (core.fact_cash_txn c
             JOIN core.dim_date d ON ((d.date_key = c.date_key)))
          GROUP BY d.month_start, c.entity_id, c.category, c.subcategory
        ), agg AS (
         SELECT base.month_start_date,
            base.entity_id,
            sum(base.cash_in) AS cash_in_total,
            sum(base.cash_out) AS cash_out_total,
            sum(
                CASE
                    WHEN (base.category = 'OPERATING'::text) THEN (base.cash_in - base.cash_out)
                    ELSE (0)::numeric
                END) AS cf_operating_net,
            sum(
                CASE
                    WHEN (base.category = 'INVESTING'::text) THEN (base.cash_in - base.cash_out)
                    ELSE (0)::numeric
                END) AS cf_investing_net,
            sum(
                CASE
                    WHEN (base.category = 'FINANCING'::text) THEN (base.cash_in - base.cash_out)
                    ELSE (0)::numeric
                END) AS cf_financing_net,
            sum(
                CASE
                    WHEN ((base.category = 'INVESTING'::text) AND (base.subcategory = 'CAPEX'::text)) THEN base.cash_out
                    ELSE (0)::numeric
                END) AS capex_out
           FROM base
          GROUP BY base.month_start_date, base.entity_id
        )
 SELECT month_start_date,
    entity_id,
    cash_in_total,
    cash_out_total,
    cf_operating_net,
    cf_investing_net,
    cf_financing_net,
    capex_out
   FROM agg;


ALTER VIEW core.v_monthly_cash OWNER TO neondb_owner;

--
-- Name: v_monthly_financials; Type: VIEW; Schema: core; Owner: neondb_owner
--

CREATE VIEW core.v_monthly_financials AS
 WITH gl AS (
         SELECT d.month_start AS month_start_date,
            a.entity_id,
            acc.statement_group,
            sum(a.amount) AS amt
           FROM ((core.fact_gl_activity a
             JOIN core.dim_date d ON ((d.date_key = a.date_key)))
             JOIN core.dim_account acc ON ((acc.account_id = a.account_id)))
          GROUP BY d.month_start, a.entity_id, acc.statement_group
        ), pivot AS (
         SELECT gl.month_start_date,
            gl.entity_id,
            COALESCE(sum(
                CASE
                    WHEN (gl.statement_group = 'REVENUE'::text) THEN gl.amt
                    ELSE NULL::numeric
                END), (0)::numeric) AS revenue,
            abs(COALESCE(sum(
                CASE
                    WHEN (gl.statement_group = 'COGS'::text) THEN gl.amt
                    ELSE NULL::numeric
                END), (0)::numeric)) AS cogs,
            abs(COALESCE(sum(
                CASE
                    WHEN (gl.statement_group = 'OPEX'::text) THEN gl.amt
                    ELSE NULL::numeric
                END), (0)::numeric)) AS opex,
            abs(COALESCE(sum(
                CASE
                    WHEN (gl.statement_group = 'D&A'::text) THEN gl.amt
                    ELSE NULL::numeric
                END), (0)::numeric)) AS da,
            abs(COALESCE(sum(
                CASE
                    WHEN (gl.statement_group = 'INTEREST'::text) THEN gl.amt
                    ELSE NULL::numeric
                END), (0)::numeric)) AS interest,
            abs(COALESCE(sum(
                CASE
                    WHEN (gl.statement_group = 'TAX'::text) THEN gl.amt
                    ELSE NULL::numeric
                END), (0)::numeric)) AS tax
           FROM gl
          GROUP BY gl.month_start_date, gl.entity_id
        )
 SELECT month_start_date,
    entity_id,
    revenue,
    abs(revenue) AS revenue_abs,
    cogs,
    opex,
    da,
    interest,
    tax,
    (revenue - cogs) AS gross_profit,
    (((((revenue - cogs) - opex) - da) - interest) - tax) AS net_income,
    ((revenue - cogs) - opex) AS ebitda
   FROM pivot;


ALTER VIEW core.v_monthly_financials OWNER TO neondb_owner;

--
-- Name: v_monthly_inv_averages; Type: VIEW; Schema: core; Owner: neondb_owner
--

CREATE VIEW core.v_monthly_inv_averages AS
 SELECT d.month_start AS month_start_date,
    s.entity_id,
    avg(s.inventory_balance) AS inv_avg
   FROM (core.fact_inventory_snapshot s
     JOIN core.dim_date d ON ((d.date_key = s.date_key)))
  GROUP BY d.month_start, s.entity_id;


ALTER VIEW core.v_monthly_inv_averages OWNER TO neondb_owner;

--
-- Name: v_monthly_wc_averages; Type: VIEW; Schema: core; Owner: neondb_owner
--

CREATE VIEW core.v_monthly_wc_averages AS
 SELECT d.month_start AS month_start_date,
    s.entity_id,
    avg(s.ar_balance) AS ar_avg
   FROM (core.fact_ar_snapshot s
     JOIN core.dim_date d ON ((d.date_key = s.date_key)))
  GROUP BY d.month_start, s.entity_id;


ALTER VIEW core.v_monthly_wc_averages OWNER TO neondb_owner;

--
-- Name: v_kpi_20_wide; Type: VIEW; Schema: mart; Owner: neondb_owner
--

CREATE VIEW mart.v_kpi_20_wide AS
 WITH fin AS (
         SELECT v_monthly_financials.month_start_date,
            v_monthly_financials.entity_id,
            v_monthly_financials.revenue,
            v_monthly_financials.revenue_abs,
            v_monthly_financials.cogs,
            v_monthly_financials.opex,
            v_monthly_financials.da,
            v_monthly_financials.interest,
            v_monthly_financials.tax,
            v_monthly_financials.gross_profit,
            v_monthly_financials.net_income,
            v_monthly_financials.ebitda
           FROM core.v_monthly_financials
        ), bal AS (
         SELECT v_month_end_balances.month_start_date,
            v_month_end_balances.entity_id,
            v_month_end_balances.cash_end,
            v_month_end_balances.ar_end,
            v_month_end_balances.ap_end,
            v_month_end_balances.inv_end,
            v_month_end_balances.debt_end,
            v_month_end_balances.equity_end,
            v_month_end_balances.current_assets_end,
            v_month_end_balances.current_liabilities_end
           FROM core.v_month_end_balances
        ), ar AS (
         SELECT v_monthly_wc_averages.month_start_date,
            v_monthly_wc_averages.entity_id,
            v_monthly_wc_averages.ar_avg
           FROM core.v_monthly_wc_averages
        ), ap AS (
         SELECT v_monthly_ap_averages.month_start_date,
            v_monthly_ap_averages.entity_id,
            v_monthly_ap_averages.ap_avg
           FROM core.v_monthly_ap_averages
        ), inv AS (
         SELECT v_monthly_inv_averages.month_start_date,
            v_monthly_inv_averages.entity_id,
            v_monthly_inv_averages.inv_avg
           FROM core.v_monthly_inv_averages
        ), cash AS (
         SELECT v_monthly_cash.month_start_date,
            v_monthly_cash.entity_id,
            v_monthly_cash.cash_in_total,
            v_monthly_cash.cash_out_total,
            v_monthly_cash.cf_operating_net,
            v_monthly_cash.cf_investing_net,
            v_monthly_cash.cf_financing_net,
            v_monthly_cash.capex_out
           FROM core.v_monthly_cash
        ), days_in_month AS (
         SELECT x.month_start,
            (EXTRACT(day FROM (date_trunc('month'::text, (x.month_start)::timestamp without time zone) + '1 mon -1 days'::interval)))::integer AS days
           FROM ( SELECT DISTINCT dim_date.month_start
                   FROM core.dim_date) x
        ), joined AS (
         SELECT fin.month_start_date,
            fin.entity_id,
            fin.revenue,
            fin.revenue_abs,
            fin.cogs,
            fin.opex,
            fin.da,
            fin.interest,
            fin.tax,
            fin.gross_profit,
            fin.net_income,
            fin.ebitda,
            COALESCE(bal.cash_end, (0)::numeric) AS cash_end,
            COALESCE(bal.ar_end, (0)::numeric) AS ar_end,
            COALESCE(bal.ap_end, (0)::numeric) AS ap_end,
            COALESCE(bal.inv_end, (0)::numeric) AS inv_end,
            COALESCE(bal.debt_end, (0)::numeric) AS debt_end,
            COALESCE(bal.equity_end, (0)::numeric) AS equity_end,
            COALESCE(bal.current_assets_end, (0)::numeric) AS current_assets_end,
            COALESCE(bal.current_liabilities_end, (0)::numeric) AS current_liabilities_end,
            COALESCE(ar.ar_avg, (0)::numeric) AS ar_avg,
            COALESCE(ap.ap_avg, (0)::numeric) AS ap_avg,
            COALESCE(inv.inv_avg, (0)::numeric) AS inv_avg,
            COALESCE(cash.cash_in_total, (0)::numeric) AS cash_in_total,
            COALESCE(cash.cash_out_total, (0)::numeric) AS cash_out_total,
            COALESCE(cash.capex_out, (0)::numeric) AS capex_out,
            COALESCE(dim.days, 30) AS days_in_period
           FROM ((((((fin
             LEFT JOIN bal ON (((bal.month_start_date = fin.month_start_date) AND (bal.entity_id = fin.entity_id))))
             LEFT JOIN ar ON (((ar.month_start_date = fin.month_start_date) AND (ar.entity_id = fin.entity_id))))
             LEFT JOIN ap ON (((ap.month_start_date = fin.month_start_date) AND (ap.entity_id = fin.entity_id))))
             LEFT JOIN inv ON (((inv.month_start_date = fin.month_start_date) AND (inv.entity_id = fin.entity_id))))
             LEFT JOIN cash ON (((cash.month_start_date = fin.month_start_date) AND (cash.entity_id = fin.entity_id))))
             LEFT JOIN days_in_month dim ON ((dim.month_start = fin.month_start_date)))
        ), with_prev AS (
         SELECT j.month_start_date,
            j.entity_id,
            j.revenue,
            j.revenue_abs,
            j.cogs,
            j.opex,
            j.da,
            j.interest,
            j.tax,
            j.gross_profit,
            j.net_income,
            j.ebitda,
            j.cash_end,
            j.ar_end,
            j.ap_end,
            j.inv_end,
            j.debt_end,
            j.equity_end,
            j.current_assets_end,
            j.current_liabilities_end,
            j.ar_avg,
            j.ap_avg,
            j.inv_avg,
            j.cash_in_total,
            j.cash_out_total,
            j.capex_out,
            j.days_in_period,
            lag(j.revenue) OVER (PARTITION BY j.entity_id ORDER BY j.month_start_date) AS revenue_prev,
            lag(j.equity_end) OVER (PARTITION BY j.entity_id ORDER BY j.month_start_date) AS equity_prev,
            lag(j.ar_avg) OVER (PARTITION BY j.entity_id ORDER BY j.month_start_date) AS ar_avg_prev,
            lag(j.ap_avg) OVER (PARTITION BY j.entity_id ORDER BY j.month_start_date) AS ap_avg_prev,
            lag(j.inv_avg) OVER (PARTITION BY j.entity_id ORDER BY j.month_start_date) AS inv_avg_prev
           FROM joined j
        ), wc_deltas AS (
         SELECT w.month_start_date,
            w.entity_id,
            w.revenue,
            w.revenue_abs,
            w.cogs,
            w.opex,
            w.da,
            w.interest,
            w.tax,
            w.gross_profit,
            w.net_income,
            w.ebitda,
            w.cash_end,
            w.ar_end,
            w.ap_end,
            w.inv_end,
            w.debt_end,
            w.equity_end,
            w.current_assets_end,
            w.current_liabilities_end,
            w.ar_avg,
            w.ap_avg,
            w.inv_avg,
            w.cash_in_total,
            w.cash_out_total,
            w.capex_out,
            w.days_in_period,
            w.revenue_prev,
            w.equity_prev,
            w.ar_avg_prev,
            w.ap_avg_prev,
            w.inv_avg_prev,
            (w.ar_avg - COALESCE(w.ar_avg_prev, (0)::numeric)) AS delta_ar,
            (w.inv_avg - COALESCE(w.inv_avg_prev, (0)::numeric)) AS delta_inv,
            (w.ap_avg - COALESCE(w.ap_avg_prev, (0)::numeric)) AS delta_ap
           FROM with_prev w
        ), calc AS (
         SELECT wc_deltas.month_start_date,
            wc_deltas.entity_id,
            wc_deltas.revenue,
            wc_deltas.revenue_abs,
            wc_deltas.cogs,
            wc_deltas.opex,
            wc_deltas.da,
            wc_deltas.interest,
            wc_deltas.tax,
            wc_deltas.gross_profit,
            wc_deltas.net_income,
            wc_deltas.ebitda,
            wc_deltas.cash_end,
            wc_deltas.ar_end,
            wc_deltas.ap_end,
            wc_deltas.inv_end,
            wc_deltas.debt_end,
            wc_deltas.equity_end,
            wc_deltas.current_assets_end,
            wc_deltas.current_liabilities_end,
            wc_deltas.ar_avg,
            wc_deltas.ap_avg,
            wc_deltas.inv_avg,
            wc_deltas.cash_in_total,
            wc_deltas.cash_out_total,
            wc_deltas.capex_out,
            wc_deltas.days_in_period,
                CASE
                    WHEN ((wc_deltas.revenue_prev IS NULL) OR (wc_deltas.revenue_prev = (0)::numeric)) THEN NULL::numeric
                    ELSE ((wc_deltas.revenue - wc_deltas.revenue_prev) / NULLIF(wc_deltas.revenue_prev, (0)::numeric))
                END AS revenue_growth,
                CASE
                    WHEN (wc_deltas.revenue_abs = (0)::numeric) THEN NULL::numeric
                    ELSE ((wc_deltas.revenue - wc_deltas.cogs) / NULLIF(wc_deltas.revenue_abs, (0)::numeric))
                END AS gross_margin,
                CASE
                    WHEN (wc_deltas.revenue_abs = (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.net_income / NULLIF(wc_deltas.revenue_abs, (0)::numeric))
                END AS net_profit_margin,
                CASE
                    WHEN (wc_deltas.revenue_abs = (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.ebitda / NULLIF(wc_deltas.revenue_abs, (0)::numeric))
                END AS ebitda_margin,
                CASE
                    WHEN (wc_deltas.equity_prev IS NULL) THEN NULL::numeric
                    ELSE (wc_deltas.net_income / NULLIF(((wc_deltas.equity_end + wc_deltas.equity_prev) / 2.0), (0)::numeric))
                END AS roe,
            ((wc_deltas.net_income + wc_deltas.da) - ((COALESCE(wc_deltas.delta_ar, (0)::numeric) + COALESCE(wc_deltas.delta_inv, (0)::numeric)) - COALESCE(wc_deltas.delta_ap, (0)::numeric))) AS operating_cash_flow,
            (((wc_deltas.net_income + wc_deltas.da) - ((COALESCE(wc_deltas.delta_ar, (0)::numeric) + COALESCE(wc_deltas.delta_inv, (0)::numeric)) - COALESCE(wc_deltas.delta_ap, (0)::numeric))) - COALESCE(wc_deltas.capex_out, (0)::numeric)) AS free_cash_flow,
            (wc_deltas.cash_out_total - wc_deltas.cash_in_total) AS cash_burn_rate,
                CASE
                    WHEN ((wc_deltas.cash_out_total - wc_deltas.cash_in_total) <= (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.cash_end / NULLIF((wc_deltas.cash_out_total - wc_deltas.cash_in_total), (0)::numeric))
                END AS runway_months,
                CASE
                    WHEN (wc_deltas.revenue_abs = (0)::numeric) THEN NULL::numeric
                    ELSE ((COALESCE(wc_deltas.ar_avg, (0)::numeric) / NULLIF(wc_deltas.revenue_abs, (0)::numeric)) * (COALESCE(wc_deltas.days_in_period, 30))::numeric)
                END AS dso,
                CASE
                    WHEN (wc_deltas.cogs = (0)::numeric) THEN NULL::numeric
                    ELSE ((COALESCE(wc_deltas.ap_avg, (0)::numeric) / NULLIF(wc_deltas.cogs, (0)::numeric)) * (COALESCE(wc_deltas.days_in_period, 30))::numeric)
                END AS dpo,
                CASE
                    WHEN (wc_deltas.cogs = (0)::numeric) THEN NULL::numeric
                    ELSE ((COALESCE(wc_deltas.inv_avg, (0)::numeric) / NULLIF(wc_deltas.cogs, (0)::numeric)) * (COALESCE(wc_deltas.days_in_period, 30))::numeric)
                END AS dio,
                CASE
                    WHEN (COALESCE(wc_deltas.ar_avg, (0)::numeric) = (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.revenue_abs / NULLIF(wc_deltas.ar_avg, (0)::numeric))
                END AS ar_turnover,
                CASE
                    WHEN (COALESCE(wc_deltas.inv_avg, (0)::numeric) = (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.cogs / NULLIF(wc_deltas.inv_avg, (0)::numeric))
                END AS inventory_turnover,
                CASE
                    WHEN (COALESCE(wc_deltas.equity_end, (0)::numeric) = (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.debt_end / NULLIF(wc_deltas.equity_end, (0)::numeric))
                END AS debt_to_equity,
                CASE
                    WHEN (COALESCE(wc_deltas.current_liabilities_end, (0)::numeric) = (0)::numeric) THEN NULL::numeric
                    ELSE (wc_deltas.current_assets_end / NULLIF(wc_deltas.current_liabilities_end, (0)::numeric))
                END AS current_ratio,
                CASE
                    WHEN (COALESCE(wc_deltas.current_liabilities_end, (0)::numeric) = (0)::numeric) THEN NULL::numeric
                    ELSE ((wc_deltas.current_assets_end - COALESCE(wc_deltas.inv_end, (0)::numeric)) / NULLIF(wc_deltas.current_liabilities_end, (0)::numeric))
                END AS quick_ratio
           FROM wc_deltas
        )
 SELECT month_start_date,
    entity_id,
    revenue,
    revenue_abs,
    cogs,
    opex,
    da,
    interest,
    tax,
    gross_profit,
    net_income,
    ebitda,
    cash_end,
    ar_end,
    ap_end,
    inv_end,
    debt_end,
    equity_end,
    current_assets_end,
    current_liabilities_end,
    ar_avg,
    ap_avg,
    inv_avg,
    cash_in_total,
    cash_out_total,
    capex_out,
    days_in_period,
    revenue_growth,
    gross_margin,
    net_profit_margin,
    ebitda_margin,
    roe,
    operating_cash_flow,
    free_cash_flow,
    cash_burn_rate,
    runway_months,
    dso,
    dpo,
    dio,
    ar_turnover,
    inventory_turnover,
    debt_to_equity,
    current_ratio,
    quick_ratio,
        CASE
            WHEN ((dio IS NULL) OR (dso IS NULL) OR (dpo IS NULL)) THEN NULL::numeric
            ELSE ((dio + dso) - dpo)
        END AS ccc_days
   FROM calc c;


ALTER VIEW mart.v_kpi_20_wide OWNER TO neondb_owner;

--
-- Name: v_ccc_component_deltas; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_ccc_component_deltas AS
 SELECT month_start_date,
    entity_id,
    (dso - lag(dso) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_dso,
    (dio - lag(dio) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_dio,
    (dpo - lag(dpo) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_dpo
   FROM mart.v_kpi_20_wide;


ALTER VIEW ai.v_ccc_component_deltas OWNER TO neondb_owner;

--
-- Name: v_has_prior_month; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_has_prior_month AS
 SELECT month_start_date,
    entity_id,
    (lag(month_start_date) OVER (PARTITION BY entity_id ORDER BY month_start_date) IS NOT NULL) AS has_prior_period
   FROM ( SELECT DISTINCT v_kpi_20_wide.month_start_date,
            v_kpi_20_wide.entity_id
           FROM mart.v_kpi_20_wide) x;


ALTER VIEW ai.v_has_prior_month OWNER TO neondb_owner;

--
-- Name: v_kpi_drivers_monthly; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_drivers_monthly AS
 SELECT month_start_date,
    entity_id,
    (revenue - lag(revenue) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_revenue,
    (cogs - lag(cogs) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_cogs,
    (opex - lag(opex) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_opex,
    (ar_avg - lag(ar_avg) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_ar,
    (ap_avg - lag(ap_avg) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_ap,
    (inv_avg - lag(inv_avg) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_inventory,
    (((ar_avg - lag(ar_avg) OVER (PARTITION BY entity_id ORDER BY month_start_date)) + (inv_avg - lag(inv_avg) OVER (PARTITION BY entity_id ORDER BY month_start_date))) - (ap_avg - lag(ap_avg) OVER (PARTITION BY entity_id ORDER BY month_start_date))) AS delta_working_capital,
    (ccc_days - lag(ccc_days) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_ccc_days,
    (gross_margin - lag(gross_margin) OVER (PARTITION BY entity_id ORDER BY month_start_date)) AS delta_gross_margin
   FROM mart.v_kpi_20_wide;


ALTER VIEW ai.v_kpi_drivers_monthly OWNER TO neondb_owner;

--
-- Name: v_ranked_drivers_monthly; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_ranked_drivers_monthly AS
 WITH base AS (
         SELECT v_kpi_drivers_monthly.month_start_date,
            v_kpi_drivers_monthly.entity_id,
            v_kpi_drivers_monthly.delta_revenue,
            v_kpi_drivers_monthly.delta_cogs,
            v_kpi_drivers_monthly.delta_opex,
            v_kpi_drivers_monthly.delta_ar,
            v_kpi_drivers_monthly.delta_ap,
            v_kpi_drivers_monthly.delta_inventory,
            v_kpi_drivers_monthly.delta_working_capital
           FROM ai.v_kpi_drivers_monthly
        ), ccc AS (
         SELECT v_ccc_component_deltas.month_start_date,
            v_ccc_component_deltas.entity_id,
            v_ccc_component_deltas.delta_dso,
            v_ccc_component_deltas.delta_dio,
            v_ccc_component_deltas.delta_dpo
           FROM ai.v_ccc_component_deltas
        ), drivers_raw AS (
         SELECT u.month_start_date,
            u.entity_id,
            u.kpi_code,
            u.driver_code,
            u.driver_label,
            u.driver_value,
            u.driver_unit,
            abs(u.driver_value) AS impact_score
           FROM ( SELECT base.month_start_date,
                    base.entity_id,
                    'REVENUE'::text AS kpi_code,
                    'DELTA_REVENUE'::text AS driver_code,
                    'Revenue change'::text AS driver_label,
                    base.delta_revenue AS driver_value,
                    'usd'::text AS driver_unit
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'GROSS_MARGIN'::text AS text,
                    'DELTA_REVENUE'::text AS text,
                    'Revenue change'::text AS text,
                    base.delta_revenue,
                    'usd'::text AS text
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'GROSS_MARGIN'::text AS text,
                    'DELTA_COGS'::text AS text,
                    'COGS change'::text AS text,
                    base.delta_cogs,
                    'usd'::text AS text
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'OPERATING_CASH_FLOW'::text AS text,
                    'DELTA_WORKING_CAPITAL'::text AS text,
                    'Working capital change (AR+INV-AP)'::text AS text,
                    base.delta_working_capital,
                    'usd_like'::text AS text
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'OPERATING_CASH_FLOW'::text AS text,
                    'DELTA_AR'::text AS text,
                    'Accounts receivable change'::text AS text,
                    base.delta_ar,
                    'usd_like'::text AS text
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'OPERATING_CASH_FLOW'::text AS text,
                    'DELTA_INVENTORY'::text AS text,
                    'Inventory change'::text AS text,
                    base.delta_inventory,
                    'usd_like'::text AS text
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'OPERATING_CASH_FLOW'::text AS text,
                    'DELTA_AP'::text AS text,
                    'Accounts payable change'::text AS text,
                    base.delta_ap,
                    'usd_like'::text AS text
                   FROM base
                UNION ALL
                 SELECT base.month_start_date,
                    base.entity_id,
                    'OPERATING_CASH_FLOW'::text AS text,
                    'DELTA_OPEX'::text AS text,
                    'Operating expense change'::text AS text,
                    base.delta_opex,
                    'usd'::text AS text
                   FROM base
                UNION ALL
                 SELECT ccc.month_start_date,
                    ccc.entity_id,
                    'CASH_CONVERSION_CYCLE'::text AS text,
                    'DELTA_DSO'::text AS text,
                    'DSO change'::text AS text,
                    ccc.delta_dso,
                    'days'::text AS text
                   FROM ccc
                UNION ALL
                 SELECT ccc.month_start_date,
                    ccc.entity_id,
                    'CASH_CONVERSION_CYCLE'::text AS text,
                    'DELTA_DIO'::text AS text,
                    'DIO change'::text AS text,
                    ccc.delta_dio,
                    'days'::text AS text
                   FROM ccc
                UNION ALL
                 SELECT ccc.month_start_date,
                    ccc.entity_id,
                    'CASH_CONVERSION_CYCLE'::text AS text,
                    'DELTA_DPO'::text AS text,
                    'DPO change'::text AS text,
                    ccc.delta_dpo,
                    'days'::text AS text
                   FROM ccc) u
          WHERE (u.driver_value IS NOT NULL)
        )
 SELECT month_start_date,
    entity_id,
    kpi_code,
    driver_code,
    driver_label,
    driver_value,
    driver_unit,
    impact_score,
    row_number() OVER (PARTITION BY month_start_date, entity_id, kpi_code ORDER BY impact_score DESC NULLS LAST) AS driver_rank
   FROM drivers_raw;


ALTER VIEW ai.v_ranked_drivers_monthly OWNER TO neondb_owner;

--
-- Name: v_kpi_driver_top3; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_driver_top3 AS
 SELECT month_start_date,
    entity_id,
    kpi_code,
    driver_code,
    driver_label,
    driver_value,
    driver_unit,
    impact_score,
    driver_rank
   FROM ai.v_ranked_drivers_monthly
  WHERE (driver_rank <= 3);


ALTER VIEW ai.v_kpi_driver_top3 OWNER TO neondb_owner;

--
-- Name: v_kpi_driver_bullets_json; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_driver_bullets_json AS
 WITH top3 AS (
         SELECT v_kpi_driver_top3.month_start_date,
            v_kpi_driver_top3.entity_id,
            v_kpi_driver_top3.kpi_code,
            v_kpi_driver_top3.driver_rank,
            v_kpi_driver_top3.driver_code,
            v_kpi_driver_top3.driver_label,
            v_kpi_driver_top3.driver_value,
            v_kpi_driver_top3.driver_unit,
            v_kpi_driver_top3.impact_score
           FROM ai.v_kpi_driver_top3
        ), hp AS (
         SELECT v_has_prior_month.month_start_date,
            v_has_prior_month.entity_id,
            v_has_prior_month.has_prior_period
           FROM ai.v_has_prior_month
        ), enriched AS (
         SELECT t.month_start_date,
            t.entity_id,
            t.kpi_code,
            t.driver_rank,
            t.driver_code,
            t.driver_label,
            t.driver_value,
            t.driver_unit,
            t.impact_score,
            COALESCE(h.has_prior_period, false) AS has_prior_period,
                CASE
                    WHEN ((t.kpi_code = 'REVENUE'::text) AND (t.driver_code = 'DELTA_REVENUE'::text)) THEN
                    CASE
                        WHEN (t.driver_value >= (0)::numeric) THEN 'positive'::text
                        ELSE 'negative'::text
                    END
                    WHEN ((t.kpi_code = 'GROSS_MARGIN'::text) AND (t.driver_code = 'DELTA_REVENUE'::text)) THEN
                    CASE
                        WHEN (t.driver_value >= (0)::numeric) THEN 'positive'::text
                        ELSE 'negative'::text
                    END
                    WHEN ((t.kpi_code = 'GROSS_MARGIN'::text) AND (t.driver_code = 'DELTA_COGS'::text)) THEN
                    CASE
                        WHEN (t.driver_value >= (0)::numeric) THEN 'negative'::text
                        ELSE 'positive'::text
                    END
                    WHEN ((t.kpi_code = 'OPERATING_CASH_FLOW'::text) AND (t.driver_code = ANY (ARRAY['DELTA_WORKING_CAPITAL'::text, 'DELTA_AR'::text, 'DELTA_INVENTORY'::text]))) THEN
                    CASE
                        WHEN (t.driver_value > (0)::numeric) THEN 'negative'::text
                        ELSE 'positive'::text
                    END
                    WHEN ((t.kpi_code = 'OPERATING_CASH_FLOW'::text) AND (t.driver_code = 'DELTA_AP'::text)) THEN
                    CASE
                        WHEN (t.driver_value > (0)::numeric) THEN 'positive'::text
                        ELSE 'negative'::text
                    END
                    WHEN ((t.kpi_code = 'OPERATING_CASH_FLOW'::text) AND (t.driver_code = 'DELTA_OPEX'::text)) THEN
                    CASE
                        WHEN (t.driver_value > (0)::numeric) THEN 'negative'::text
                        ELSE 'positive'::text
                    END
                    WHEN ((t.kpi_code = 'CASH_CONVERSION_CYCLE'::text) AND (t.driver_code = ANY (ARRAY['DELTA_DSO'::text, 'DELTA_DIO'::text]))) THEN
                    CASE
                        WHEN (t.driver_value > (0)::numeric) THEN 'negative'::text
                        ELSE 'positive'::text
                    END
                    WHEN ((t.kpi_code = 'CASH_CONVERSION_CYCLE'::text) AND (t.driver_code = 'DELTA_DPO'::text)) THEN
                    CASE
                        WHEN (t.driver_value > (0)::numeric) THEN 'positive'::text
                        ELSE 'negative'::text
                    END
                    ELSE NULL::text
                END AS effect,
                CASE
                    WHEN (t.driver_unit = ANY (ARRAY['usd'::text, 'usd_like'::text])) THEN to_char(t.driver_value, 'FM$999,999,999,990.00'::text)
                    WHEN (t.driver_unit = 'days'::text) THEN (to_char(t.driver_value, 'FM999,999,990.00'::text) || ' days'::text)
                    ELSE to_char(t.driver_value, 'FM999,999,990.00'::text)
                END AS display_value,
                CASE
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_REVENUE'::text, 'DELTA_DSO'::text])) THEN 'RevOps'::text
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_COGS'::text, 'DELTA_DPO'::text])) THEN 'Procurement'::text
                    WHEN (t.driver_code = 'DELTA_OPEX'::text) THEN 'Finance'::text
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_DIO'::text, 'DELTA_INVENTORY'::text])) THEN 'Operations'::text
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_WORKING_CAPITAL'::text, 'DELTA_AR'::text, 'DELTA_AP'::text])) THEN 'Finance'::text
                    ELSE 'Finance'::text
                END AS owner,
                CASE
                    WHEN (t.driver_code = 'DELTA_REVENUE'::text) THEN jsonb_build_array(jsonb_build_object('title', 'Review pipeline + conversion', 'detail', 'Check lead velocity, win-rate, and deal slippage vs prior month. Segment by channel and product.'), jsonb_build_object('title', 'Inspect pricing & discounting', 'detail', 'Compare average selling price and discount bands; tighten approvals for outlier discounts.'), jsonb_build_object('title', 'Check churn/expansion', 'detail', 'Validate whether growth came from new logos vs expansion; flag accounts with contraction risk.'))
                    WHEN (t.driver_code = 'DELTA_COGS'::text) THEN jsonb_build_array(jsonb_build_object('title', 'Analyze unit economics', 'detail', 'Break down COGS into variable vs fixed; identify which component drove increase (hosting, labor, materials).'), jsonb_build_object('title', 'Renegotiate suppliers / optimize vendors', 'detail', 'Benchmark rates; consolidate vendors; renegotiate terms on the top 3 cost lines.'), jsonb_build_object('title', 'Tighten fulfillment / delivery cost', 'detail', 'Look for process waste, rework, expedited shipping, or SLA breaches increasing cost.'))
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_AR'::text, 'DELTA_DSO'::text])) THEN jsonb_build_array(jsonb_build_object('title', 'Collections sprint', 'detail', 'Prioritize top overdue invoices; set weekly touch cadence; escalate disputed invoices.'), jsonb_build_object('title', 'Improve billing hygiene', 'detail', 'Reduce invoice errors, enforce PO requirements, and shorten time-to-invoice.'), jsonb_build_object('title', 'Review credit policy', 'detail', 'Re-score high-risk customers; adjust payment terms for slow payers; consider partial upfront.'))
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_INVENTORY'::text, 'DELTA_DIO'::text])) THEN jsonb_build_array(jsonb_build_object('title', 'Reduce excess inventory', 'detail', 'Identify slow-moving SKUs; execute clearance/return-to-vendor; rebalance safety stock.'), jsonb_build_object('title', 'Reorder policy tuning', 'detail', 'Adjust reorder points/EOQ; improve demand forecasting; align purchase frequency with actual sell-through.'), jsonb_build_object('title', 'Cycle count + shrink review', 'detail', 'Validate inventory accuracy; check shrink, write-offs, and receiving/putaway errors.'))
                    WHEN (t.driver_code = ANY (ARRAY['DELTA_AP'::text, 'DELTA_DPO'::text])) THEN jsonb_build_array(jsonb_build_object('title', 'Negotiate payment terms', 'detail', 'Target top vendors; extend net terms; explore dynamic discounting where it’s ROI-positive.'), jsonb_build_object('title', 'Optimize payment runs', 'detail', 'Avoid early payments unless discounts justify; batch payments; align approvals to term dates.'), jsonb_build_object('title', 'Validate vendor master + invoices', 'detail', 'Eliminate duplicate payments; ensure invoice matching (PO/receipt) is consistent.'))
                    WHEN (t.driver_code = 'DELTA_OPEX'::text) THEN jsonb_build_array(jsonb_build_object('title', 'Run a spend review', 'detail', 'Rank OPEX by department/category; identify top deltas; confirm one-time vs recurring.'), jsonb_build_object('title', 'Tighten approvals & controls', 'detail', 'Add thresholds for discretionary spend; require business justification for outliers.'), jsonb_build_object('title', 'Reforecast headcount & vendors', 'detail', 'Revisit hiring plan and contractor usage; renegotiate large recurring services.'))
                    WHEN (t.driver_code = 'DELTA_WORKING_CAPITAL'::text) THEN jsonb_build_array(jsonb_build_object('title', 'Working capital triage', 'detail', 'Break ΔWC into AR/INV/AP; focus on the largest drag; set weekly targets.'), jsonb_build_object('title', 'Align terms policy', 'detail', 'Standardize customer terms and vendor terms; reduce mismatches that compress cash.'), jsonb_build_object('title', 'Cash war-room cadence', 'detail', 'Establish weekly cash review: collections, payables, inventory, forecast accuracy.'))
                    ELSE '[]'::jsonb
                END AS actions,
                CASE
                    WHEN (t.driver_rank = 1) THEN 'P1'::text
                    WHEN (t.driver_rank = 2) THEN 'P2'::text
                    ELSE 'P3'::text
                END AS priority,
                CASE
                    WHEN (t.driver_rank = 1) THEN 'material'::text
                    WHEN (t.driver_rank = 2) THEN 'moderate'::text
                    ELSE 'minor'::text
                END AS impact_tier
           FROM (top3 t
             LEFT JOIN hp h ON (((h.month_start_date = t.month_start_date) AND (h.entity_id = t.entity_id))))
        ), scored AS (
         SELECT e.month_start_date,
            e.entity_id,
            e.kpi_code,
            e.driver_rank,
            e.driver_code,
            e.driver_label,
            e.driver_value,
            e.driver_unit,
            e.impact_score,
            e.has_prior_period,
            e.effect,
            e.display_value,
            e.owner,
            e.actions,
            e.priority,
            e.impact_tier,
            max(COALESCE(e.impact_score, (0)::numeric)) OVER (PARTITION BY e.month_start_date, e.entity_id, e.kpi_code) AS max_impact_group
           FROM enriched e
        ), agg AS (
         SELECT scored.month_start_date,
            scored.entity_id,
            scored.kpi_code,
            count(*) AS driver_count,
            max(COALESCE(scored.impact_score, (0)::numeric)) AS max_impact,
            jsonb_agg(jsonb_build_object('rank', scored.driver_rank, 'driver_code', scored.driver_code, 'label', scored.driver_label, 'value', scored.driver_value, 'unit', scored.driver_unit, 'display_value', scored.display_value, 'impact_score', scored.impact_score, 'impact_share',
                CASE
                    WHEN (COALESCE(scored.max_impact_group, (0)::numeric) = (0)::numeric) THEN NULL::numeric
                    ELSE (scored.impact_score / NULLIF(scored.max_impact_group, (0)::numeric))
                END, 'effect', scored.effect, 'owner', scored.owner, 'priority', scored.priority, 'impact_tier', scored.impact_tier, 'confidence',
                CASE
                    WHEN (scored.has_prior_period = false) THEN 'low'::text
                    WHEN ((scored.driver_rank = 1) AND (COALESCE(scored.max_impact_group, (0)::numeric) > (0)::numeric) AND (scored.impact_score >= (0.5 * scored.max_impact_group))) THEN 'high'::text
                    ELSE 'medium'::text
                END, 'actions', scored.actions) ORDER BY scored.driver_rank) AS drivers_json
           FROM scored
          GROUP BY scored.month_start_date, scored.entity_id, scored.kpi_code
        )
 SELECT month_start_date,
    entity_id,
    kpi_code,
        CASE
            WHEN ((driver_count = 0) OR (COALESCE(max_impact, (0)::numeric) = (0)::numeric)) THEN '[]'::jsonb
            ELSE drivers_json
        END AS drivers
   FROM agg;


ALTER VIEW ai.v_kpi_driver_bullets_json OWNER TO neondb_owner;

--
-- Name: v_kpi_narratives_monthly; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_narratives_monthly AS
 SELECT month_start_date,
    entity_id,
    ((((
        CASE
            WHEN (COALESCE(delta_revenue, (0)::numeric) > (0)::numeric) THEN 'Revenue increased'::text
            WHEN (COALESCE(delta_revenue, (0)::numeric) < (0)::numeric) THEN 'Revenue decreased'::text
            ELSE 'Revenue was flat'::text
        END ||
        CASE
            WHEN (COALESCE(delta_gross_margin, (0)::numeric) > (0)::numeric) THEN '; gross margin expanded'::text
            WHEN (COALESCE(delta_gross_margin, (0)::numeric) < (0)::numeric) THEN '; gross margin compressed'::text
            ELSE ''::text
        END) ||
        CASE
            WHEN (COALESCE(delta_working_capital, (0)::numeric) > (0)::numeric) THEN '; working capital absorbed cash'::text
            WHEN (COALESCE(delta_working_capital, (0)::numeric) < (0)::numeric) THEN '; working capital released cash'::text
            ELSE ''::text
        END) ||
        CASE
            WHEN (COALESCE(delta_ccc_days, (0)::numeric) > (0)::numeric) THEN '; cash conversion cycle worsened'::text
            WHEN (COALESCE(delta_ccc_days, (0)::numeric) < (0)::numeric) THEN '; cash conversion cycle improved'::text
            ELSE ''::text
        END) || '.'::text) AS financial_narrative
   FROM ai.v_kpi_drivers_monthly;


ALTER VIEW ai.v_kpi_narratives_monthly OWNER TO neondb_owner;

--
-- Name: v_kpi_card_payload_monthly; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_card_payload_monthly AS
 WITH k AS (
         SELECT v_kpi_20_wide.month_start_date,
            v_kpi_20_wide.entity_id,
            v_kpi_20_wide.revenue,
            v_kpi_20_wide.gross_margin,
            v_kpi_20_wide.net_profit_margin,
            v_kpi_20_wide.ebitda_margin,
            v_kpi_20_wide.roe,
            v_kpi_20_wide.dso,
            v_kpi_20_wide.dpo,
            v_kpi_20_wide.dio,
            v_kpi_20_wide.ccc_days,
            v_kpi_20_wide.debt_to_equity,
            v_kpi_20_wide.current_ratio,
            v_kpi_20_wide.quick_ratio,
            v_kpi_20_wide.net_income,
            v_kpi_20_wide.da,
            v_kpi_20_wide.ar_avg,
            v_kpi_20_wide.ap_avg,
            v_kpi_20_wide.inv_avg
           FROM mart.v_kpi_20_wide
        ), k2 AS (
         SELECT k.month_start_date,
            k.entity_id,
            k.revenue,
            k.gross_margin,
            k.net_profit_margin,
            k.ebitda_margin,
            k.roe,
            k.dso,
            k.dpo,
            k.dio,
            k.ccc_days,
            k.debt_to_equity,
            k.current_ratio,
            k.quick_ratio,
            k.net_income,
            k.da,
            k.ar_avg,
            k.ap_avg,
            k.inv_avg,
            lag(k.ar_avg) OVER (PARTITION BY k.entity_id ORDER BY k.month_start_date) AS ar_prev,
            lag(k.ap_avg) OVER (PARTITION BY k.entity_id ORDER BY k.month_start_date) AS ap_prev,
            lag(k.inv_avg) OVER (PARTITION BY k.entity_id ORDER BY k.month_start_date) AS inv_prev
           FROM k
        ), k3 AS (
         SELECT k2.month_start_date,
            k2.entity_id,
            k2.revenue,
            k2.gross_margin,
            k2.net_profit_margin,
            k2.ebitda_margin,
            k2.roe,
            k2.dso,
            k2.dpo,
            k2.dio,
            k2.ccc_days,
            k2.debt_to_equity,
            k2.current_ratio,
            k2.quick_ratio,
            k2.net_income,
            k2.da,
            k2.ar_avg,
            k2.ap_avg,
            k2.inv_avg,
            k2.ar_prev,
            k2.ap_prev,
            k2.inv_prev,
            (COALESCE(k2.ar_avg, (0)::numeric) - COALESCE(k2.ar_prev, (0)::numeric)) AS delta_ar,
            (COALESCE(k2.ap_avg, (0)::numeric) - COALESCE(k2.ap_prev, (0)::numeric)) AS delta_ap,
            (COALESCE(k2.inv_avg, (0)::numeric) - COALESCE(k2.inv_prev, (0)::numeric)) AS delta_inv,
            (((COALESCE(k2.ar_avg, (0)::numeric) - COALESCE(k2.ar_prev, (0)::numeric)) + (COALESCE(k2.inv_avg, (0)::numeric) - COALESCE(k2.inv_prev, (0)::numeric))) - (COALESCE(k2.ap_avg, (0)::numeric) - COALESCE(k2.ap_prev, (0)::numeric))) AS delta_working_capital
           FROM k2
        ), kpi_calc AS (
         SELECT k3.month_start_date,
            k3.entity_id,
            k3.revenue,
            k3.gross_margin,
            k3.net_profit_margin,
            k3.ebitda_margin,
            k3.roe,
            k3.dso,
            k3.dpo,
            k3.dio,
            k3.ccc_days,
            k3.debt_to_equity,
            k3.current_ratio,
            k3.quick_ratio,
            k3.net_income,
            k3.da,
            k3.ar_avg,
            k3.ap_avg,
            k3.inv_avg,
            k3.ar_prev,
            k3.ap_prev,
            k3.inv_prev,
            k3.delta_ar,
            k3.delta_ap,
            k3.delta_inv,
            k3.delta_working_capital,
            ((COALESCE(k3.net_income, (0)::numeric) + COALESCE(k3.da, (0)::numeric)) - COALESCE(k3.delta_working_capital, (0)::numeric)) AS operating_cash_flow
           FROM k3
        ), n AS (
         SELECT v_kpi_narratives_monthly.month_start_date,
            v_kpi_narratives_monthly.entity_id,
            v_kpi_narratives_monthly.financial_narrative
           FROM ai.v_kpi_narratives_monthly
        ), cards AS (
         SELECT kpi_calc.month_start_date,
            kpi_calc.entity_id,
            x.kpi_code,
            x.kpi_value,
            x.unit
           FROM (kpi_calc
             CROSS JOIN LATERAL ( VALUES ('REVENUE'::text,kpi_calc.revenue,'usd'::text), ('GROSS_MARGIN'::text,kpi_calc.gross_margin,'ratio'::text), ('NET_PROFIT_MARGIN'::text,kpi_calc.net_profit_margin,'ratio'::text), ('EBITDA_MARGIN'::text,kpi_calc.ebitda_margin,'ratio'::text), ('ROE'::text,kpi_calc.roe,'ratio'::text), ('OPERATING_CASH_FLOW'::text,kpi_calc.operating_cash_flow,'usd'::text), ('DSO'::text,kpi_calc.dso,'days'::text), ('DPO'::text,kpi_calc.dpo,'days'::text), ('DIO'::text,kpi_calc.dio,'days'::text), ('CASH_CONVERSION_CYCLE'::text,kpi_calc.ccc_days,'days'::text), ('DEBT_TO_EQUITY'::text,kpi_calc.debt_to_equity,'ratio'::text), ('CURRENT_RATIO'::text,kpi_calc.current_ratio,'ratio'::text), ('QUICK_RATIO'::text,kpi_calc.quick_ratio,'ratio'::text)) x(kpi_code, kpi_value, unit))
        ), deltas AS (
         SELECT cards.month_start_date,
            cards.entity_id,
            cards.kpi_code,
            (cards.kpi_value - lag(cards.kpi_value) OVER (PARTITION BY cards.entity_id, cards.kpi_code ORDER BY cards.month_start_date)) AS kpi_delta
           FROM cards
        )
 SELECT c.month_start_date,
    c.entity_id,
    c.kpi_code,
    c.kpi_value,
    dl.kpi_delta,
    c.unit,
    COALESCE(hp.has_prior_period, false) AS has_prior_period,
        CASE
            WHEN (dl.kpi_delta IS NULL) THEN NULL::text
            WHEN (c.kpi_code = 'REVENUE'::text) THEN
            CASE
                WHEN (dl.kpi_delta > (0)::numeric) THEN 'Revenue increased month-over-month.'::text
                WHEN (dl.kpi_delta < (0)::numeric) THEN 'Revenue decreased month-over-month.'::text
                ELSE 'Revenue was flat month-over-month.'::text
            END
            WHEN (c.kpi_code = 'GROSS_MARGIN'::text) THEN
            CASE
                WHEN (dl.kpi_delta > (0)::numeric) THEN 'Gross margin expanded.'::text
                WHEN (dl.kpi_delta < (0)::numeric) THEN 'Gross margin compressed.'::text
                ELSE 'Gross margin was flat.'::text
            END
            WHEN (c.kpi_code = 'OPERATING_CASH_FLOW'::text) THEN
            CASE
                WHEN (dl.kpi_delta > (0)::numeric) THEN 'Operating cash flow improved.'::text
                WHEN (dl.kpi_delta < (0)::numeric) THEN 'Operating cash flow declined.'::text
                ELSE 'Operating cash flow was flat.'::text
            END
            WHEN (c.kpi_code = 'CASH_CONVERSION_CYCLE'::text) THEN
            CASE
                WHEN (dl.kpi_delta > (0)::numeric) THEN 'Cash conversion cycle worsened.'::text
                WHEN (dl.kpi_delta < (0)::numeric) THEN 'Cash conversion cycle improved.'::text
                ELSE 'Cash conversion cycle was flat.'::text
            END
            ELSE NULL::text
        END AS narrative,
    dj.drivers,
    n.financial_narrative
   FROM ((((cards c
     LEFT JOIN deltas dl ON (((dl.month_start_date = c.month_start_date) AND (dl.entity_id = c.entity_id) AND (dl.kpi_code = c.kpi_code))))
     LEFT JOIN ai.v_kpi_driver_bullets_json dj ON (((dj.month_start_date = c.month_start_date) AND (dj.entity_id = c.entity_id) AND (dj.kpi_code = c.kpi_code))))
     LEFT JOIN n ON (((n.month_start_date = c.month_start_date) AND (n.entity_id = c.entity_id))))
     LEFT JOIN ai.v_has_prior_month hp ON (((hp.month_start_date = c.month_start_date) AND (hp.entity_id = c.entity_id))));


ALTER VIEW ai.v_kpi_card_payload_monthly OWNER TO neondb_owner;

--
-- Name: v_kpi_driver_bullets_array; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_driver_bullets_array AS
 WITH top3 AS (
         SELECT v_kpi_driver_top3.month_start_date,
            v_kpi_driver_top3.entity_id,
            v_kpi_driver_top3.kpi_code,
            v_kpi_driver_top3.driver_rank,
            v_kpi_driver_top3.driver_label,
            v_kpi_driver_top3.driver_value,
            v_kpi_driver_top3.driver_unit
           FROM ai.v_kpi_driver_top3
        ), fmt AS (
         SELECT top3.month_start_date,
            top3.entity_id,
            top3.kpi_code,
            top3.driver_rank,
                CASE
                    WHEN (top3.driver_unit = ANY (ARRAY['usd'::text, 'usd_like'::text])) THEN ((top3.driver_label || ': '::text) || to_char(top3.driver_value, 'FM$999,999,999,990.00'::text))
                    WHEN (top3.driver_unit = 'days'::text) THEN (((top3.driver_label || ': '::text) || to_char(top3.driver_value, 'FM999,999,990.00'::text)) || ' days'::text)
                    ELSE ((top3.driver_label || ': '::text) || to_char(top3.driver_value, 'FM999,999,990.00'::text))
                END AS bullet
           FROM top3
        )
 SELECT month_start_date,
    entity_id,
    kpi_code,
    array_agg(bullet ORDER BY driver_rank) AS bullets
   FROM fmt
  GROUP BY month_start_date, entity_id, kpi_code;


ALTER VIEW ai.v_kpi_driver_bullets_array OWNER TO neondb_owner;

--
-- Name: v_kpi_driver_narrative; Type: VIEW; Schema: ai; Owner: neondb_owner
--

CREATE VIEW ai.v_kpi_driver_narrative AS
 WITH top3 AS (
         SELECT v_kpi_driver_top3.month_start_date,
            v_kpi_driver_top3.entity_id,
            v_kpi_driver_top3.kpi_code,
            v_kpi_driver_top3.driver_rank,
            v_kpi_driver_top3.driver_label,
            v_kpi_driver_top3.driver_value,
            v_kpi_driver_top3.driver_unit
           FROM ai.v_kpi_driver_top3
        ), fmt AS (
         SELECT top3.month_start_date,
            top3.entity_id,
            top3.kpi_code,
            top3.driver_rank,
                CASE
                    WHEN (top3.driver_unit = ANY (ARRAY['usd'::text, 'usd_like'::text])) THEN ((top3.driver_label || ': '::text) || to_char(top3.driver_value, 'FM$999,999,999,990.00'::text))
                    WHEN (top3.driver_unit = 'days'::text) THEN (((top3.driver_label || ': '::text) || to_char(top3.driver_value, 'FM999,999,990.00'::text)) || ' days'::text)
                    ELSE ((top3.driver_label || ': '::text) || to_char(top3.driver_value, 'FM999,999,990.00'::text))
                END AS bullet
           FROM top3
        )
 SELECT month_start_date,
    entity_id,
    kpi_code,
    string_agg(bullet, '
'::text ORDER BY driver_rank) AS top_driver_bullets
   FROM fmt
  GROUP BY month_start_date, entity_id, kpi_code;


ALTER VIEW ai.v_kpi_driver_narrative OWNER TO neondb_owner;

--
-- Name: fact_labor_daily; Type: TABLE; Schema: analytics; Owner: neondb_owner
--

CREATE TABLE analytics.fact_labor_daily (
    labor_date date NOT NULL,
    location_code text DEFAULT '__na__'::text NOT NULL,
    labor_hours numeric,
    labor_cost_usd numeric,
    overtime_hours numeric,
    overtime_cost_usd numeric,
    headcount numeric,
    upload_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE analytics.fact_labor_daily OWNER TO neondb_owner;

--
-- Name: fact_ap_snapshot_daily; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_ap_snapshot_daily (
    ap_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    ap_balance numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_ap_snapshot_daily_ap_balance_check CHECK ((ap_balance >= (0)::numeric))
);


ALTER TABLE restaurant.fact_ap_snapshot_daily OWNER TO neondb_owner;

--
-- Name: fact_ar_snapshot_daily; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_ar_snapshot_daily (
    ar_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    ar_balance numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_ar_snapshot_daily_ar_balance_check CHECK ((ar_balance >= (0)::numeric))
);


ALTER TABLE restaurant.fact_ar_snapshot_daily OWNER TO neondb_owner;

--
-- Name: fact_fixed_cost_daily; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_fixed_cost_daily (
    fixed_cost_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    cost_date date NOT NULL,
    cost_type text NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_fixed_cost_daily_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE restaurant.fact_fixed_cost_daily OWNER TO neondb_owner;

--
-- Name: fact_inventory_on_hand_daily; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_inventory_on_hand_daily (
    inv_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    inventory_value numeric(12,2) NOT NULL,
    CONSTRAINT fact_inventory_on_hand_daily_inventory_value_check CHECK ((inventory_value >= (0)::numeric))
);


ALTER TABLE restaurant.fact_inventory_on_hand_daily OWNER TO neondb_owner;

--
-- Name: fact_labor_shift; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_labor_shift (
    shift_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    shift_date date NOT NULL,
    role text NOT NULL,
    hours_worked numeric(6,2) NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_labor_shift_hourly_rate_check CHECK ((hourly_rate >= (0)::numeric)),
    CONSTRAINT fact_labor_shift_hours_worked_check CHECK ((hours_worked >= (0)::numeric))
);


ALTER TABLE restaurant.fact_labor_shift OWNER TO neondb_owner;

--
-- Name: fact_order; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_order (
    order_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    order_ts timestamp with time zone NOT NULL,
    channel text DEFAULT 'dine_in'::text NOT NULL,
    gross_sales numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    tip numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_id uuid
);


ALTER TABLE restaurant.fact_order OWNER TO neondb_owner;

--
-- Name: fact_order_item; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_order_item (
    order_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    qty integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    CONSTRAINT fact_order_item_qty_check CHECK ((qty > 0))
);


ALTER TABLE restaurant.fact_order_item OWNER TO neondb_owner;

--
-- Name: vw_executive_kpis_all_locations; Type: VIEW; Schema: analytics; Owner: neondb_owner
--

CREATE VIEW analytics.vw_executive_kpis_all_locations AS
 WITH params AS (
         SELECT now() AS as_of_ts
        ), tw AS (
         SELECT params_1.as_of_ts,
            (params_1.as_of_ts - '30 days'::interval) AS start_ts,
            ((params_1.as_of_ts)::date - 30) AS start_date,
            (params_1.as_of_ts)::date AS end_date
           FROM params params_1
        ), sales AS (
         SELECT count(*) AS orders_30d,
            COALESCE(sum((o.gross_sales - o.discount)), (0)::numeric) AS revenue_30d
           FROM (restaurant.fact_order o
             JOIN tw ON (true))
          WHERE ((o.order_ts >= tw.start_ts) AND (o.order_ts < tw.as_of_ts))
        ), cogs AS (
         SELECT COALESCE(sum(((oi.qty)::numeric * oi.unit_cost)), (0)::numeric) AS cogs_30d
           FROM ((restaurant.fact_order o
             JOIN restaurant.fact_order_item oi ON ((oi.order_id = o.order_id)))
             JOIN tw ON (true))
          WHERE ((o.order_ts >= tw.start_ts) AND (o.order_ts < tw.as_of_ts))
        ), labor AS (
         SELECT COALESCE(sum((ls.hours_worked * ls.hourly_rate)), (0)::numeric) AS labor_30d
           FROM (restaurant.fact_labor_shift ls
             JOIN tw ON (true))
          WHERE ((ls.shift_date >= tw.start_date) AND (ls.shift_date < tw.end_date))
        ), fixed AS (
         SELECT COALESCE(sum(f_1.amount), (0)::numeric) AS fixed_costs_30d
           FROM (restaurant.fact_fixed_cost_daily f_1
             JOIN tw ON (true))
          WHERE ((f_1.cost_date >= tw.start_date) AND (f_1.cost_date < tw.end_date) AND (f_1.cost_type = 'Fixed'::text))
        ), interest AS (
         SELECT COALESCE(sum(f_1.amount), (0)::numeric) AS interest_expense_30d
           FROM (restaurant.fact_fixed_cost_daily f_1
             JOIN tw ON (true))
          WHERE ((f_1.cost_date >= tw.start_date) AND (f_1.cost_date < tw.end_date) AND (f_1.cost_type = 'Interest'::text))
        ), ar_daily AS (
         SELECT a.snapshot_date,
            sum(a.ar_balance) AS ar_total
           FROM (restaurant.fact_ar_snapshot_daily a
             JOIN tw ON (true))
          WHERE ((a.snapshot_date >= tw.start_date) AND (a.snapshot_date < tw.end_date))
          GROUP BY a.snapshot_date
        ), ap_daily AS (
         SELECT p.snapshot_date,
            sum(p.ap_balance) AS ap_total
           FROM (restaurant.fact_ap_snapshot_daily p
             JOIN tw ON (true))
          WHERE ((p.snapshot_date >= tw.start_date) AND (p.snapshot_date < tw.end_date))
          GROUP BY p.snapshot_date
        ), inv_daily AS (
         SELECT i.snapshot_date,
            sum(i.inventory_value) AS inv_total
           FROM (restaurant.fact_inventory_on_hand_daily i
             JOIN tw ON (true))
          WHERE ((i.snapshot_date >= tw.start_date) AND (i.snapshot_date < tw.end_date))
          GROUP BY i.snapshot_date
        ), ar AS (
         SELECT avg(ar_daily.ar_total) AS avg_ar_balance_30d
           FROM ar_daily
        ), ap AS (
         SELECT avg(ap_daily.ap_total) AS avg_ap_balance_30d
           FROM ap_daily
        ), inv AS (
         SELECT avg(inv_daily.inv_total) AS avg_inv_value_30d
           FROM inv_daily
        )
 SELECT params.as_of_ts,
    round(s.revenue_30d, 2) AS revenue_30d,
    s.orders_30d,
    round(c.cogs_30d, 2) AS cogs_30d,
    round((s.revenue_30d - c.cogs_30d), 2) AS gross_profit_30d,
    round((((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS gross_margin_pct,
    round(((c.cogs_30d / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS food_cost_ratio_pct,
    round(l.labor_30d, 2) AS labor_cost_30d,
    round(((l.labor_30d / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS labor_cost_ratio_pct,
    round((((c.cogs_30d + l.labor_30d) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS prime_cost_ratio_pct,
    round(f.fixed_costs_30d, 2) AS fixed_costs_30d,
    round(((s.revenue_30d - c.cogs_30d) / NULLIF(f.fixed_costs_30d, (0)::numeric)), 2) AS fixed_cost_coverage_ratio,
    round((f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)), (0)::numeric)), 2) AS break_even_revenue_30d,
    round((((s.revenue_30d - (f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)), (0)::numeric))) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS safety_margin_pct,
    round(((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS days_inventory_on_hand,
    round(((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS ar_days,
    round(((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS ap_days,
    round(((((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0) + ((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0)) - ((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0)), 1) AS cash_conversion_cycle_days,
    round((s.revenue_30d / (NULLIF(s.orders_30d, 0))::numeric), 2) AS avg_revenue_per_order,
    round((((s.revenue_30d - c.cogs_30d) - l.labor_30d) - f.fixed_costs_30d), 2) AS ebit_30d,
    round(interest.interest_expense_30d, 2) AS interest_expense_30d,
        CASE
            WHEN (interest.interest_expense_30d = (0)::numeric) THEN NULL::numeric
            ELSE round(((((s.revenue_30d - c.cogs_30d) - l.labor_30d) - f.fixed_costs_30d) / NULLIF(interest.interest_expense_30d, (0)::numeric)), 2)
        END AS interest_coverage_ratio
   FROM ((((((((params
     CROSS JOIN sales s)
     CROSS JOIN cogs c)
     CROSS JOIN labor l)
     CROSS JOIN fixed f)
     CROSS JOIN interest)
     CROSS JOIN ar)
     CROSS JOIN ap)
     CROSS JOIN inv);


ALTER VIEW analytics.vw_executive_kpis_all_locations OWNER TO neondb_owner;

--
-- Name: vw_executive_kpis_all_locations_live; Type: VIEW; Schema: analytics; Owner: neondb_owner
--

CREATE VIEW analytics.vw_executive_kpis_all_locations_live AS
 SELECT as_of_ts,
    revenue_30d,
    orders_30d,
    cogs_30d,
    gross_profit_30d,
    gross_margin_pct,
    food_cost_ratio_pct,
    labor_cost_30d,
    labor_cost_ratio_pct,
    prime_cost_ratio_pct,
    fixed_costs_30d,
    fixed_cost_coverage_ratio,
    break_even_revenue_30d,
    safety_margin_pct,
    days_inventory_on_hand,
    ar_days,
    ap_days,
    cash_conversion_cycle_days,
    avg_revenue_per_order,
    ebit_30d,
    interest_expense_30d,
    interest_coverage_ratio
   FROM analytics.get_executive_kpis_all_locations(now()) get_executive_kpis_all_locations(as_of_ts, revenue_30d, orders_30d, cogs_30d, gross_profit_30d, gross_margin_pct, food_cost_ratio_pct, labor_cost_30d, labor_cost_ratio_pct, prime_cost_ratio_pct, fixed_costs_30d, fixed_cost_coverage_ratio, break_even_revenue_30d, safety_margin_pct, days_inventory_on_hand, ar_days, ap_days, cash_conversion_cycle_days, avg_revenue_per_order, ebit_30d, interest_expense_30d, interest_coverage_ratio);


ALTER VIEW analytics.vw_executive_kpis_all_locations_live OWNER TO neondb_owner;

--
-- Name: dim_location; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.dim_location (
    location_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_code text NOT NULL,
    name text NOT NULL,
    city text,
    state text,
    timezone text DEFAULT 'America/New_York'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE restaurant.dim_location OWNER TO neondb_owner;

--
-- Name: vw_executive_kpis_by_location; Type: VIEW; Schema: analytics; Owner: neondb_owner
--

CREATE VIEW analytics.vw_executive_kpis_by_location AS
 WITH params AS (
         SELECT now() AS as_of_ts
        ), tw AS (
         SELECT params_1.as_of_ts,
            (params_1.as_of_ts - '30 days'::interval) AS start_ts,
            ((params_1.as_of_ts)::date - 30) AS start_date,
            (params_1.as_of_ts)::date AS end_date
           FROM params params_1
        ), sales AS (
         SELECT o.location_id,
            count(*) AS orders_30d,
            COALESCE(sum((o.gross_sales - o.discount)), (0)::numeric) AS revenue_30d
           FROM (restaurant.fact_order o
             JOIN tw ON (true))
          WHERE ((o.order_ts >= tw.start_ts) AND (o.order_ts < tw.as_of_ts))
          GROUP BY o.location_id
        ), cogs AS (
         SELECT o.location_id,
            COALESCE(sum(((oi.qty)::numeric * oi.unit_cost)), (0)::numeric) AS cogs_30d
           FROM ((restaurant.fact_order o
             JOIN restaurant.fact_order_item oi ON ((oi.order_id = o.order_id)))
             JOIN tw ON (true))
          WHERE ((o.order_ts >= tw.start_ts) AND (o.order_ts < tw.as_of_ts))
          GROUP BY o.location_id
        ), labor AS (
         SELECT ls.location_id,
            COALESCE(sum((ls.hours_worked * ls.hourly_rate)), (0)::numeric) AS labor_30d
           FROM (restaurant.fact_labor_shift ls
             JOIN tw ON (true))
          WHERE ((ls.shift_date >= tw.start_date) AND (ls.shift_date < tw.end_date))
          GROUP BY ls.location_id
        ), fixed AS (
         SELECT f_1.location_id,
            COALESCE(sum(f_1.amount), (0)::numeric) AS fixed_costs_30d
           FROM (restaurant.fact_fixed_cost_daily f_1
             JOIN tw ON (true))
          WHERE ((f_1.cost_date >= tw.start_date) AND (f_1.cost_date < tw.end_date) AND (f_1.cost_type = 'Fixed'::text))
          GROUP BY f_1.location_id
        ), interest AS (
         SELECT f_1.location_id,
            COALESCE(sum(f_1.amount), (0)::numeric) AS interest_expense_30d
           FROM (restaurant.fact_fixed_cost_daily f_1
             JOIN tw ON (true))
          WHERE ((f_1.cost_date >= tw.start_date) AND (f_1.cost_date < tw.end_date) AND (f_1.cost_type = 'Interest'::text))
          GROUP BY f_1.location_id
        ), ar AS (
         SELECT a.location_id,
            avg(a.ar_balance) AS avg_ar_balance_30d
           FROM (restaurant.fact_ar_snapshot_daily a
             JOIN tw ON (true))
          WHERE ((a.snapshot_date >= tw.start_date) AND (a.snapshot_date < tw.end_date))
          GROUP BY a.location_id
        ), ap AS (
         SELECT p.location_id,
            avg(p.ap_balance) AS avg_ap_balance_30d
           FROM (restaurant.fact_ap_snapshot_daily p
             JOIN tw ON (true))
          WHERE ((p.snapshot_date >= tw.start_date) AND (p.snapshot_date < tw.end_date))
          GROUP BY p.location_id
        ), inv AS (
         SELECT i_1.location_id,
            avg(i_1.inventory_value) AS avg_inv_value_30d
           FROM (restaurant.fact_inventory_on_hand_daily i_1
             JOIN tw ON (true))
          WHERE ((i_1.snapshot_date >= tw.start_date) AND (i_1.snapshot_date < tw.end_date))
          GROUP BY i_1.location_id
        )
 SELECT params.as_of_ts,
    dl.location_code,
    dl.name,
    round(s.revenue_30d, 2) AS revenue_30d,
    s.orders_30d,
    round(c.cogs_30d, 2) AS cogs_30d,
    round((s.revenue_30d - c.cogs_30d), 2) AS gross_profit_30d,
    round((((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS gross_margin_pct,
    round(((c.cogs_30d / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS food_cost_ratio_pct,
    round(l.labor_30d, 2) AS labor_cost_30d,
    round(((l.labor_30d / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS labor_cost_ratio_pct,
    round((((c.cogs_30d + l.labor_30d) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS prime_cost_ratio_pct,
    round(f.fixed_costs_30d, 2) AS fixed_costs_30d,
    round(((s.revenue_30d - c.cogs_30d) / NULLIF(f.fixed_costs_30d, (0)::numeric)), 2) AS fixed_cost_coverage_ratio,
    round((f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)), (0)::numeric)), 2) AS break_even_revenue_30d,
    round((((s.revenue_30d - (f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)), (0)::numeric))) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS safety_margin_pct,
    round(((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS days_inventory_on_hand,
    round(((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS ar_days,
    round(((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS ap_days,
    round(((((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0) + ((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0)) - ((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0)), 1) AS cash_conversion_cycle_days,
    round((s.revenue_30d / (NULLIF(s.orders_30d, 0))::numeric), 2) AS avg_revenue_per_order,
    round((((s.revenue_30d - c.cogs_30d) - l.labor_30d) - f.fixed_costs_30d), 2) AS ebit_30d,
    round(COALESCE(i.interest_expense_30d, (0)::numeric), 2) AS interest_expense_30d,
        CASE
            WHEN (COALESCE(i.interest_expense_30d, (0)::numeric) = (0)::numeric) THEN NULL::numeric
            ELSE round(((((s.revenue_30d - c.cogs_30d) - l.labor_30d) - f.fixed_costs_30d) / NULLIF(i.interest_expense_30d, (0)::numeric)), 2)
        END AS interest_coverage_ratio
   FROM (((((((((params
     JOIN sales s ON (true))
     JOIN cogs c ON ((c.location_id = s.location_id)))
     JOIN labor l ON ((l.location_id = s.location_id)))
     JOIN fixed f ON ((f.location_id = s.location_id)))
     LEFT JOIN interest i ON ((i.location_id = s.location_id)))
     LEFT JOIN ar ON ((ar.location_id = s.location_id)))
     LEFT JOIN ap ON ((ap.location_id = s.location_id)))
     LEFT JOIN inv ON ((inv.location_id = s.location_id)))
     JOIN restaurant.dim_location dl ON ((dl.location_id = s.location_id)));


ALTER VIEW analytics.vw_executive_kpis_by_location OWNER TO neondb_owner;

--
-- Name: vw_kpi_executive_all; Type: VIEW; Schema: analytics; Owner: neondb_owner
--

CREATE VIEW analytics.vw_kpi_executive_all AS
 WITH params AS (
         SELECT '2026-02-19 00:00:00+00'::timestamp with time zone AS as_of_ts
        ), tw AS (
         SELECT params.as_of_ts,
            (params.as_of_ts - '30 days'::interval) AS start_ts,
            ((params.as_of_ts)::date - 30) AS start_date,
            (params.as_of_ts)::date AS end_date
           FROM params
        ), sales AS (
         SELECT count(*) AS orders_30d,
            COALESCE(sum((o.gross_sales - o.discount)), (0)::numeric) AS revenue_30d
           FROM (restaurant.fact_order o
             JOIN tw ON (true))
          WHERE ((o.order_ts >= tw.start_ts) AND (o.order_ts < tw.as_of_ts))
        ), cogs AS (
         SELECT COALESCE(sum(((oi.qty)::numeric * oi.unit_cost)), (0)::numeric) AS cogs_30d
           FROM ((restaurant.fact_order o
             JOIN restaurant.fact_order_item oi ON ((oi.order_id = o.order_id)))
             JOIN tw ON (true))
          WHERE ((o.order_ts >= tw.start_ts) AND (o.order_ts < tw.as_of_ts))
        ), labor AS (
         SELECT COALESCE(sum((ls.hours_worked * ls.hourly_rate)), (0)::numeric) AS labor_30d
           FROM (restaurant.fact_labor_shift ls
             JOIN tw ON (true))
          WHERE ((ls.shift_date >= tw.start_date) AND (ls.shift_date < tw.end_date))
        ), fixed AS (
         SELECT COALESCE(sum(f_1.amount), (0)::numeric) AS fixed_costs_30d
           FROM (restaurant.fact_fixed_cost_daily f_1
             JOIN tw ON (true))
          WHERE ((f_1.cost_date >= tw.start_date) AND (f_1.cost_date < tw.end_date) AND (f_1.cost_type = 'Fixed'::text))
        ), interest AS (
         SELECT COALESCE(sum(f_1.amount), (0)::numeric) AS interest_expense_30d
           FROM (restaurant.fact_fixed_cost_daily f_1
             JOIN tw ON (true))
          WHERE ((f_1.cost_date >= tw.start_date) AND (f_1.cost_date < tw.end_date) AND (f_1.cost_type = 'Interest'::text))
        ), ar_daily AS (
         SELECT a.snapshot_date,
            sum(a.ar_balance) AS ar_total
           FROM (restaurant.fact_ar_snapshot_daily a
             JOIN tw ON (true))
          WHERE ((a.snapshot_date >= tw.start_date) AND (a.snapshot_date < tw.end_date))
          GROUP BY a.snapshot_date
        ), ap_daily AS (
         SELECT p.snapshot_date,
            sum(p.ap_balance) AS ap_total
           FROM (restaurant.fact_ap_snapshot_daily p
             JOIN tw ON (true))
          WHERE ((p.snapshot_date >= tw.start_date) AND (p.snapshot_date < tw.end_date))
          GROUP BY p.snapshot_date
        ), inv_daily AS (
         SELECT i_1.snapshot_date,
            sum(i_1.inventory_value) AS inv_total
           FROM (restaurant.fact_inventory_on_hand_daily i_1
             JOIN tw ON (true))
          WHERE ((i_1.snapshot_date >= tw.start_date) AND (i_1.snapshot_date < tw.end_date))
          GROUP BY i_1.snapshot_date
        ), ar AS (
         SELECT avg(ar_daily.ar_total) AS avg_ar_balance_30d
           FROM ar_daily
        ), ap AS (
         SELECT avg(ap_daily.ap_total) AS avg_ap_balance_30d
           FROM ap_daily
        ), inv AS (
         SELECT avg(inv_daily.inv_total) AS avg_inv_value_30d
           FROM inv_daily
        )
 SELECT round(s.revenue_30d, 2) AS revenue_30d,
    s.orders_30d,
    round(c.cogs_30d, 2) AS cogs_30d,
    round((s.revenue_30d - c.cogs_30d), 2) AS gross_profit_30d,
    round((((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS gross_margin_pct,
    round(((c.cogs_30d / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS food_cost_ratio_pct,
    round(l.labor_30d, 2) AS labor_cost_30d,
    round(((l.labor_30d / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS labor_cost_ratio_pct,
    round((((c.cogs_30d + l.labor_30d) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS prime_cost_ratio_pct,
    round(f.fixed_costs_30d, 2) AS fixed_costs_30d,
    round(((s.revenue_30d - c.cogs_30d) / NULLIF(f.fixed_costs_30d, (0)::numeric)), 2) AS fixed_cost_coverage_ratio,
    round((f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)), (0)::numeric)), 2) AS break_even_revenue_30d,
    round((((s.revenue_30d - (f.fixed_costs_30d / NULLIF(((s.revenue_30d - c.cogs_30d) / NULLIF(s.revenue_30d, (0)::numeric)), (0)::numeric))) / NULLIF(s.revenue_30d, (0)::numeric)) * (100)::numeric), 2) AS safety_margin_pct,
    round(((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS days_inventory_on_hand,
    round(((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS ar_days,
    round(((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0), 1) AS ap_days,
    round(((((inv.avg_inv_value_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0) + ((ar.avg_ar_balance_30d / NULLIF((s.revenue_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0)) - ((ap.avg_ap_balance_30d / NULLIF((c.cogs_30d * (365.0 / 30.0)), (0)::numeric)) * 365.0)), 1) AS cash_conversion_cycle_days,
    round((s.revenue_30d / (NULLIF(s.orders_30d, 0))::numeric), 2) AS avg_revenue_per_order,
    round((((s.revenue_30d - c.cogs_30d) - l.labor_30d) - f.fixed_costs_30d), 2) AS ebit_30d,
    round(i.interest_expense_30d, 2) AS interest_expense_30d,
        CASE
            WHEN (i.interest_expense_30d = (0)::numeric) THEN NULL::numeric
            ELSE round(((((s.revenue_30d - c.cogs_30d) - l.labor_30d) - f.fixed_costs_30d) / NULLIF(i.interest_expense_30d, (0)::numeric)), 2)
        END AS interest_coverage_ratio
   FROM (((((((sales s
     CROSS JOIN cogs c)
     CROSS JOIN labor l)
     CROSS JOIN fixed f)
     CROSS JOIN interest i)
     CROSS JOIN ar)
     CROSS JOIN ap)
     CROSS JOIN inv);


ALTER VIEW analytics.vw_kpi_executive_all OWNER TO neondb_owner;

--
-- Name: finance_alert_events; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alert_events (
    id bigint NOT NULL,
    alert_key text NOT NULL,
    severity text NOT NULL,
    is_active boolean NOT NULL,
    message text NOT NULL,
    metric_value numeric,
    threshold_value numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT finance_alert_events_severity_check CHECK ((severity = ANY (ARRAY['good'::text, 'warn'::text, 'risk'::text])))
);


ALTER TABLE app.finance_alert_events OWNER TO neondb_owner;

--
-- Name: finance_alert_events_id_seq; Type: SEQUENCE; Schema: app; Owner: neondb_owner
--

CREATE SEQUENCE app.finance_alert_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.finance_alert_events_id_seq OWNER TO neondb_owner;

--
-- Name: finance_alert_events_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: neondb_owner
--

ALTER SEQUENCE app.finance_alert_events_id_seq OWNED BY app.finance_alert_events.id;


--
-- Name: finance_alert_snapshots_burn; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alert_snapshots_burn (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    as_of date,
    avg_daily_burn numeric,
    max_burn numeric
);


ALTER TABLE app.finance_alert_snapshots_burn OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_burn_id_seq; Type: SEQUENCE; Schema: app; Owner: neondb_owner
--

CREATE SEQUENCE app.finance_alert_snapshots_burn_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.finance_alert_snapshots_burn_id_seq OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_burn_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: neondb_owner
--

ALTER SEQUENCE app.finance_alert_snapshots_burn_id_seq OWNED BY app.finance_alert_snapshots_burn.id;


--
-- Name: finance_alert_snapshots_cashflow; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alert_snapshots_cashflow (
    id bigint NOT NULL,
    as_of date,
    net numeric,
    outflow numeric,
    inflow numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.finance_alert_snapshots_cashflow OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_cashflow_id_seq; Type: SEQUENCE; Schema: app; Owner: neondb_owner
--

CREATE SEQUENCE app.finance_alert_snapshots_cashflow_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.finance_alert_snapshots_cashflow_id_seq OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_cashflow_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: neondb_owner
--

ALTER SEQUENCE app.finance_alert_snapshots_cashflow_id_seq OWNED BY app.finance_alert_snapshots_cashflow.id;


--
-- Name: finance_alert_snapshots_exp_category; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alert_snapshots_exp_category (
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    as_of date NOT NULL,
    category text NOT NULL,
    expense numeric,
    txn_count integer,
    total_expense numeric
);


ALTER TABLE app.finance_alert_snapshots_exp_category OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_exp_vendor; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alert_snapshots_exp_vendor (
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    as_of date NOT NULL,
    counterparty text NOT NULL,
    expense numeric,
    txn_count integer,
    total_expense numeric
);


ALTER TABLE app.finance_alert_snapshots_exp_vendor OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_liquidity; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alert_snapshots_liquidity (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    as_of date,
    stress_runway_days numeric
);


ALTER TABLE app.finance_alert_snapshots_liquidity OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_liquidity_id_seq; Type: SEQUENCE; Schema: app; Owner: neondb_owner
--

CREATE SEQUENCE app.finance_alert_snapshots_liquidity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.finance_alert_snapshots_liquidity_id_seq OWNER TO neondb_owner;

--
-- Name: finance_alert_snapshots_liquidity_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: neondb_owner
--

ALTER SEQUENCE app.finance_alert_snapshots_liquidity_id_seq OWNED BY app.finance_alert_snapshots_liquidity.id;


--
-- Name: finance_alerts; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_alerts (
    alert_key text NOT NULL,
    title text NOT NULL,
    severity text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    message text NOT NULL,
    href text,
    metric_value numeric,
    threshold_value numeric,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT finance_alerts_severity_check CHECK ((severity = ANY (ARRAY['good'::text, 'warn'::text, 'risk'::text])))
);


ALTER TABLE app.finance_alerts OWNER TO neondb_owner;

--
-- Name: finance_settings; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.finance_settings (
    id integer DEFAULT 1 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    fiscal_start text DEFAULT 'Jan'::text NOT NULL,
    anomaly_threshold numeric DEFAULT 2.0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cash_on_hand numeric,
    alert_runway_warn_days numeric DEFAULT 45,
    alert_runway_risk_days numeric DEFAULT 30,
    alert_anomaly_7d_warn numeric DEFAULT 2,
    alert_anomaly_7d_risk numeric DEFAULT 4,
    alert_cp_top1_warn numeric DEFAULT 0.25,
    alert_cp_top1_risk numeric DEFAULT 0.40
);


ALTER TABLE app.finance_settings OWNER TO neondb_owner;

--
-- Name: job_heartbeat; Type: TABLE; Schema: app; Owner: neondb_owner
--

CREATE TABLE app.job_heartbeat (
    job_key text NOT NULL,
    last_run_at timestamp with time zone DEFAULT now() NOT NULL,
    last_ok_at timestamp with time zone,
    last_status text DEFAULT 'ok'::text NOT NULL,
    last_message text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.job_heartbeat OWNER TO neondb_owner;

--
-- Name: raw_finance_cashflow; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_finance_cashflow (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dataset_id uuid NOT NULL,
    txn_id text NOT NULL,
    txn_date date NOT NULL,
    account text,
    category text,
    direction text NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    counterparty text,
    memo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_finance_cashflow_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT raw_finance_cashflow_direction_check CHECK ((direction = ANY (ARRAY['inflow'::text, 'outflow'::text])))
);


ALTER TABLE public.raw_finance_cashflow OWNER TO neondb_owner;

--
-- Name: v_finance_health; Type: VIEW; Schema: app; Owner: neondb_owner
--

CREATE VIEW app.v_finance_health AS
 SELECT now() AS now_utc,
    max(created_at) FILTER (WHERE (txn_id ~~ 'gen-%'::text)) AS last_gen_at,
    (EXTRACT(epoch FROM (now() - max(created_at) FILTER (WHERE (txn_id ~~ 'gen-%'::text)))) / 60.0) AS stale_minutes,
    count(*) FILTER (WHERE ((txn_id ~~ 'gen-%'::text) AND (txn_date >= (CURRENT_DATE - '1 day'::interval)))) AS gen_rows_1d
   FROM public.raw_finance_cashflow;


ALTER VIEW app.v_finance_health OWNER TO neondb_owner;

--
-- Name: app_user; Type: TABLE; Schema: auth; Owner: neondb_owner
--

CREATE TABLE auth.app_user (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    onboarding_status text DEFAULT 'pending'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contact text,
    first_name text,
    last_name text
);


ALTER TABLE auth.app_user OWNER TO neondb_owner;

--
-- Name: user_session; Type: TABLE; Schema: auth; Owner: neondb_owner
--

CREATE TABLE auth.user_session (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


ALTER TABLE auth.user_session OWNER TO neondb_owner;

--
-- Name: dim_account_account_id_seq; Type: SEQUENCE; Schema: core; Owner: neondb_owner
--

CREATE SEQUENCE core.dim_account_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.dim_account_account_id_seq OWNER TO neondb_owner;

--
-- Name: dim_account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: neondb_owner
--

ALTER SEQUENCE core.dim_account_account_id_seq OWNED BY core.dim_account.account_id;


--
-- Name: dim_entity; Type: TABLE; Schema: core; Owner: neondb_owner
--

CREATE TABLE core.dim_entity (
    entity_id bigint NOT NULL,
    entity_code text NOT NULL,
    entity_name text NOT NULL,
    currency_code character(3) DEFAULT 'USD'::bpchar NOT NULL,
    region text,
    base_currency_code text,
    country_code text
);


ALTER TABLE core.dim_entity OWNER TO neondb_owner;

--
-- Name: dim_entity_entity_id_seq; Type: SEQUENCE; Schema: core; Owner: neondb_owner
--

CREATE SEQUENCE core.dim_entity_entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.dim_entity_entity_id_seq OWNER TO neondb_owner;

--
-- Name: dim_entity_entity_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: neondb_owner
--

ALTER SEQUENCE core.dim_entity_entity_id_seq OWNED BY core.dim_entity.entity_id;


--
-- Name: fact_cash_txn_cash_txn_id_seq; Type: SEQUENCE; Schema: core; Owner: neondb_owner
--

CREATE SEQUENCE core.fact_cash_txn_cash_txn_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.fact_cash_txn_cash_txn_id_seq OWNER TO neondb_owner;

--
-- Name: fact_cash_txn_cash_txn_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: neondb_owner
--

ALTER SEQUENCE core.fact_cash_txn_cash_txn_id_seq OWNED BY core.fact_cash_txn.cash_txn_id;


--
-- Name: fact_gl_activity_activity_id_seq; Type: SEQUENCE; Schema: core; Owner: neondb_owner
--

CREATE SEQUENCE core.fact_gl_activity_activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.fact_gl_activity_activity_id_seq OWNER TO neondb_owner;

--
-- Name: fact_gl_activity_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: neondb_owner
--

ALTER SEQUENCE core.fact_gl_activity_activity_id_seq OWNED BY core.fact_gl_activity.activity_id;


--
-- Name: fact_gl_balance_balance_id_seq; Type: SEQUENCE; Schema: core; Owner: neondb_owner
--

CREATE SEQUENCE core.fact_gl_balance_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.fact_gl_balance_balance_id_seq OWNER TO neondb_owner;

--
-- Name: fact_gl_balance_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: neondb_owner
--

ALTER SEQUENCE core.fact_gl_balance_balance_id_seq OWNED BY core.fact_gl_balance.balance_id;


--
-- Name: finance_budget_monthly; Type: TABLE; Schema: kpi; Owner: neondb_owner
--

CREATE TABLE kpi.finance_budget_monthly (
    month date NOT NULL,
    budget_outflow numeric DEFAULT 0 NOT NULL,
    notes text
);


ALTER TABLE kpi.finance_budget_monthly OWNER TO neondb_owner;

--
-- Name: raw_ecommerce_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_ecommerce_orders (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dataset_id uuid NOT NULL,
    order_id text NOT NULL,
    order_date date NOT NULL,
    customer_id text NOT NULL,
    sku text NOT NULL,
    product_name text,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    cogs numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    shipping numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    channel text,
    status text DEFAULT 'paid'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_ecommerce_orders_cogs_check CHECK ((cogs >= (0)::numeric)),
    CONSTRAINT raw_ecommerce_orders_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT raw_ecommerce_orders_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT raw_ecommerce_orders_shipping_check CHECK ((shipping >= (0)::numeric)),
    CONSTRAINT raw_ecommerce_orders_tax_check CHECK ((tax >= (0)::numeric)),
    CONSTRAINT raw_ecommerce_orders_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.raw_ecommerce_orders OWNER TO neondb_owner;

--
-- Name: v_ecommerce_kpis; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_ecommerce_kpis AS
 WITH base AS (
         SELECT raw_ecommerce_orders.row_id,
            raw_ecommerce_orders.dataset_id,
            raw_ecommerce_orders.order_id,
            raw_ecommerce_orders.order_date,
            raw_ecommerce_orders.customer_id,
            raw_ecommerce_orders.sku,
            raw_ecommerce_orders.product_name,
            raw_ecommerce_orders.quantity,
            raw_ecommerce_orders.unit_price,
            raw_ecommerce_orders.cogs,
            raw_ecommerce_orders.discount,
            raw_ecommerce_orders.shipping,
            raw_ecommerce_orders.tax,
            raw_ecommerce_orders.channel,
            raw_ecommerce_orders.status,
            raw_ecommerce_orders.created_at
           FROM public.raw_ecommerce_orders
          WHERE (raw_ecommerce_orders.order_date >= (CURRENT_DATE - '30 days'::interval))
        )
 SELECT (COALESCE(sum((((((quantity)::numeric * unit_price) - discount) + shipping) + tax)), (0)::numeric))::numeric(12,2) AS revenue_30d,
    (COALESCE(sum(((quantity)::numeric * cogs)), (0)::numeric))::numeric(12,2) AS cogs_30d,
        CASE
            WHEN (COALESCE(sum((((((quantity)::numeric * unit_price) - discount) + shipping) + tax)), (0)::numeric) = (0)::numeric) THEN (0)::numeric
            ELSE round((((1)::numeric - (COALESCE(sum(((quantity)::numeric * cogs)), (0)::numeric) / NULLIF(COALESCE(sum((((((quantity)::numeric * unit_price) - discount) + shipping) + tax)), (0)::numeric), (0)::numeric))) * (100)::numeric), 2)
        END AS gross_margin_pct_30d,
    COALESCE(count(DISTINCT customer_id), (0)::bigint) AS customers_30d,
    COALESCE(count(DISTINCT order_id), (0)::bigint) AS orders_30d
   FROM base;


ALTER VIEW kpi.v_ecommerce_kpis OWNER TO neondb_owner;

--
-- Name: v_finance_anomalies_daily_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_anomalies_daily_30d AS
 WITH settings AS (
         SELECT COALESCE(( SELECT finance_settings.anomaly_threshold
                   FROM app.finance_settings
                  WHERE (finance_settings.id = 1)), (2)::numeric) AS anomaly_threshold
        ), days AS (
         SELECT (generate_series((CURRENT_DATE - '29 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::date AS day
        ), daily AS (
         SELECT raw_finance_cashflow.txn_date AS day,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'outflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS outflow,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'inflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS inflow
           FROM public.raw_finance_cashflow
          WHERE (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '60 days'::interval))
          GROUP BY raw_finance_cashflow.txn_date
        ), filled AS (
         SELECT d.day,
            COALESCE(x.inflow, (0)::numeric) AS inflow,
            COALESCE(x.outflow, (0)::numeric) AS outflow
           FROM (days d
             LEFT JOIN daily x ON ((x.day = d.day)))
        ), scored AS (
         SELECT f.day,
            f.inflow,
            f.outflow,
            avg(f.outflow) OVER (ORDER BY f.day ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING) AS avg_outflow_14d,
            stddev_samp(f.outflow) OVER (ORDER BY f.day ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING) AS sd_outflow_14d
           FROM filled f
        )
 SELECT day,
    inflow,
    outflow,
    COALESCE(avg_outflow_14d, (0)::numeric) AS avg_outflow_14d,
    COALESCE(sd_outflow_14d, (0)::numeric) AS sd_outflow_14d,
        CASE
            WHEN (COALESCE(avg_outflow_14d, (0)::numeric) = (0)::numeric) THEN NULL::numeric
            ELSE (outflow / NULLIF(avg_outflow_14d, (0)::numeric))
        END AS outflow_ratio,
        CASE
            WHEN (COALESCE(sd_outflow_14d, (0)::numeric) = (0)::numeric) THEN NULL::numeric
            ELSE ((outflow - avg_outflow_14d) / NULLIF(sd_outflow_14d, (0)::numeric))
        END AS outflow_z,
        CASE
            WHEN ((avg_outflow_14d IS NULL) OR (avg_outflow_14d <= (0)::numeric)) THEN false
            WHEN (((outflow / NULLIF(avg_outflow_14d, (0)::numeric)) >= ( SELECT settings.anomaly_threshold
               FROM settings)) AND (outflow >= (1)::numeric)) THEN true
            ELSE false
        END AS is_anomaly
   FROM scored s
  ORDER BY day;


ALTER VIEW kpi.v_finance_anomalies_daily_30d OWNER TO neondb_owner;

--
-- Name: v_finance_budget_vs_actual_12m; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_budget_vs_actual_12m AS
 WITH months AS (
         SELECT (generate_series((date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) - '11 mons'::interval), date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone), '1 mon'::interval))::date AS month
        ), actual AS (
         SELECT (date_trunc('month'::text, (raw_finance_cashflow.txn_date)::timestamp with time zone))::date AS month,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'outflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS actual_outflow
           FROM public.raw_finance_cashflow
          WHERE (raw_finance_cashflow.txn_date >= (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) - '11 mons'::interval))
          GROUP BY ((date_trunc('month'::text, (raw_finance_cashflow.txn_date)::timestamp with time zone))::date)
        )
 SELECT m.month,
    COALESCE(b.budget_outflow, (0)::numeric) AS budget_outflow,
    COALESCE(a.actual_outflow, (0)::numeric) AS actual_outflow,
    (COALESCE(a.actual_outflow, (0)::numeric) - COALESCE(b.budget_outflow, (0)::numeric)) AS variance,
        CASE
            WHEN (COALESCE(b.budget_outflow, (0)::numeric) > (0)::numeric) THEN (((COALESCE(a.actual_outflow, (0)::numeric) - COALESCE(b.budget_outflow, (0)::numeric)) / b.budget_outflow) * (100)::numeric)
            ELSE NULL::numeric
        END AS variance_pct
   FROM ((months m
     LEFT JOIN kpi.finance_budget_monthly b ON ((b.month = m.month)))
     LEFT JOIN actual a ON ((a.month = m.month)))
  ORDER BY m.month;


ALTER VIEW kpi.v_finance_budget_vs_actual_12m OWNER TO neondb_owner;

--
-- Name: v_finance_cashflow_daily_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_cashflow_daily_30d AS
 WITH days AS (
         SELECT (generate_series((CURRENT_DATE - '29 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::date AS day
        ), agg AS (
         SELECT raw_finance_cashflow.txn_date AS day,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'inflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS inflow,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'outflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS outflow
           FROM public.raw_finance_cashflow
          WHERE (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '29 days'::interval))
          GROUP BY raw_finance_cashflow.txn_date
        )
 SELECT d.day,
    COALESCE(a.inflow, (0)::numeric) AS inflow,
    COALESCE(a.outflow, (0)::numeric) AS outflow,
    (COALESCE(a.inflow, (0)::numeric) - COALESCE(a.outflow, (0)::numeric)) AS net
   FROM (days d
     LEFT JOIN agg a ON ((a.day = d.day)))
  ORDER BY d.day;


ALTER VIEW kpi.v_finance_cashflow_daily_30d OWNER TO neondb_owner;

--
-- Name: v_finance_concentration_categories_outflow_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_concentration_categories_outflow_30d AS
 WITH base AS (
         SELECT COALESCE(NULLIF(TRIM(BOTH FROM raw_finance_cashflow.category), ''::text), '—'::text) AS category,
            sum(raw_finance_cashflow.amount) AS outflow,
            (count(*))::integer AS txn_count
           FROM public.raw_finance_cashflow
          WHERE ((lower(raw_finance_cashflow.direction) = 'outflow'::text) AND (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '29 days'::interval)))
          GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM raw_finance_cashflow.category), ''::text), '—'::text)
        ), tot AS (
         SELECT sum(base.outflow) AS total_outflow
           FROM base
        )
 SELECT b.category,
    b.outflow,
        CASE
            WHEN (t.total_outflow > (0)::numeric) THEN (b.outflow / t.total_outflow)
            ELSE (0)::numeric
        END AS share,
    (
        CASE
            WHEN (t.total_outflow > (0)::numeric) THEN (b.outflow / t.total_outflow)
            ELSE (0)::numeric
        END * (100)::numeric) AS share_pct,
    b.txn_count
   FROM (base b
     CROSS JOIN tot t)
  ORDER BY b.outflow DESC;


ALTER VIEW kpi.v_finance_concentration_categories_outflow_30d OWNER TO neondb_owner;

--
-- Name: v_finance_concentration_counterparties_outflow_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_concentration_counterparties_outflow_30d AS
 WITH base AS (
         SELECT COALESCE(NULLIF(TRIM(BOTH FROM raw_finance_cashflow.counterparty), ''::text), '—'::text) AS counterparty,
            sum(raw_finance_cashflow.amount) AS outflow,
            (count(*))::integer AS txn_count
           FROM public.raw_finance_cashflow
          WHERE ((lower(raw_finance_cashflow.direction) = 'outflow'::text) AND (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '29 days'::interval)))
          GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM raw_finance_cashflow.counterparty), ''::text), '—'::text)
        ), tot AS (
         SELECT sum(base.outflow) AS total_outflow
           FROM base
        )
 SELECT b.counterparty,
    b.outflow,
        CASE
            WHEN (t.total_outflow > (0)::numeric) THEN (b.outflow / t.total_outflow)
            ELSE (0)::numeric
        END AS share,
    (
        CASE
            WHEN (t.total_outflow > (0)::numeric) THEN (b.outflow / t.total_outflow)
            ELSE (0)::numeric
        END * (100)::numeric) AS share_pct,
    b.txn_count
   FROM (base b
     CROSS JOIN tot t)
  ORDER BY b.outflow DESC;


ALTER VIEW kpi.v_finance_concentration_counterparties_outflow_30d OWNER TO neondb_owner;

--
-- Name: v_finance_concentration_summary_outflow_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_concentration_summary_outflow_30d AS
 WITH cp AS (
         SELECT v_finance_concentration_counterparties_outflow_30d.counterparty,
            v_finance_concentration_counterparties_outflow_30d.outflow,
            v_finance_concentration_counterparties_outflow_30d.share,
            v_finance_concentration_counterparties_outflow_30d.share_pct,
            v_finance_concentration_counterparties_outflow_30d.txn_count
           FROM kpi.v_finance_concentration_counterparties_outflow_30d
        ), cat AS (
         SELECT v_finance_concentration_categories_outflow_30d.category,
            v_finance_concentration_categories_outflow_30d.outflow,
            v_finance_concentration_categories_outflow_30d.share,
            v_finance_concentration_categories_outflow_30d.share_pct,
            v_finance_concentration_categories_outflow_30d.txn_count
           FROM kpi.v_finance_concentration_categories_outflow_30d
        ), tot AS (
         SELECT COALESCE(sum(x.outflow), (0)::numeric) AS total_outflow
           FROM ( SELECT cp.outflow
                   FROM cp) x
        ), cp_agg AS (
         SELECT COALESCE(max(z.total_outflow), (0)::numeric) AS total_outflow,
            COALESCE(( SELECT cp.share
                   FROM cp
                 LIMIT 1), (0)::numeric) AS cp_top1_share,
            COALESCE(( SELECT sum(t.share) AS sum
                   FROM ( SELECT cp.share
                           FROM cp
                         LIMIT 3) t), (0)::numeric) AS cp_top3_share,
            COALESCE(( SELECT sum(power(cp.share, (2)::numeric)) AS sum
                   FROM cp), (0)::numeric) AS cp_hhi
           FROM ( SELECT ( SELECT tot.total_outflow
                           FROM tot) AS total_outflow) z
        ), cat_agg AS (
         SELECT COALESCE(( SELECT cat.share
                   FROM cat
                 LIMIT 1), (0)::numeric) AS cat_top1_share,
            COALESCE(( SELECT sum(t.share) AS sum
                   FROM ( SELECT cat.share
                           FROM cat
                         LIMIT 3) t), (0)::numeric) AS cat_top3_share,
            COALESCE(( SELECT sum(power(cat.share, (2)::numeric)) AS sum
                   FROM cat), (0)::numeric) AS cat_hhi
        )
 SELECT ( SELECT tot.total_outflow
           FROM tot) AS total_outflow,
    cp_agg.cp_top1_share,
    cp_agg.cp_top3_share,
    cp_agg.cp_hhi,
    cat_agg.cat_top1_share,
    cat_agg.cat_top3_share,
    cat_agg.cat_hhi
   FROM cp_agg,
    cat_agg;


ALTER VIEW kpi.v_finance_concentration_summary_outflow_30d OWNER TO neondb_owner;

--
-- Name: v_finance_expenses_daily_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_expenses_daily_30d AS
 WITH days AS (
         SELECT (generate_series((CURRENT_DATE - '29 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::date AS day
        ), agg AS (
         SELECT raw_finance_cashflow.txn_date AS day,
            sum(raw_finance_cashflow.amount) AS expense
           FROM public.raw_finance_cashflow
          WHERE ((raw_finance_cashflow.txn_date >= (CURRENT_DATE - '29 days'::interval)) AND (lower(raw_finance_cashflow.direction) = 'outflow'::text))
          GROUP BY raw_finance_cashflow.txn_date
        )
 SELECT d.day,
    COALESCE(a.expense, (0)::numeric) AS expense
   FROM (days d
     LEFT JOIN agg a ON ((a.day = d.day)))
  ORDER BY d.day;


ALTER VIEW kpi.v_finance_expenses_daily_30d OWNER TO neondb_owner;

--
-- Name: v_finance_expenses_top_categories_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_expenses_top_categories_30d AS
 SELECT COALESCE(NULLIF(TRIM(BOTH FROM category), ''::text), 'Uncategorized'::text) AS category,
    sum(amount) AS expense,
    (count(*))::integer AS txn_count
   FROM public.raw_finance_cashflow
  WHERE ((txn_date >= (CURRENT_DATE - '29 days'::interval)) AND (lower(direction) = 'outflow'::text))
  GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM category), ''::text), 'Uncategorized'::text)
  ORDER BY (sum(amount)) DESC
 LIMIT 10;


ALTER VIEW kpi.v_finance_expenses_top_categories_30d OWNER TO neondb_owner;

--
-- Name: v_finance_expenses_top_counterparties_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_expenses_top_counterparties_30d AS
 SELECT COALESCE(NULLIF(TRIM(BOTH FROM counterparty), ''::text), 'Unknown'::text) AS counterparty,
    sum(amount) AS expense,
    (count(*))::integer AS txn_count
   FROM public.raw_finance_cashflow
  WHERE ((txn_date >= (CURRENT_DATE - '29 days'::interval)) AND (lower(direction) = 'outflow'::text))
  GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM counterparty), ''::text), 'Unknown'::text)
  ORDER BY (sum(amount)) DESC
 LIMIT 10;


ALTER VIEW kpi.v_finance_expenses_top_counterparties_30d OWNER TO neondb_owner;

--
-- Name: v_finance_exposure_kpis_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_exposure_kpis_30d AS
 WITH cp AS (
         SELECT COALESCE(NULLIF(TRIM(BOTH FROM raw_finance_cashflow.counterparty), ''::text), 'Unknown'::text) AS counterparty,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'inflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS inflow,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'outflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS outflow
           FROM public.raw_finance_cashflow
          WHERE (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '29 days'::interval))
          GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM raw_finance_cashflow.counterparty), ''::text), 'Unknown'::text)
        ), tot AS (
         SELECT sum(cp.inflow) AS total_inflow,
            sum(cp.outflow) AS total_outflow
           FROM cp
        ), ranked AS (
         SELECT cp.counterparty,
            cp.inflow,
            cp.outflow,
            row_number() OVER (ORDER BY cp.outflow DESC) AS rn_out,
            row_number() OVER (ORDER BY cp.inflow DESC) AS rn_in
           FROM cp
        ), top_out AS (
         SELECT ranked.counterparty,
            ranked.outflow
           FROM ranked
          WHERE (ranked.rn_out = 1)
        ), top_in AS (
         SELECT ranked.counterparty,
            ranked.inflow
           FROM ranked
          WHERE (ranked.rn_in = 1)
        ), hhi AS (
         SELECT
                CASE
                    WHEN (( SELECT tot.total_outflow
                       FROM tot) > (0)::numeric) THEN sum(power((cp.outflow / ( SELECT tot.total_outflow
                       FROM tot)), (2)::numeric))
                    ELSE NULL::numeric
                END AS hhi_outflow
           FROM cp
        )
 SELECT CURRENT_DATE AS as_of,
    ( SELECT tot.total_inflow
           FROM tot) AS total_inflow_30d,
    ( SELECT tot.total_outflow
           FROM tot) AS total_outflow_30d,
    ( SELECT top_out.counterparty
           FROM top_out) AS top_outflow_counterparty,
    ( SELECT top_out.outflow
           FROM top_out) AS top_outflow_amount,
        CASE
            WHEN (( SELECT tot.total_outflow
               FROM tot) > (0)::numeric) THEN ((( SELECT top_out.outflow
               FROM top_out) / ( SELECT tot.total_outflow
               FROM tot)) * (100)::numeric)
            ELSE NULL::numeric
        END AS top_outflow_share_pct,
    ( SELECT top_in.counterparty
           FROM top_in) AS top_inflow_counterparty,
    ( SELECT top_in.inflow
           FROM top_in) AS top_inflow_amount,
        CASE
            WHEN (( SELECT tot.total_inflow
               FROM tot) > (0)::numeric) THEN ((( SELECT top_in.inflow
               FROM top_in) / ( SELECT tot.total_inflow
               FROM tot)) * (100)::numeric)
            ELSE NULL::numeric
        END AS top_inflow_share_pct,
    ( SELECT hhi.hhi_outflow
           FROM hhi) AS hhi_outflow;


ALTER VIEW kpi.v_finance_exposure_kpis_30d OWNER TO neondb_owner;

--
-- Name: v_finance_weekday_avg_8w; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_weekday_avg_8w AS
 SELECT (EXTRACT(dow FROM txn_date))::integer AS dow,
    avg(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (0)::numeric
        END) AS avg_inflow,
    avg(
        CASE
            WHEN (lower(direction) = 'outflow'::text) THEN amount
            ELSE (0)::numeric
        END) AS avg_outflow
   FROM public.raw_finance_cashflow
  WHERE (txn_date >= (CURRENT_DATE - '56 days'::interval))
  GROUP BY ((EXTRACT(dow FROM txn_date))::integer);


ALTER VIEW kpi.v_finance_weekday_avg_8w OWNER TO neondb_owner;

--
-- Name: v_finance_forecast_daily_next_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_forecast_daily_next_30d AS
 WITH future_days AS (
         SELECT (generate_series((CURRENT_DATE + '1 day'::interval), (CURRENT_DATE + '30 days'::interval), '1 day'::interval))::date AS day
        )
 SELECT d.day,
    COALESCE(w.avg_inflow, (0)::numeric) AS inflow_fcst,
    COALESCE(w.avg_outflow, (0)::numeric) AS outflow_fcst,
    (COALESCE(w.avg_inflow, (0)::numeric) - COALESCE(w.avg_outflow, (0)::numeric)) AS net_fcst
   FROM (future_days d
     LEFT JOIN kpi.v_finance_weekday_avg_8w w ON ((w.dow = (EXTRACT(dow FROM d.day))::integer)))
  ORDER BY d.day;


ALTER VIEW kpi.v_finance_forecast_daily_next_30d OWNER TO neondb_owner;

--
-- Name: v_finance_kpis; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_kpis AS
 WITH base AS (
         SELECT raw_finance_cashflow.row_id,
            raw_finance_cashflow.dataset_id,
            raw_finance_cashflow.txn_id,
            raw_finance_cashflow.txn_date,
            raw_finance_cashflow.account,
            raw_finance_cashflow.category,
            raw_finance_cashflow.direction,
            raw_finance_cashflow.amount,
            raw_finance_cashflow.currency,
            raw_finance_cashflow.counterparty,
            raw_finance_cashflow.memo,
            raw_finance_cashflow.created_at
           FROM public.raw_finance_cashflow
          WHERE (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '30 days'::interval))
        ), agg AS (
         SELECT COALESCE(sum(
                CASE
                    WHEN (upper(base.direction) = ANY (ARRAY['IN'::text, 'INFLOW'::text, 'CREDIT'::text])) THEN base.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS inflow_30d,
            COALESCE(sum(
                CASE
                    WHEN (upper(base.direction) = ANY (ARRAY['OUT'::text, 'OUTFLOW'::text, 'DEBIT'::text])) THEN base.amount
                    ELSE (0)::numeric
                END), (0)::numeric) AS outflow_30d
           FROM base
        )
 SELECT round(inflow_30d, 2) AS inflow_30d,
    round(outflow_30d, 2) AS outflow_30d,
    round((inflow_30d - outflow_30d), 2) AS net_cash_flow_30d
   FROM agg;


ALTER VIEW kpi.v_finance_kpis OWNER TO neondb_owner;

--
-- Name: v_finance_liquidity_daily_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_liquidity_daily_30d AS
 WITH days AS (
         SELECT (generate_series((CURRENT_DATE - '29 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::date AS day
        ), daily AS (
         SELECT raw_finance_cashflow.txn_date AS day,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'inflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS inflow,
            sum(
                CASE
                    WHEN (lower(raw_finance_cashflow.direction) = 'outflow'::text) THEN raw_finance_cashflow.amount
                    ELSE (0)::numeric
                END) AS outflow
           FROM public.raw_finance_cashflow
          WHERE (raw_finance_cashflow.txn_date >= (CURRENT_DATE - '60 days'::interval))
          GROUP BY raw_finance_cashflow.txn_date
        ), filled AS (
         SELECT d.day,
            COALESCE(x.inflow, (0)::numeric) AS inflow,
            COALESCE(x.outflow, (0)::numeric) AS outflow
           FROM (days d
             LEFT JOIN daily x ON ((x.day = d.day)))
        )
 SELECT day,
    inflow,
    outflow,
    (inflow - outflow) AS net,
    GREATEST((outflow - inflow), (0)::numeric) AS burn
   FROM filled
  ORDER BY day;


ALTER VIEW kpi.v_finance_liquidity_daily_30d OWNER TO neondb_owner;

--
-- Name: v_finance_liquidity_kpis_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_liquidity_kpis_30d AS
 WITH settings AS (
         SELECT COALESCE(finance_settings.cash_on_hand, (0)::numeric) AS cash_on_hand
           FROM app.finance_settings
          WHERE (finance_settings.id = 1)
        ), agg AS (
         SELECT avg(v_finance_liquidity_daily_30d.burn) FILTER (WHERE (v_finance_liquidity_daily_30d.burn > (0)::numeric)) AS avg_daily_burn,
            max(v_finance_liquidity_daily_30d.burn) AS max_burn
           FROM kpi.v_finance_liquidity_daily_30d
        ), calc AS (
         SELECT CURRENT_DATE AS as_of,
            settings.cash_on_hand,
            agg.avg_daily_burn,
            agg.max_burn,
                CASE
                    WHEN (agg.avg_daily_burn > (0)::numeric) THEN floor((settings.cash_on_hand / agg.avg_daily_burn))
                    ELSE NULL::numeric
                END AS runway_days,
            1.5 AS stress_burn_mult,
            (agg.avg_daily_burn * 1.5) AS stress_daily_burn,
                CASE
                    WHEN (agg.avg_daily_burn > (0)::numeric) THEN floor((settings.cash_on_hand / (agg.avg_daily_burn * 1.5)))
                    ELSE NULL::numeric
                END AS stress_runway_days
           FROM (settings
             CROSS JOIN agg)
        )
 SELECT as_of,
    cash_on_hand,
    avg_daily_burn,
    max_burn,
    runway_days,
    stress_burn_mult,
    stress_daily_burn,
    stress_runway_days,
        CASE
            WHEN (runway_days IS NULL) THEN 'warn'::text
            WHEN ((runway_days < (30)::numeric) OR (stress_runway_days < (21)::numeric)) THEN 'risk'::text
            WHEN ((runway_days < (60)::numeric) OR (stress_runway_days < (45)::numeric)) THEN 'warn'::text
            ELSE 'good'::text
        END AS severity
   FROM calc;


ALTER VIEW kpi.v_finance_liquidity_kpis_30d OWNER TO neondb_owner;

--
-- Name: v_finance_revenue_daily_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_revenue_daily_30d AS
 WITH days AS (
         SELECT (generate_series((CURRENT_DATE - '29 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::date AS day
        ), agg AS (
         SELECT raw_finance_cashflow.txn_date AS day,
            sum(raw_finance_cashflow.amount) AS revenue
           FROM public.raw_finance_cashflow
          WHERE ((raw_finance_cashflow.txn_date >= (CURRENT_DATE - '29 days'::interval)) AND (lower(raw_finance_cashflow.direction) = 'inflow'::text))
          GROUP BY raw_finance_cashflow.txn_date
        )
 SELECT d.day,
    COALESCE(a.revenue, (0)::numeric) AS revenue
   FROM (days d
     LEFT JOIN agg a ON ((a.day = d.day)))
  ORDER BY d.day;


ALTER VIEW kpi.v_finance_revenue_daily_30d OWNER TO neondb_owner;

--
-- Name: v_finance_revenue_top_categories_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_revenue_top_categories_30d AS
 SELECT COALESCE(NULLIF(TRIM(BOTH FROM category), ''::text), 'Uncategorized'::text) AS category,
    sum(amount) AS revenue,
    (count(*))::integer AS txn_count
   FROM public.raw_finance_cashflow
  WHERE ((txn_date >= (CURRENT_DATE - '29 days'::interval)) AND (lower(direction) = 'inflow'::text))
  GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM category), ''::text), 'Uncategorized'::text)
  ORDER BY (sum(amount)) DESC
 LIMIT 10;


ALTER VIEW kpi.v_finance_revenue_top_categories_30d OWNER TO neondb_owner;

--
-- Name: v_finance_revenue_top_counterparties_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_revenue_top_counterparties_30d AS
 SELECT COALESCE(NULLIF(TRIM(BOTH FROM counterparty), ''::text), 'Unknown'::text) AS counterparty,
    sum(amount) AS revenue,
    (count(*))::integer AS txn_count
   FROM public.raw_finance_cashflow
  WHERE ((txn_date >= (CURRENT_DATE - '29 days'::interval)) AND (lower(direction) = 'inflow'::text))
  GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM counterparty), ''::text), 'Unknown'::text)
  ORDER BY (sum(amount)) DESC
 LIMIT 10;


ALTER VIEW kpi.v_finance_revenue_top_counterparties_30d OWNER TO neondb_owner;

--
-- Name: v_finance_top_categories_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_top_categories_30d AS
 SELECT COALESCE(NULLIF(TRIM(BOTH FROM category), ''::text), 'Uncategorized'::text) AS category,
    sum(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (0)::numeric
        END) AS inflow,
    sum(
        CASE
            WHEN (lower(direction) = 'outflow'::text) THEN amount
            ELSE (0)::numeric
        END) AS outflow,
    sum(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (- amount)
        END) AS net,
    count(*) AS txn_count
   FROM public.raw_finance_cashflow
  WHERE (txn_date >= (CURRENT_DATE - '29 days'::interval))
  GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM category), ''::text), 'Uncategorized'::text)
  ORDER BY (abs(sum(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (- amount)
        END))) DESC
 LIMIT 8;


ALTER VIEW kpi.v_finance_top_categories_30d OWNER TO neondb_owner;

--
-- Name: v_finance_top_counterparties_30d; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_finance_top_counterparties_30d AS
 SELECT COALESCE(NULLIF(TRIM(BOTH FROM counterparty), ''::text), 'Unknown'::text) AS counterparty,
    sum(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (0)::numeric
        END) AS inflow,
    sum(
        CASE
            WHEN (lower(direction) = 'outflow'::text) THEN amount
            ELSE (0)::numeric
        END) AS outflow,
    sum(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (- amount)
        END) AS net,
    count(*) AS txn_count
   FROM public.raw_finance_cashflow
  WHERE (txn_date >= (CURRENT_DATE - '29 days'::interval))
  GROUP BY COALESCE(NULLIF(TRIM(BOTH FROM counterparty), ''::text), 'Unknown'::text)
  ORDER BY (abs(sum(
        CASE
            WHEN (lower(direction) = 'inflow'::text) THEN amount
            ELSE (- amount)
        END))) DESC
 LIMIT 8;


ALTER VIEW kpi.v_finance_top_counterparties_30d OWNER TO neondb_owner;

--
-- Name: raw_healthcare_claims; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_healthcare_claims (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dataset_id uuid NOT NULL,
    claim_id text NOT NULL,
    service_date date NOT NULL,
    patient_id text NOT NULL,
    provider_id text NOT NULL,
    payer text,
    total_charge numeric(14,2) NOT NULL,
    allowed_amount numeric(14,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    status text NOT NULL,
    denial_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_healthcare_claims_allowed_amount_check CHECK ((allowed_amount >= (0)::numeric)),
    CONSTRAINT raw_healthcare_claims_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
    CONSTRAINT raw_healthcare_claims_status_check CHECK ((status = ANY (ARRAY['paid'::text, 'denied'::text, 'pending'::text]))),
    CONSTRAINT raw_healthcare_claims_total_charge_check CHECK ((total_charge >= (0)::numeric))
);


ALTER TABLE public.raw_healthcare_claims OWNER TO neondb_owner;

--
-- Name: v_healthcare_kpis; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_healthcare_kpis AS
 WITH base AS (
         SELECT raw_healthcare_claims.row_id,
            raw_healthcare_claims.dataset_id,
            raw_healthcare_claims.claim_id,
            raw_healthcare_claims.service_date,
            raw_healthcare_claims.patient_id,
            raw_healthcare_claims.provider_id,
            raw_healthcare_claims.payer,
            raw_healthcare_claims.total_charge,
            raw_healthcare_claims.allowed_amount,
            raw_healthcare_claims.paid_amount,
            raw_healthcare_claims.status,
            raw_healthcare_claims.denial_reason,
            raw_healthcare_claims.created_at
           FROM public.raw_healthcare_claims
          WHERE (raw_healthcare_claims.service_date >= (CURRENT_DATE - '30 days'::interval))
        ), agg AS (
         SELECT COALESCE(count(*), (0)::bigint) AS claims_30d,
            COALESCE(sum(
                CASE
                    WHEN (upper(base.status) = ANY (ARRAY['DENIED'::text, 'REJECTED'::text])) THEN 1
                    ELSE 0
                END), (0)::bigint) AS denied_30d,
            COALESCE(avg(base.paid_amount), (0)::numeric) AS avg_paid_per_claim_30d
           FROM base
        )
 SELECT claims_30d,
    denied_30d,
        CASE
            WHEN (claims_30d = 0) THEN (0)::numeric
            ELSE round((((denied_30d)::numeric / (claims_30d)::numeric) * (100)::numeric), 2)
        END AS denial_rate_pct_30d,
    round(avg_paid_per_claim_30d, 2) AS avg_paid_per_claim_30d
   FROM agg;


ALTER VIEW kpi.v_healthcare_kpis OWNER TO neondb_owner;

--
-- Name: raw_insurance_claims; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_insurance_claims (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dataset_id uuid NOT NULL,
    claim_id text NOT NULL,
    loss_date date NOT NULL,
    policy_id text NOT NULL,
    customer_id text,
    written_premium numeric(14,2) DEFAULT 0 NOT NULL,
    incurred_loss numeric(14,2) DEFAULT 0 NOT NULL,
    paid_loss numeric(14,2) DEFAULT 0 NOT NULL,
    status text NOT NULL,
    suspected_fraud boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_insurance_claims_incurred_loss_check CHECK ((incurred_loss >= (0)::numeric)),
    CONSTRAINT raw_insurance_claims_paid_loss_check CHECK ((paid_loss >= (0)::numeric)),
    CONSTRAINT raw_insurance_claims_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text]))),
    CONSTRAINT raw_insurance_claims_written_premium_check CHECK ((written_premium >= (0)::numeric))
);


ALTER TABLE public.raw_insurance_claims OWNER TO neondb_owner;

--
-- Name: v_insurance_kpis; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_insurance_kpis AS
 WITH base AS (
         SELECT raw_insurance_claims.row_id,
            raw_insurance_claims.dataset_id,
            raw_insurance_claims.claim_id,
            raw_insurance_claims.loss_date,
            raw_insurance_claims.policy_id,
            raw_insurance_claims.customer_id,
            raw_insurance_claims.written_premium,
            raw_insurance_claims.incurred_loss,
            raw_insurance_claims.paid_loss,
            raw_insurance_claims.status,
            raw_insurance_claims.suspected_fraud,
            raw_insurance_claims.created_at
           FROM public.raw_insurance_claims
          WHERE (raw_insurance_claims.loss_date >= (CURRENT_DATE - '30 days'::interval))
        ), agg AS (
         SELECT COALESCE(sum(base.written_premium), (0)::numeric) AS written_premium_30d,
            COALESCE(sum(base.incurred_loss), (0)::numeric) AS incurred_loss_30d,
            COALESCE(count(*), (0)::bigint) AS claims_30d,
            COALESCE(sum(
                CASE
                    WHEN ((base.suspected_fraud)::text = ANY (ARRAY['true'::text, '1'::text, 't'::text, 'yes'::text, 'y'::text])) THEN 1
                    ELSE 0
                END), (0)::bigint) AS suspected_fraud_30d
           FROM base
        )
 SELECT round(written_premium_30d, 2) AS written_premium_30d,
    round(incurred_loss_30d, 2) AS incurred_loss_30d,
        CASE
            WHEN (written_premium_30d = (0)::numeric) THEN (0)::numeric
            ELSE round(((incurred_loss_30d / written_premium_30d) * (100)::numeric), 2)
        END AS loss_ratio_pct_30d,
    claims_30d,
    suspected_fraud_30d,
        CASE
            WHEN (claims_30d = 0) THEN (0)::numeric
            ELSE round((((suspected_fraud_30d)::numeric / (claims_30d)::numeric) * (100)::numeric), 2)
        END AS suspected_fraud_rate_pct_30d
   FROM agg;


ALTER VIEW kpi.v_insurance_kpis OWNER TO neondb_owner;

--
-- Name: raw_saas_events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_saas_events (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dataset_id uuid NOT NULL,
    event_id text NOT NULL,
    event_date date NOT NULL,
    customer_id text NOT NULL,
    event_type text NOT NULL,
    mrr_delta numeric(12,2) NOT NULL,
    plan text,
    region text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_saas_events_event_type_check CHECK ((event_type = ANY (ARRAY['new'::text, 'expansion'::text, 'contraction'::text, 'churn'::text])))
);


ALTER TABLE public.raw_saas_events OWNER TO neondb_owner;

--
-- Name: v_saas_kpis; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_saas_kpis AS
 WITH base AS (
         SELECT raw_saas_events.row_id,
            raw_saas_events.dataset_id,
            raw_saas_events.event_id,
            raw_saas_events.event_date,
            raw_saas_events.customer_id,
            raw_saas_events.event_type,
            raw_saas_events.mrr_delta,
            raw_saas_events.plan,
            raw_saas_events.region,
            raw_saas_events.created_at
           FROM public.raw_saas_events
          WHERE (raw_saas_events.event_date >= (CURRENT_DATE - '30 days'::interval))
        ), mrr AS (
         SELECT COALESCE(sum(base.mrr_delta), (0)::numeric) AS mrr_delta_30d,
            COALESCE(sum(
                CASE
                    WHEN (lower(base.event_type) = 'churn'::text) THEN 1
                    ELSE 0
                END), (0)::bigint) AS churn_events_30d,
            COALESCE(count(DISTINCT base.customer_id), (0)::bigint) AS active_customers_30d
           FROM base
        )
 SELECT round(mrr_delta_30d, 2) AS mrr_delta_30d,
    churn_events_30d,
    active_customers_30d,
        CASE
            WHEN (active_customers_30d = 0) THEN (0)::numeric
            ELSE round((((churn_events_30d)::numeric / (active_customers_30d)::numeric) * (100)::numeric), 2)
        END AS churn_rate_pct_30d
   FROM mrr;


ALTER VIEW kpi.v_saas_kpis OWNER TO neondb_owner;

--
-- Name: raw_supply_shipments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_supply_shipments (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    dataset_id uuid NOT NULL,
    shipment_id text NOT NULL,
    order_id text,
    ship_date date NOT NULL,
    promised_delivery_date date,
    delivered_date date,
    carrier text,
    origin text,
    destination text,
    sku text,
    quantity integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'in_transit'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT raw_supply_shipments_quantity_check CHECK ((quantity >= 0))
);


ALTER TABLE public.raw_supply_shipments OWNER TO neondb_owner;

--
-- Name: v_supply_kpis; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_supply_kpis AS
 WITH base AS (
         SELECT raw_supply_shipments.row_id,
            raw_supply_shipments.dataset_id,
            raw_supply_shipments.shipment_id,
            raw_supply_shipments.order_id,
            raw_supply_shipments.ship_date,
            raw_supply_shipments.promised_delivery_date,
            raw_supply_shipments.delivered_date,
            raw_supply_shipments.carrier,
            raw_supply_shipments.origin,
            raw_supply_shipments.destination,
            raw_supply_shipments.sku,
            raw_supply_shipments.quantity,
            raw_supply_shipments.status,
            raw_supply_shipments.created_at
           FROM public.raw_supply_shipments
          WHERE (raw_supply_shipments.ship_date >= (CURRENT_DATE - '30 days'::interval))
        ), scored AS (
         SELECT base.row_id,
            base.dataset_id,
            base.shipment_id,
            base.order_id,
            base.ship_date,
            base.promised_delivery_date,
            base.delivered_date,
            base.carrier,
            base.origin,
            base.destination,
            base.sku,
            base.quantity,
            base.status,
            base.created_at,
                CASE
                    WHEN ((base.delivered_date IS NULL) OR (base.promised_delivery_date IS NULL)) THEN NULL::integer
                    WHEN (base.delivered_date <= base.promised_delivery_date) THEN 1
                    ELSE 0
                END AS on_time_flag,
                CASE
                    WHEN ((base.delivered_date IS NULL) OR (base.promised_delivery_date IS NULL)) THEN NULL::integer
                    ELSE GREATEST(0, (base.delivered_date - base.promised_delivery_date))
                END AS delay_days
           FROM base
        )
 SELECT round((COALESCE(avg(on_time_flag), (0)::numeric) * (100)::numeric), 2) AS on_time_rate_pct_30d,
    round(COALESCE(avg(delay_days), (0)::numeric), 2) AS avg_delay_days_30d,
    COALESCE(count(*), (0)::bigint) AS shipments_30d
   FROM scored;


ALTER VIEW kpi.v_supply_kpis OWNER TO neondb_owner;

--
-- Name: v_kpi_bundle_json; Type: VIEW; Schema: kpi; Owner: neondb_owner
--

CREATE VIEW kpi.v_kpi_bundle_json AS
 SELECT jsonb_build_object('financeKPIs', ( SELECT to_jsonb(f.*) AS to_jsonb
           FROM kpi.v_finance_kpis f), 'saasKPIs', ( SELECT to_jsonb(s.*) AS to_jsonb
           FROM kpi.v_saas_kpis s), 'supplyKPIs', ( SELECT to_jsonb(x.*) AS to_jsonb
           FROM kpi.v_supply_kpis x), 'healthcareKPIs', ( SELECT to_jsonb(h.*) AS to_jsonb
           FROM kpi.v_healthcare_kpis h), 'insuranceKPIs', ( SELECT to_jsonb(i.*) AS to_jsonb
           FROM kpi.v_insurance_kpis i), 'ecommerceKPIs', ( SELECT to_jsonb(e.*) AS to_jsonb
           FROM kpi.v_ecommerce_kpis e)) AS kpis_json;


ALTER VIEW kpi.v_kpi_bundle_json OWNER TO neondb_owner;

--
-- Name: kpi_monthly; Type: TABLE; Schema: mart; Owner: neondb_owner
--

CREATE TABLE mart.kpi_monthly (
    month_start_date date NOT NULL,
    entity_id bigint NOT NULL,
    kpi_code text NOT NULL,
    kpi_value numeric(20,6) NOT NULL,
    unit text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE mart.kpi_monthly OWNER TO neondb_owner;

--
-- Name: dim_customer; Type: TABLE; Schema: ops; Owner: neondb_owner
--

CREATE TABLE ops.dim_customer (
    customer_id bigint NOT NULL,
    customer_key text,
    customer_name text NOT NULL,
    segment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE ops.dim_customer OWNER TO neondb_owner;

--
-- Name: dim_customer_customer_id_seq; Type: SEQUENCE; Schema: ops; Owner: neondb_owner
--

CREATE SEQUENCE ops.dim_customer_customer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE ops.dim_customer_customer_id_seq OWNER TO neondb_owner;

--
-- Name: dim_customer_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: ops; Owner: neondb_owner
--

ALTER SEQUENCE ops.dim_customer_customer_id_seq OWNED BY ops.dim_customer.customer_id;


--
-- Name: fact_subscription_monthly; Type: TABLE; Schema: ops; Owner: neondb_owner
--

CREATE TABLE ops.fact_subscription_monthly (
    month_start_date date NOT NULL,
    entity_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    status text NOT NULL,
    mrr numeric(18,2) DEFAULT 0 NOT NULL,
    CONSTRAINT fact_subscription_monthly_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'CANCELLED'::text])))
);


ALTER TABLE ops.fact_subscription_monthly OWNER TO neondb_owner;

--
-- Name: v_monthly_churn; Type: VIEW; Schema: ops; Owner: neondb_owner
--

CREATE VIEW ops.v_monthly_churn AS
 WITH prev_active AS (
         SELECT s.entity_id,
            s.month_start_date AS prev_month_start,
            count(*) FILTER (WHERE (s.status = 'ACTIVE'::text)) AS customers_active_start
           FROM ops.fact_subscription_monthly s
          GROUP BY s.entity_id, s.month_start_date
        ), lost AS (
         SELECT cur.entity_id,
            cur.month_start_date,
            count(*) AS customers_lost
           FROM (ops.fact_subscription_monthly cur
             JOIN ops.fact_subscription_monthly prev ON (((prev.entity_id = cur.entity_id) AND (prev.customer_id = cur.customer_id) AND (prev.month_start_date = ((cur.month_start_date - '1 mon'::interval))::date))))
          WHERE ((prev.status = 'ACTIVE'::text) AND (cur.status = 'CANCELLED'::text))
          GROUP BY cur.entity_id, cur.month_start_date
        ), mrr AS (
         SELECT fact_subscription_monthly.entity_id,
            fact_subscription_monthly.month_start_date,
            sum(fact_subscription_monthly.mrr) FILTER (WHERE (fact_subscription_monthly.status = 'ACTIVE'::text)) AS mrr_active,
            count(*) FILTER (WHERE (fact_subscription_monthly.status = 'ACTIVE'::text)) AS customers_active_end
           FROM ops.fact_subscription_monthly
          GROUP BY fact_subscription_monthly.entity_id, fact_subscription_monthly.month_start_date
        ), months AS (
         SELECT DISTINCT fact_subscription_monthly.month_start_date,
            fact_subscription_monthly.entity_id
           FROM ops.fact_subscription_monthly
        )
 SELECT m.month_start_date,
    m.entity_id,
    COALESCE(pa.customers_active_start, (0)::bigint) AS customers_active_start,
    COALESCE(l.customers_lost, (0)::bigint) AS customers_lost,
    COALESCE(mr.customers_active_end, (0)::bigint) AS customers_active_end,
    COALESCE(mr.mrr_active, (0)::numeric) AS mrr_active,
        CASE
            WHEN (COALESCE(mr.customers_active_end, (0)::bigint) = 0) THEN NULL::numeric
            ELSE (COALESCE(mr.mrr_active, (0)::numeric) / (NULLIF(mr.customers_active_end, 0))::numeric)
        END AS arpu_mrr,
        CASE
            WHEN (COALESCE(pa.customers_active_start, (0)::bigint) = 0) THEN NULL::numeric
            ELSE ((COALESCE(l.customers_lost, (0)::bigint))::numeric / (NULLIF(pa.customers_active_start, 0))::numeric)
        END AS churn_rate
   FROM (((months m
     LEFT JOIN prev_active pa ON (((pa.entity_id = m.entity_id) AND (pa.prev_month_start = ((m.month_start_date - '1 mon'::interval))::date))))
     LEFT JOIN lost l ON (((l.entity_id = m.entity_id) AND (l.month_start_date = m.month_start_date))))
     LEFT JOIN mrr mr ON (((mr.entity_id = m.entity_id) AND (mr.month_start_date = m.month_start_date))));


ALTER VIEW ops.v_monthly_churn OWNER TO neondb_owner;

--
-- Name: action_feedback; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.action_feedback (
    feedback_id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid NOT NULL,
    accepted boolean,
    notes text,
    outcome jsonb DEFAULT '{}'::jsonb NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.action_feedback OWNER TO neondb_owner;

--
-- Name: alert; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.alert (
    alert_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    alert_type text NOT NULL,
    severity public.severity NOT NULL,
    severity_score numeric(10,4) DEFAULT 0 NOT NULL,
    title text NOT NULL,
    body text,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.alert_status DEFAULT 'open'::public.alert_status NOT NULL,
    related_entities jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.alert OWNER TO neondb_owner;

--
-- Name: alert_action; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.alert_action (
    action_id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid NOT NULL,
    action_type text NOT NULL,
    recommended jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.alert_action OWNER TO neondb_owner;

--
-- Name: anomaly_score; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.anomaly_score (
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    kpi_name text NOT NULL,
    business_date date NOT NULL,
    score numeric(12,6) NOT NULL,
    expected_value numeric(18,6),
    actual_value numeric(18,6),
    z_score numeric(12,6),
    drivers jsonb DEFAULT '{}'::jsonb NOT NULL,
    model_run_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.anomaly_score OWNER TO neondb_owner;

--
-- Name: app_user; Type: VIEW; Schema: public; Owner: neondb_owner
--

CREATE VIEW public.app_user AS
 SELECT user_id,
    email,
    password_hash,
    full_name,
    created_at,
    onboarding_status
   FROM auth.app_user;


ALTER VIEW public.app_user OWNER TO neondb_owner;

--
-- Name: app_user_old; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.app_user_old (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email public.citext NOT NULL,
    full_name text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    password_hash text
);


ALTER TABLE public.app_user_old OWNER TO neondb_owner;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_log (
    audit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid,
    actor_user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    before_json jsonb,
    after_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.audit_log FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_log OWNER TO neondb_owner;

--
-- Name: feature_registry; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.feature_registry (
    feature_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    feature_name text NOT NULL,
    entity_type text NOT NULL,
    grain text NOT NULL,
    description text,
    computation_sql text,
    owner text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feature_registry OWNER TO neondb_owner;

--
-- Name: feature_value; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.feature_value (
    tenant_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    as_of_date date NOT NULL,
    feature_name text NOT NULL,
    feature_value numeric(18,6),
    feature_value_json jsonb,
    version integer DEFAULT 1 NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feature_value OWNER TO neondb_owner;

--
-- Name: ingestion_run; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ingestion_run (
    run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    source_system text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    stats jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.ingestion_run OWNER TO neondb_owner;

--
-- Name: inventory_movement; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_movement (
    movement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    business_date date NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL,
    vendor_id uuid,
    movement_type public.inventory_movement_type NOT NULL,
    qty numeric(14,4) NOT NULL,
    unit_cost numeric(14,4),
    extended_cost numeric(14,4),
    reference_type text,
    reference_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (business_date);


ALTER TABLE public.inventory_movement OWNER TO neondb_owner;

--
-- Name: inventory_movement_2026_03; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_movement_2026_03 (
    movement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    business_date date NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid NOT NULL,
    vendor_id uuid,
    movement_type public.inventory_movement_type NOT NULL,
    qty numeric(14,4) NOT NULL,
    unit_cost numeric(14,4),
    extended_cost numeric(14,4),
    reference_type text,
    reference_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_movement_2026_03 OWNER TO neondb_owner;

--
-- Name: inventory_on_hand; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_on_hand (
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    product_id uuid NOT NULL,
    as_of_date date NOT NULL,
    qty_on_hand numeric(14,4) NOT NULL,
    value_on_hand numeric(14,4),
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_on_hand OWNER TO neondb_owner;

--
-- Name: kpi_registry; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.kpi_registry (
    kpi_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    kpi_name text NOT NULL,
    description text,
    grain text NOT NULL,
    formula_sql text,
    owner text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.kpi_registry OWNER TO neondb_owner;

--
-- Name: kpi_snapshot; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.kpi_snapshot (
    snapshot_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    kpi_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    value numeric(18,6) NOT NULL,
    numerator numeric(18,6),
    denominator numeric(18,6),
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    lineage jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.kpi_snapshot OWNER TO neondb_owner;

--
-- Name: location; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.location (
    location_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    timezone text DEFAULT 'America/New_York'::text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.location OWNER TO neondb_owner;

--
-- Name: menu_category; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.menu_category (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.menu_category OWNER TO neondb_owner;

--
-- Name: menu_item; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.menu_item (
    item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid,
    category_id uuid,
    sku text,
    name text NOT NULL,
    current_price numeric(12,2),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.menu_item OWNER TO neondb_owner;

--
-- Name: model_run; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.model_run (
    model_run_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    model_name text NOT NULL,
    model_version text NOT NULL,
    window_start date,
    window_end date,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL
);


ALTER TABLE public.model_run OWNER TO neondb_owner;

--
-- Name: pos_check; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pos_check (
    check_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    business_date date NOT NULL,
    opened_at timestamp with time zone,
    closed_at timestamp with time zone,
    guests integer,
    table_no text,
    status text DEFAULT 'closed'::text NOT NULL,
    source_system text NOT NULL,
    source_check_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pos_check OWNER TO neondb_owner;

--
-- Name: pos_line_item; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pos_line_item (
    line_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    check_id uuid NOT NULL,
    business_date date NOT NULL,
    item_id uuid,
    item_name text,
    qty numeric(12,3) DEFAULT 1 NOT NULL,
    unit_price numeric(12,2) DEFAULT 0 NOT NULL,
    gross_sales numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amt numeric(12,2) DEFAULT 0 NOT NULL,
    tax_amt numeric(12,2) DEFAULT 0 NOT NULL,
    net_sales numeric(12,2) DEFAULT 0 NOT NULL,
    void_flag boolean DEFAULT false NOT NULL,
    comp_flag boolean DEFAULT false NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (business_date);


ALTER TABLE public.pos_line_item OWNER TO neondb_owner;

--
-- Name: pos_payment; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.pos_payment (
    payment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    check_id uuid NOT NULL,
    business_date date NOT NULL,
    method text NOT NULL,
    amount numeric(12,2) NOT NULL,
    tip_amount numeric(12,2) DEFAULT 0 NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pos_payment OWNER TO neondb_owner;

--
-- Name: product; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.product (
    product_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    category text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product OWNER TO neondb_owner;

--
-- Name: product_vendor; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.product_vendor (
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    vendor_sku text,
    preferred boolean DEFAULT false NOT NULL,
    last_unit_cost numeric(14,4),
    last_invoice_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_vendor OWNER TO neondb_owner;

--
-- Name: purchase_order; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_order (
    po_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    status public.po_status DEFAULT 'draft'::public.po_status NOT NULL,
    requested_delivery_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_order OWNER TO neondb_owner;

--
-- Name: purchase_order_line; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_order_line (
    po_line_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    po_id uuid NOT NULL,
    product_id uuid NOT NULL,
    qty_ordered numeric(14,4) NOT NULL,
    unit_cost_est numeric(14,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_order_line OWNER TO neondb_owner;

--
-- Name: raw_event; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_event (
    raw_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid,
    source_system text NOT NULL,
    source_stream text NOT NULL,
    source_record_id text,
    event_time timestamp with time zone NOT NULL,
    ingested_at timestamp with time zone DEFAULT now() NOT NULL,
    ingestion_run_id uuid,
    payload jsonb NOT NULL,
    payload_hash bytea NOT NULL,
    status public.event_status DEFAULT 'new'::public.event_status NOT NULL,
    error_code text,
    error_detail text
);


ALTER TABLE public.raw_event OWNER TO neondb_owner;

--
-- Name: tenant; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.tenant (
    tenant_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    plan text DEFAULT 'trial'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.tenant FORCE ROW LEVEL SECURITY;


ALTER TABLE public.tenant OWNER TO neondb_owner;

--
-- Name: vendor; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vendor (
    vendor_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    terms jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vendor OWNER TO neondb_owner;

--
-- Name: vendor_invoice; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vendor_invoice (
    invoice_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    invoice_no text NOT NULL,
    invoice_date date NOT NULL,
    status public.invoice_status DEFAULT 'received'::public.invoice_status NOT NULL,
    total_amount numeric(14,4),
    tax_amount numeric(14,4),
    document_url text,
    ocr_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vendor_invoice OWNER TO neondb_owner;

--
-- Name: vendor_invoice_line; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vendor_invoice_line (
    invoice_line_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    product_id uuid,
    product_name text,
    qty numeric(14,4) DEFAULT 0 NOT NULL,
    unit_cost numeric(14,4),
    extended_cost numeric(14,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vendor_invoice_line OWNER TO neondb_owner;

--
-- Name: dim_labor_rate; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.dim_labor_rate (
    labor_rate_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id text,
    effective_from date NOT NULL,
    avg_hourly_rate numeric NOT NULL,
    overtime_multiplier numeric DEFAULT 1.5 NOT NULL,
    overtime_share_pct numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dim_labor_rate_avg_hourly_rate_check CHECK ((avg_hourly_rate > (0)::numeric)),
    CONSTRAINT dim_labor_rate_overtime_multiplier_check CHECK ((overtime_multiplier >= (1)::numeric)),
    CONSTRAINT dim_labor_rate_overtime_share_pct_check CHECK (((overtime_share_pct >= (0)::numeric) AND (overtime_share_pct <= (100)::numeric)))
);


ALTER TABLE restaurant.dim_labor_rate OWNER TO neondb_owner;

--
-- Name: dim_menu_item; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.dim_menu_item (
    menu_item_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    price numeric(10,2) NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE restaurant.dim_menu_item OWNER TO neondb_owner;

--
-- Name: fact_inventory_item_on_hand_daily; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_inventory_item_on_hand_daily (
    snapshot_date date NOT NULL,
    location_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    qty_on_hand numeric DEFAULT 0 NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    inventory_value numeric GENERATED ALWAYS AS ((qty_on_hand * unit_cost)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE restaurant.fact_inventory_item_on_hand_daily OWNER TO neondb_owner;

--
-- Name: fact_inventory_purchase; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.fact_inventory_purchase (
    purchase_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    purchase_date date NOT NULL,
    vendor text NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fact_inventory_purchase_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE restaurant.fact_inventory_purchase OWNER TO neondb_owner;

--
-- Name: raw_restaurant_daily; Type: TABLE; Schema: restaurant; Owner: neondb_owner
--

CREATE TABLE restaurant.raw_restaurant_daily (
    row_id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id text NOT NULL,
    location_name text,
    day date NOT NULL,
    revenue numeric(14,2) DEFAULT 0 NOT NULL,
    cogs numeric(14,2) DEFAULT 0 NOT NULL,
    labor numeric(14,2) DEFAULT 0 NOT NULL,
    fixed_costs numeric(14,2) DEFAULT 0 NOT NULL,
    marketing_spend numeric(14,2) DEFAULT 0 NOT NULL,
    interest_expense numeric(14,2) DEFAULT 0 NOT NULL,
    orders integer DEFAULT 0 NOT NULL,
    customers integer DEFAULT 0 NOT NULL,
    new_customers integer DEFAULT 0 NOT NULL,
    avg_inventory numeric(14,2) DEFAULT 0 NOT NULL,
    ar_balance numeric(14,2) DEFAULT 0 NOT NULL,
    ap_balance numeric(14,2) DEFAULT 0 NOT NULL,
    ebit numeric(14,2) DEFAULT 0 NOT NULL,
    source_file text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE restaurant.raw_restaurant_daily OWNER TO neondb_owner;

--
-- Name: restaurant_csv_mappings; Type: TABLE; Schema: staging; Owner: neondb_owner
--

CREATE TABLE staging.restaurant_csv_mappings (
    mapping_id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id uuid NOT NULL,
    dataset text NOT NULL,
    date_col text NOT NULL,
    location_col text,
    location_mode text DEFAULT 'code'::text NOT NULL,
    metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    validation_errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurant_csv_mappings_dataset_check CHECK ((dataset = ANY (ARRAY['sales'::text, 'labor'::text, 'inventory'::text]))),
    CONSTRAINT restaurant_csv_mappings_location_mode_check CHECK ((location_mode = ANY (ARRAY['code'::text, 'id'::text, 'name'::text]))),
    CONSTRAINT restaurant_csv_mappings_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'promoted'::text, 'error'::text])))
);


ALTER TABLE staging.restaurant_csv_mappings OWNER TO neondb_owner;

--
-- Name: restaurant_csv_rows; Type: TABLE; Schema: staging; Owner: neondb_owner
--

CREATE TABLE staging.restaurant_csv_rows (
    upload_id uuid NOT NULL,
    row_num integer NOT NULL,
    "row" jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE staging.restaurant_csv_rows OWNER TO neondb_owner;

--
-- Name: restaurant_csv_uploads; Type: TABLE; Schema: staging; Owner: neondb_owner
--

CREATE TABLE staging.restaurant_csv_uploads (
    upload_id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    filename text NOT NULL,
    size_bytes integer DEFAULT 0 NOT NULL,
    row_count integer DEFAULT 0 NOT NULL,
    columns jsonb DEFAULT '[]'::jsonb NOT NULL,
    csv_text text NOT NULL,
    location_id uuid,
    dataset text,
    raw_csv bytea
);


ALTER TABLE staging.restaurant_csv_uploads OWNER TO neondb_owner;

--
-- Name: inventory_movement_2026_03; Type: TABLE ATTACH; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_movement ATTACH PARTITION public.inventory_movement_2026_03 FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');


--
-- Name: finance_alert_events id; Type: DEFAULT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_events ALTER COLUMN id SET DEFAULT nextval('app.finance_alert_events_id_seq'::regclass);


--
-- Name: finance_alert_snapshots_burn id; Type: DEFAULT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_snapshots_burn ALTER COLUMN id SET DEFAULT nextval('app.finance_alert_snapshots_burn_id_seq'::regclass);


--
-- Name: finance_alert_snapshots_cashflow id; Type: DEFAULT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_snapshots_cashflow ALTER COLUMN id SET DEFAULT nextval('app.finance_alert_snapshots_cashflow_id_seq'::regclass);


--
-- Name: finance_alert_snapshots_liquidity id; Type: DEFAULT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_snapshots_liquidity ALTER COLUMN id SET DEFAULT nextval('app.finance_alert_snapshots_liquidity_id_seq'::regclass);


--
-- Name: dim_account account_id; Type: DEFAULT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_account ALTER COLUMN account_id SET DEFAULT nextval('core.dim_account_account_id_seq'::regclass);


--
-- Name: dim_entity entity_id; Type: DEFAULT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_entity ALTER COLUMN entity_id SET DEFAULT nextval('core.dim_entity_entity_id_seq'::regclass);


--
-- Name: fact_cash_txn cash_txn_id; Type: DEFAULT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_cash_txn ALTER COLUMN cash_txn_id SET DEFAULT nextval('core.fact_cash_txn_cash_txn_id_seq'::regclass);


--
-- Name: fact_gl_activity activity_id; Type: DEFAULT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_activity ALTER COLUMN activity_id SET DEFAULT nextval('core.fact_gl_activity_activity_id_seq'::regclass);


--
-- Name: fact_gl_balance balance_id; Type: DEFAULT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_balance ALTER COLUMN balance_id SET DEFAULT nextval('core.fact_gl_balance_balance_id_seq'::regclass);


--
-- Name: dim_customer customer_id; Type: DEFAULT; Schema: ops; Owner: neondb_owner
--

ALTER TABLE ONLY ops.dim_customer ALTER COLUMN customer_id SET DEFAULT nextval('ops.dim_customer_customer_id_seq'::regclass);


--
-- Name: fact_labor_daily fact_labor_daily_pkey; Type: CONSTRAINT; Schema: analytics; Owner: neondb_owner
--

ALTER TABLE ONLY analytics.fact_labor_daily
    ADD CONSTRAINT fact_labor_daily_pkey PRIMARY KEY (labor_date, location_code);


--
-- Name: finance_alert_events finance_alert_events_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_events
    ADD CONSTRAINT finance_alert_events_pkey PRIMARY KEY (id);


--
-- Name: finance_alert_snapshots_burn finance_alert_snapshots_burn_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_snapshots_burn
    ADD CONSTRAINT finance_alert_snapshots_burn_pkey PRIMARY KEY (id);


--
-- Name: finance_alert_snapshots_cashflow finance_alert_snapshots_cashflow_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_snapshots_cashflow
    ADD CONSTRAINT finance_alert_snapshots_cashflow_pkey PRIMARY KEY (id);


--
-- Name: finance_alert_snapshots_liquidity finance_alert_snapshots_liquidity_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alert_snapshots_liquidity
    ADD CONSTRAINT finance_alert_snapshots_liquidity_pkey PRIMARY KEY (id);


--
-- Name: finance_alerts finance_alerts_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_alerts
    ADD CONSTRAINT finance_alerts_pkey PRIMARY KEY (alert_key);


--
-- Name: finance_settings finance_settings_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.finance_settings
    ADD CONSTRAINT finance_settings_pkey PRIMARY KEY (id);


--
-- Name: job_heartbeat job_heartbeat_pkey; Type: CONSTRAINT; Schema: app; Owner: neondb_owner
--

ALTER TABLE ONLY app.job_heartbeat
    ADD CONSTRAINT job_heartbeat_pkey PRIMARY KEY (job_key);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: auth; Owner: neondb_owner
--

ALTER TABLE ONLY auth.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: auth; Owner: neondb_owner
--

ALTER TABLE ONLY auth.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (user_id);


--
-- Name: user_session user_session_pkey; Type: CONSTRAINT; Schema: auth; Owner: neondb_owner
--

ALTER TABLE ONLY auth.user_session
    ADD CONSTRAINT user_session_pkey PRIMARY KEY (session_id);


--
-- Name: dim_account dim_account_account_code_key; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_account
    ADD CONSTRAINT dim_account_account_code_key UNIQUE (account_code);


--
-- Name: dim_account dim_account_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_account
    ADD CONSTRAINT dim_account_pkey PRIMARY KEY (account_id);


--
-- Name: dim_date dim_date_date_key; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_date
    ADD CONSTRAINT dim_date_date_key UNIQUE (date);


--
-- Name: dim_date dim_date_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_date
    ADD CONSTRAINT dim_date_pkey PRIMARY KEY (date_key);


--
-- Name: dim_entity dim_entity_entity_code_key; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_entity
    ADD CONSTRAINT dim_entity_entity_code_key UNIQUE (entity_code);


--
-- Name: dim_entity dim_entity_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.dim_entity
    ADD CONSTRAINT dim_entity_pkey PRIMARY KEY (entity_id);


--
-- Name: fact_ap_snapshot fact_ap_snapshot_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_ap_snapshot
    ADD CONSTRAINT fact_ap_snapshot_pkey PRIMARY KEY (date_key, entity_id);


--
-- Name: fact_ar_snapshot fact_ar_snapshot_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_ar_snapshot
    ADD CONSTRAINT fact_ar_snapshot_pkey PRIMARY KEY (date_key, entity_id);


--
-- Name: fact_cash_txn fact_cash_txn_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_cash_txn
    ADD CONSTRAINT fact_cash_txn_pkey PRIMARY KEY (cash_txn_id);


--
-- Name: fact_gl_activity fact_gl_activity_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_activity
    ADD CONSTRAINT fact_gl_activity_pkey PRIMARY KEY (activity_id);


--
-- Name: fact_gl_balance fact_gl_balance_date_key_entity_id_account_id_key; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_balance
    ADD CONSTRAINT fact_gl_balance_date_key_entity_id_account_id_key UNIQUE (date_key, entity_id, account_id);


--
-- Name: fact_gl_balance fact_gl_balance_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_balance
    ADD CONSTRAINT fact_gl_balance_pkey PRIMARY KEY (balance_id);


--
-- Name: fact_inventory_snapshot fact_inventory_snapshot_pkey; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_inventory_snapshot
    ADD CONSTRAINT fact_inventory_snapshot_pkey PRIMARY KEY (date_key, entity_id);


--
-- Name: fact_cash_txn uq_fact_cash_txn_source_doc_id; Type: CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_cash_txn
    ADD CONSTRAINT uq_fact_cash_txn_source_doc_id UNIQUE (source_doc_id);


--
-- Name: finance_budget_monthly finance_budget_monthly_pkey; Type: CONSTRAINT; Schema: kpi; Owner: neondb_owner
--

ALTER TABLE ONLY kpi.finance_budget_monthly
    ADD CONSTRAINT finance_budget_monthly_pkey PRIMARY KEY (month);


--
-- Name: kpi_monthly kpi_monthly_pkey; Type: CONSTRAINT; Schema: mart; Owner: neondb_owner
--

ALTER TABLE ONLY mart.kpi_monthly
    ADD CONSTRAINT kpi_monthly_pkey PRIMARY KEY (month_start_date, entity_id, kpi_code);


--
-- Name: dim_customer dim_customer_customer_key_key; Type: CONSTRAINT; Schema: ops; Owner: neondb_owner
--

ALTER TABLE ONLY ops.dim_customer
    ADD CONSTRAINT dim_customer_customer_key_key UNIQUE (customer_key);


--
-- Name: dim_customer dim_customer_pkey; Type: CONSTRAINT; Schema: ops; Owner: neondb_owner
--

ALTER TABLE ONLY ops.dim_customer
    ADD CONSTRAINT dim_customer_pkey PRIMARY KEY (customer_id);


--
-- Name: fact_subscription_monthly fact_subscription_monthly_pkey; Type: CONSTRAINT; Schema: ops; Owner: neondb_owner
--

ALTER TABLE ONLY ops.fact_subscription_monthly
    ADD CONSTRAINT fact_subscription_monthly_pkey PRIMARY KEY (month_start_date, entity_id, customer_id);


--
-- Name: action_feedback action_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.action_feedback
    ADD CONSTRAINT action_feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: alert_action alert_action_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alert_action
    ADD CONSTRAINT alert_action_pkey PRIMARY KEY (action_id);


--
-- Name: alert alert_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_pkey PRIMARY KEY (alert_id);


--
-- Name: anomaly_score anomaly_score_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.anomaly_score
    ADD CONSTRAINT anomaly_score_pkey PRIMARY KEY (tenant_id, location_id, kpi_name, business_date, model_run_id);


--
-- Name: app_user_old app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.app_user_old
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (user_id);


--
-- Name: app_user_old app_user_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.app_user_old
    ADD CONSTRAINT app_user_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: feature_registry feature_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_registry
    ADD CONSTRAINT feature_registry_pkey PRIMARY KEY (feature_id);


--
-- Name: feature_registry feature_registry_tenant_id_feature_name_entity_type_grain_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_registry
    ADD CONSTRAINT feature_registry_tenant_id_feature_name_entity_type_grain_key UNIQUE (tenant_id, feature_name, entity_type, grain);


--
-- Name: feature_value feature_value_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_value
    ADD CONSTRAINT feature_value_pkey PRIMARY KEY (tenant_id, entity_type, entity_id, as_of_date, feature_name, version);


--
-- Name: ingestion_run ingestion_run_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ingestion_run
    ADD CONSTRAINT ingestion_run_pkey PRIMARY KEY (run_id);


--
-- Name: inventory_movement inventory_movement_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_movement
    ADD CONSTRAINT inventory_movement_pkey PRIMARY KEY (business_date, movement_id);


--
-- Name: inventory_movement_2026_03 inventory_movement_2026_03_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_movement_2026_03
    ADD CONSTRAINT inventory_movement_2026_03_pkey PRIMARY KEY (business_date, movement_id);


--
-- Name: inventory_on_hand inventory_on_hand_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_on_hand
    ADD CONSTRAINT inventory_on_hand_pkey PRIMARY KEY (tenant_id, location_id, product_id, as_of_date);


--
-- Name: kpi_registry kpi_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_registry
    ADD CONSTRAINT kpi_registry_pkey PRIMARY KEY (kpi_id);


--
-- Name: kpi_registry kpi_registry_tenant_id_kpi_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_registry
    ADD CONSTRAINT kpi_registry_tenant_id_kpi_name_key UNIQUE (tenant_id, kpi_name);


--
-- Name: kpi_snapshot kpi_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_snapshot
    ADD CONSTRAINT kpi_snapshot_pkey PRIMARY KEY (snapshot_id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (location_id);


--
-- Name: menu_category menu_category_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_category
    ADD CONSTRAINT menu_category_pkey PRIMARY KEY (category_id);


--
-- Name: menu_item menu_item_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_pkey PRIMARY KEY (item_id);


--
-- Name: model_run model_run_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.model_run
    ADD CONSTRAINT model_run_pkey PRIMARY KEY (model_run_id);


--
-- Name: pos_check pos_check_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_check
    ADD CONSTRAINT pos_check_pkey PRIMARY KEY (check_id);


--
-- Name: pos_check pos_check_tenant_id_source_system_source_check_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_check
    ADD CONSTRAINT pos_check_tenant_id_source_system_source_check_id_key UNIQUE (tenant_id, source_system, source_check_id);


--
-- Name: pos_line_item pos_line_item_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_line_item
    ADD CONSTRAINT pos_line_item_pkey PRIMARY KEY (business_date, line_item_id);


--
-- Name: pos_payment pos_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_payment
    ADD CONSTRAINT pos_payment_pkey PRIMARY KEY (payment_id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- Name: product product_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: product_vendor product_vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_vendor
    ADD CONSTRAINT product_vendor_pkey PRIMARY KEY (tenant_id, product_id, vendor_id);


--
-- Name: purchase_order_line purchase_order_line_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_pkey PRIMARY KEY (po_line_id);


--
-- Name: purchase_order purchase_order_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_pkey PRIMARY KEY (po_id);


--
-- Name: raw_ecommerce_orders raw_ecommerce_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_ecommerce_orders
    ADD CONSTRAINT raw_ecommerce_orders_pkey PRIMARY KEY (row_id);


--
-- Name: raw_event raw_event_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_event
    ADD CONSTRAINT raw_event_pkey PRIMARY KEY (raw_event_id);


--
-- Name: raw_event raw_event_tenant_id_source_system_source_stream_source_reco_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_event
    ADD CONSTRAINT raw_event_tenant_id_source_system_source_stream_source_reco_key UNIQUE (tenant_id, source_system, source_stream, source_record_id);


--
-- Name: raw_finance_cashflow raw_finance_cashflow_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_finance_cashflow
    ADD CONSTRAINT raw_finance_cashflow_pkey PRIMARY KEY (row_id);


--
-- Name: raw_healthcare_claims raw_healthcare_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_healthcare_claims
    ADD CONSTRAINT raw_healthcare_claims_pkey PRIMARY KEY (row_id);


--
-- Name: raw_insurance_claims raw_insurance_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_insurance_claims
    ADD CONSTRAINT raw_insurance_claims_pkey PRIMARY KEY (row_id);


--
-- Name: raw_saas_events raw_saas_events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_saas_events
    ADD CONSTRAINT raw_saas_events_pkey PRIMARY KEY (row_id);


--
-- Name: raw_supply_shipments raw_supply_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_supply_shipments
    ADD CONSTRAINT raw_supply_shipments_pkey PRIMARY KEY (row_id);


--
-- Name: tenant tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_pkey PRIMARY KEY (tenant_id);


--
-- Name: vendor_invoice_line vendor_invoice_line_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice_line
    ADD CONSTRAINT vendor_invoice_line_pkey PRIMARY KEY (invoice_line_id);


--
-- Name: vendor_invoice vendor_invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice
    ADD CONSTRAINT vendor_invoice_pkey PRIMARY KEY (invoice_id);


--
-- Name: vendor_invoice vendor_invoice_tenant_id_vendor_id_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice
    ADD CONSTRAINT vendor_invoice_tenant_id_vendor_id_invoice_no_key UNIQUE (tenant_id, vendor_id, invoice_no);


--
-- Name: vendor vendor_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_pkey PRIMARY KEY (vendor_id);


--
-- Name: vendor vendor_tenant_id_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_tenant_id_name_key UNIQUE (tenant_id, name);


--
-- Name: dim_labor_rate dim_labor_rate_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.dim_labor_rate
    ADD CONSTRAINT dim_labor_rate_pkey PRIMARY KEY (labor_rate_id);


--
-- Name: dim_location dim_location_location_code_key; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.dim_location
    ADD CONSTRAINT dim_location_location_code_key UNIQUE (location_code);


--
-- Name: dim_location dim_location_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.dim_location
    ADD CONSTRAINT dim_location_pkey PRIMARY KEY (location_id);


--
-- Name: dim_menu_item dim_menu_item_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.dim_menu_item
    ADD CONSTRAINT dim_menu_item_pkey PRIMARY KEY (menu_item_id);


--
-- Name: fact_ap_snapshot_daily fact_ap_snapshot_daily_location_id_snapshot_date_key; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_ap_snapshot_daily
    ADD CONSTRAINT fact_ap_snapshot_daily_location_id_snapshot_date_key UNIQUE (location_id, snapshot_date);


--
-- Name: fact_ap_snapshot_daily fact_ap_snapshot_daily_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_ap_snapshot_daily
    ADD CONSTRAINT fact_ap_snapshot_daily_pkey PRIMARY KEY (ap_id);


--
-- Name: fact_ar_snapshot_daily fact_ar_snapshot_daily_location_id_snapshot_date_key; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_ar_snapshot_daily
    ADD CONSTRAINT fact_ar_snapshot_daily_location_id_snapshot_date_key UNIQUE (location_id, snapshot_date);


--
-- Name: fact_ar_snapshot_daily fact_ar_snapshot_daily_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_ar_snapshot_daily
    ADD CONSTRAINT fact_ar_snapshot_daily_pkey PRIMARY KEY (ar_id);


--
-- Name: fact_fixed_cost_daily fact_fixed_cost_daily_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_fixed_cost_daily
    ADD CONSTRAINT fact_fixed_cost_daily_pkey PRIMARY KEY (fixed_cost_id);


--
-- Name: fact_inventory_item_on_hand_daily fact_inventory_item_on_hand_daily_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_inventory_item_on_hand_daily
    ADD CONSTRAINT fact_inventory_item_on_hand_daily_pkey PRIMARY KEY (snapshot_date, location_id, menu_item_id);


--
-- Name: fact_inventory_on_hand_daily fact_inventory_on_hand_daily_location_id_snapshot_date_key; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_inventory_on_hand_daily
    ADD CONSTRAINT fact_inventory_on_hand_daily_location_id_snapshot_date_key UNIQUE (location_id, snapshot_date);


--
-- Name: fact_inventory_on_hand_daily fact_inventory_on_hand_daily_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_inventory_on_hand_daily
    ADD CONSTRAINT fact_inventory_on_hand_daily_pkey PRIMARY KEY (inv_id);


--
-- Name: fact_inventory_purchase fact_inventory_purchase_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_inventory_purchase
    ADD CONSTRAINT fact_inventory_purchase_pkey PRIMARY KEY (purchase_id);


--
-- Name: fact_labor_shift fact_labor_shift_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_labor_shift
    ADD CONSTRAINT fact_labor_shift_pkey PRIMARY KEY (shift_id);


--
-- Name: fact_order_item fact_order_item_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_order_item
    ADD CONSTRAINT fact_order_item_pkey PRIMARY KEY (order_item_id);


--
-- Name: fact_order fact_order_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_order
    ADD CONSTRAINT fact_order_pkey PRIMARY KEY (order_id);


--
-- Name: raw_restaurant_daily raw_restaurant_daily_location_id_day_key; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.raw_restaurant_daily
    ADD CONSTRAINT raw_restaurant_daily_location_id_day_key UNIQUE (location_id, day);


--
-- Name: raw_restaurant_daily raw_restaurant_daily_pkey; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.raw_restaurant_daily
    ADD CONSTRAINT raw_restaurant_daily_pkey PRIMARY KEY (row_id);


--
-- Name: raw_restaurant_daily ux_raw_restaurant_daily_loc_day; Type: CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.raw_restaurant_daily
    ADD CONSTRAINT ux_raw_restaurant_daily_loc_day UNIQUE (location_id, day);


--
-- Name: restaurant_csv_mappings restaurant_csv_mappings_pkey; Type: CONSTRAINT; Schema: staging; Owner: neondb_owner
--

ALTER TABLE ONLY staging.restaurant_csv_mappings
    ADD CONSTRAINT restaurant_csv_mappings_pkey PRIMARY KEY (mapping_id);


--
-- Name: restaurant_csv_rows restaurant_csv_rows_pkey; Type: CONSTRAINT; Schema: staging; Owner: neondb_owner
--

ALTER TABLE ONLY staging.restaurant_csv_rows
    ADD CONSTRAINT restaurant_csv_rows_pkey PRIMARY KEY (upload_id, row_num);


--
-- Name: restaurant_csv_uploads restaurant_csv_uploads_pkey; Type: CONSTRAINT; Schema: staging; Owner: neondb_owner
--

ALTER TABLE ONLY staging.restaurant_csv_uploads
    ADD CONSTRAINT restaurant_csv_uploads_pkey PRIMARY KEY (upload_id);


--
-- Name: finance_alert_events_alert_key_idx; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX finance_alert_events_alert_key_idx ON app.finance_alert_events USING btree (alert_key);


--
-- Name: finance_alert_events_created_at_idx; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX finance_alert_events_created_at_idx ON app.finance_alert_events USING btree (created_at DESC);


--
-- Name: finance_alerts_is_active_idx; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX finance_alerts_is_active_idx ON app.finance_alerts USING btree (is_active);


--
-- Name: finance_alerts_updated_at_idx; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX finance_alerts_updated_at_idx ON app.finance_alerts USING btree (updated_at DESC);


--
-- Name: idx_alert_snapshots_burn_created; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX idx_alert_snapshots_burn_created ON app.finance_alert_snapshots_burn USING btree (created_at DESC);


--
-- Name: idx_fin_alert_snap_burn_created_at; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX idx_fin_alert_snap_burn_created_at ON app.finance_alert_snapshots_burn USING btree (created_at DESC);


--
-- Name: idx_fin_alert_snap_cf_created_at; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX idx_fin_alert_snap_cf_created_at ON app.finance_alert_snapshots_cashflow USING btree (created_at DESC);


--
-- Name: idx_finance_alert_events_key_time; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX idx_finance_alert_events_key_time ON app.finance_alert_events USING btree (alert_key, created_at DESC);


--
-- Name: ix_fin_alert_snap_liq_created_at; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE INDEX ix_fin_alert_snap_liq_created_at ON app.finance_alert_snapshots_liquidity USING btree (created_at DESC);


--
-- Name: ux_fin_alert_snap_burn_asof; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_fin_alert_snap_burn_asof ON app.finance_alert_snapshots_burn USING btree (as_of);


--
-- Name: ux_fin_alert_snap_cf_asof; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_fin_alert_snap_cf_asof ON app.finance_alert_snapshots_cashflow USING btree (as_of);


--
-- Name: ux_fin_alert_snap_liq_asof; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_fin_alert_snap_liq_asof ON app.finance_alert_snapshots_liquidity USING btree (as_of);


--
-- Name: ux_fin_snap_exp_category; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_fin_snap_exp_category ON app.finance_alert_snapshots_exp_category USING btree (as_of, category);


--
-- Name: ux_fin_snap_exp_vendor; Type: INDEX; Schema: app; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_fin_snap_exp_vendor ON app.finance_alert_snapshots_exp_vendor USING btree (as_of, counterparty);


--
-- Name: app_user_email_idx; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX app_user_email_idx ON auth.app_user USING btree (email);


--
-- Name: idx_user_session_expires; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX idx_user_session_expires ON auth.user_session USING btree (expires_at);


--
-- Name: idx_user_session_expires_at; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX idx_user_session_expires_at ON auth.user_session USING btree (expires_at);


--
-- Name: idx_user_session_user; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX idx_user_session_user ON auth.user_session USING btree (user_id);


--
-- Name: idx_user_session_user_id; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX idx_user_session_user_id ON auth.user_session USING btree (user_id);


--
-- Name: user_session_user_idx; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX user_session_user_idx ON auth.user_session USING btree (user_id);


--
-- Name: user_session_valid_idx; Type: INDEX; Schema: auth; Owner: neondb_owner
--

CREATE INDEX user_session_valid_idx ON auth.user_session USING btree (expires_at) WHERE (revoked_at IS NULL);


--
-- Name: ix_cash_txn_category; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_cash_txn_category ON core.fact_cash_txn USING btree (category, subcategory);


--
-- Name: ix_cash_txn_date_entity; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_cash_txn_date_entity ON core.fact_cash_txn USING btree (date_key, entity_id);


--
-- Name: ix_dim_account_group; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_dim_account_group ON core.dim_account USING btree (statement_group);


--
-- Name: ix_gl_activity_account; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_gl_activity_account ON core.fact_gl_activity USING btree (account_id);


--
-- Name: ix_gl_activity_date_entity; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_gl_activity_date_entity ON core.fact_gl_activity USING btree (date_key, entity_id);


--
-- Name: ix_gl_balance_account; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_gl_balance_account ON core.fact_gl_balance USING btree (account_id);


--
-- Name: ix_gl_balance_date_entity; Type: INDEX; Schema: core; Owner: neondb_owner
--

CREATE INDEX ix_gl_balance_date_entity ON core.fact_gl_balance USING btree (date_key, entity_id);


--
-- Name: ix_kpi_monthly_code; Type: INDEX; Schema: mart; Owner: neondb_owner
--

CREATE INDEX ix_kpi_monthly_code ON mart.kpi_monthly USING btree (kpi_code);


--
-- Name: ix_sub_month_entity; Type: INDEX; Schema: ops; Owner: neondb_owner
--

CREATE INDEX ix_sub_month_entity ON ops.fact_subscription_monthly USING btree (month_start_date, entity_id);


--
-- Name: ix_sub_month_status; Type: INDEX; Schema: ops; Owner: neondb_owner
--

CREATE INDEX ix_sub_month_status ON ops.fact_subscription_monthly USING btree (status);


--
-- Name: inventory_movement_2026_03_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_movement_2026_03_loc_date ON public.inventory_movement_2026_03 USING btree (location_id, business_date);


--
-- Name: ix_inv_move_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_inv_move_loc_date ON ONLY public.inventory_movement USING btree (location_id, business_date);


--
-- Name: inventory_movement_2026_03_location_id_business_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_movement_2026_03_location_id_business_date_idx ON public.inventory_movement_2026_03 USING btree (location_id, business_date);


--
-- Name: ix_inv_move_type_time; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_inv_move_type_time ON ONLY public.inventory_movement USING btree (movement_type, occurred_at DESC);


--
-- Name: inventory_movement_2026_03_movement_type_occurred_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_movement_2026_03_movement_type_occurred_at_idx ON public.inventory_movement_2026_03 USING btree (movement_type, occurred_at DESC);


--
-- Name: inventory_movement_2026_03_prod_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_movement_2026_03_prod_date ON public.inventory_movement_2026_03 USING btree (product_id, business_date);


--
-- Name: ix_inv_move_prod_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_inv_move_prod_date ON ONLY public.inventory_movement USING btree (product_id, business_date);


--
-- Name: inventory_movement_2026_03_product_id_business_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_movement_2026_03_product_id_business_date_idx ON public.inventory_movement_2026_03 USING btree (product_id, business_date);


--
-- Name: inventory_movement_2026_03_type_time; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_movement_2026_03_type_time ON public.inventory_movement_2026_03 USING btree (movement_type, occurred_at DESC);


--
-- Name: ix_audit_tenant_time; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_audit_tenant_time ON public.audit_log USING btree (tenant_id, created_at DESC);


--
-- Name: ix_feature_value_lookup; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_feature_value_lookup ON public.feature_value USING btree (tenant_id, entity_type, entity_id, as_of_date DESC);


--
-- Name: ix_invoice_line_invoice; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_invoice_line_invoice ON public.vendor_invoice_line USING btree (invoice_id);


--
-- Name: ix_invoice_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_invoice_loc_date ON public.vendor_invoice USING btree (location_id, invoice_date);


--
-- Name: ix_kpi_snapshot_loc_period; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_kpi_snapshot_loc_period ON public.kpi_snapshot USING btree (location_id, period_start, period_end);


--
-- Name: ix_onhand_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_onhand_loc_date ON public.inventory_on_hand USING btree (location_id, as_of_date DESC);


--
-- Name: ix_po_line_po; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_po_line_po ON public.purchase_order_line USING btree (po_id);


--
-- Name: ix_po_loc_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_po_loc_status ON public.purchase_order USING btree (location_id, status);


--
-- Name: ix_pos_check_loc_closed; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_pos_check_loc_closed ON public.pos_check USING btree (location_id, closed_at);


--
-- Name: ix_pos_check_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_pos_check_loc_date ON public.pos_check USING btree (location_id, business_date);


--
-- Name: ix_pos_line_item_check; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_pos_line_item_check ON ONLY public.pos_line_item USING btree (check_id);


--
-- Name: ix_pos_line_item_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_pos_line_item_loc_date ON ONLY public.pos_line_item USING btree (location_id, business_date);


--
-- Name: ix_pos_payment_loc_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_pos_payment_loc_date ON public.pos_payment USING btree (location_id, business_date);


--
-- Name: ix_product_tenant_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_product_tenant_active ON public.product USING btree (tenant_id, active);


--
-- Name: ix_product_vendor_preferred; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_product_vendor_preferred ON public.product_vendor USING btree (tenant_id, product_id, preferred DESC);


--
-- Name: ix_raw_ecom_dataset_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_ecom_dataset_date ON public.raw_ecommerce_orders USING btree (dataset_id, order_date);


--
-- Name: ix_raw_event_location_time; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_event_location_time ON public.raw_event USING btree (location_id, event_time DESC);


--
-- Name: ix_raw_event_tenant_time; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_event_tenant_time ON public.raw_event USING btree (tenant_id, event_time DESC);


--
-- Name: ix_raw_fin_dataset_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_fin_dataset_date ON public.raw_finance_cashflow USING btree (dataset_id, txn_date);


--
-- Name: ix_raw_hc_dataset_service_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_hc_dataset_service_date ON public.raw_healthcare_claims USING btree (dataset_id, service_date);


--
-- Name: ix_raw_ins_dataset_loss_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_ins_dataset_loss_date ON public.raw_insurance_claims USING btree (dataset_id, loss_date);


--
-- Name: ix_raw_saas_dataset_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_saas_dataset_date ON public.raw_saas_events USING btree (dataset_id, event_date);


--
-- Name: ix_raw_supply_dataset_shipdate; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_raw_supply_dataset_shipdate ON public.raw_supply_shipments USING btree (dataset_id, ship_date);


--
-- Name: ix_vendor_tenant_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX ix_vendor_tenant_active ON public.vendor USING btree (tenant_id, active);


--
-- Name: ux_raw_finance_cashflow_dataset_txn; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_raw_finance_cashflow_dataset_txn ON public.raw_finance_cashflow USING btree (dataset_id, txn_id);


--
-- Name: idx_fact_order_item_order; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_fact_order_item_order ON restaurant.fact_order_item USING btree (order_id);


--
-- Name: idx_fact_order_loc_ts; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_fact_order_loc_ts ON restaurant.fact_order USING btree (location_id, order_ts);


--
-- Name: idx_fixed_loc_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_fixed_loc_date ON restaurant.fact_fixed_cost_daily USING btree (location_id, cost_date);


--
-- Name: idx_inv_item_daily_item; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_inv_item_daily_item ON restaurant.fact_inventory_item_on_hand_daily USING btree (menu_item_id);


--
-- Name: idx_inv_item_daily_loc_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_inv_item_daily_loc_date ON restaurant.fact_inventory_item_on_hand_daily USING btree (location_id, snapshot_date);


--
-- Name: idx_inv_item_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_inv_item_date ON restaurant.fact_inventory_item_on_hand_daily USING btree (snapshot_date);


--
-- Name: idx_inv_item_loc_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_inv_item_loc_date ON restaurant.fact_inventory_item_on_hand_daily USING btree (location_id, snapshot_date);


--
-- Name: idx_inv_loc_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_inv_loc_date ON restaurant.fact_inventory_purchase USING btree (location_id, purchase_date);


--
-- Name: idx_inv_on_hand_loc_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_inv_on_hand_loc_date ON restaurant.fact_inventory_on_hand_daily USING btree (location_id, snapshot_date);


--
-- Name: idx_labor_loc_date; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX idx_labor_loc_date ON restaurant.fact_labor_shift USING btree (location_id, shift_date);


--
-- Name: ix_dim_labor_rate_loc_eff; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX ix_dim_labor_rate_loc_eff ON restaurant.dim_labor_rate USING btree (location_id, effective_from DESC);


--
-- Name: ix_rest_daily_day; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX ix_rest_daily_day ON restaurant.raw_restaurant_daily USING btree (day DESC);


--
-- Name: ix_rest_daily_loc_day; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX ix_rest_daily_loc_day ON restaurant.raw_restaurant_daily USING btree (location_id, day DESC);


--
-- Name: ix_restaurant_daily_day; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX ix_restaurant_daily_day ON restaurant.raw_restaurant_daily USING btree (day);


--
-- Name: ix_restaurant_daily_loc; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE INDEX ix_restaurant_daily_loc ON restaurant.raw_restaurant_daily USING btree (location_id);


--
-- Name: ux_restaurant_daily_loc_day; Type: INDEX; Schema: restaurant; Owner: neondb_owner
--

CREATE UNIQUE INDEX ux_restaurant_daily_loc_day ON restaurant.raw_restaurant_daily USING btree (location_id, day);


--
-- Name: ix_csv_mappings_upload; Type: INDEX; Schema: staging; Owner: neondb_owner
--

CREATE INDEX ix_csv_mappings_upload ON staging.restaurant_csv_mappings USING btree (upload_id);


--
-- Name: ix_csv_rows_upload; Type: INDEX; Schema: staging; Owner: neondb_owner
--

CREATE INDEX ix_csv_rows_upload ON staging.restaurant_csv_rows USING btree (upload_id);


--
-- Name: ix_restaurant_csv_uploads_created_at; Type: INDEX; Schema: staging; Owner: neondb_owner
--

CREATE INDEX ix_restaurant_csv_uploads_created_at ON staging.restaurant_csv_uploads USING btree (created_at DESC);


--
-- Name: inventory_movement_2026_03_location_id_business_date_idx; Type: INDEX ATTACH; Schema: public; Owner: neondb_owner
--

ALTER INDEX public.ix_inv_move_loc_date ATTACH PARTITION public.inventory_movement_2026_03_location_id_business_date_idx;


--
-- Name: inventory_movement_2026_03_movement_type_occurred_at_idx; Type: INDEX ATTACH; Schema: public; Owner: neondb_owner
--

ALTER INDEX public.ix_inv_move_type_time ATTACH PARTITION public.inventory_movement_2026_03_movement_type_occurred_at_idx;


--
-- Name: inventory_movement_2026_03_pkey; Type: INDEX ATTACH; Schema: public; Owner: neondb_owner
--

ALTER INDEX public.inventory_movement_pkey ATTACH PARTITION public.inventory_movement_2026_03_pkey;


--
-- Name: inventory_movement_2026_03_product_id_business_date_idx; Type: INDEX ATTACH; Schema: public; Owner: neondb_owner
--

ALTER INDEX public.ix_inv_move_prod_date ATTACH PARTITION public.inventory_movement_2026_03_product_id_business_date_idx;


--
-- Name: app_user trg_touch_app_user; Type: TRIGGER; Schema: auth; Owner: neondb_owner
--

CREATE TRIGGER trg_touch_app_user BEFORE UPDATE ON auth.app_user FOR EACH ROW EXECUTE FUNCTION auth.touch_updated_at();


--
-- Name: inventory_movement trg_inventory_movement_partition; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_inventory_movement_partition BEFORE INSERT ON public.inventory_movement FOR EACH ROW EXECUTE FUNCTION public.inventory_movement_partition_trigger();


--
-- Name: pos_line_item trg_pos_line_item_partition; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_pos_line_item_partition BEFORE INSERT ON public.pos_line_item FOR EACH ROW EXECUTE FUNCTION public.pos_line_item_partition_trigger();


--
-- Name: user_session user_session_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: neondb_owner
--

ALTER TABLE ONLY auth.user_session
    ADD CONSTRAINT user_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.app_user(user_id) ON DELETE CASCADE;


--
-- Name: fact_ap_snapshot fact_ap_snapshot_date_key_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_ap_snapshot
    ADD CONSTRAINT fact_ap_snapshot_date_key_fkey FOREIGN KEY (date_key) REFERENCES core.dim_date(date_key);


--
-- Name: fact_ap_snapshot fact_ap_snapshot_entity_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_ap_snapshot
    ADD CONSTRAINT fact_ap_snapshot_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: fact_ar_snapshot fact_ar_snapshot_date_key_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_ar_snapshot
    ADD CONSTRAINT fact_ar_snapshot_date_key_fkey FOREIGN KEY (date_key) REFERENCES core.dim_date(date_key);


--
-- Name: fact_ar_snapshot fact_ar_snapshot_entity_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_ar_snapshot
    ADD CONSTRAINT fact_ar_snapshot_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: fact_cash_txn fact_cash_txn_date_key_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_cash_txn
    ADD CONSTRAINT fact_cash_txn_date_key_fkey FOREIGN KEY (date_key) REFERENCES core.dim_date(date_key);


--
-- Name: fact_cash_txn fact_cash_txn_entity_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_cash_txn
    ADD CONSTRAINT fact_cash_txn_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: fact_gl_activity fact_gl_activity_account_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_activity
    ADD CONSTRAINT fact_gl_activity_account_id_fkey FOREIGN KEY (account_id) REFERENCES core.dim_account(account_id);


--
-- Name: fact_gl_activity fact_gl_activity_date_key_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_activity
    ADD CONSTRAINT fact_gl_activity_date_key_fkey FOREIGN KEY (date_key) REFERENCES core.dim_date(date_key);


--
-- Name: fact_gl_activity fact_gl_activity_entity_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_activity
    ADD CONSTRAINT fact_gl_activity_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: fact_gl_balance fact_gl_balance_account_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_balance
    ADD CONSTRAINT fact_gl_balance_account_id_fkey FOREIGN KEY (account_id) REFERENCES core.dim_account(account_id);


--
-- Name: fact_gl_balance fact_gl_balance_date_key_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_balance
    ADD CONSTRAINT fact_gl_balance_date_key_fkey FOREIGN KEY (date_key) REFERENCES core.dim_date(date_key);


--
-- Name: fact_gl_balance fact_gl_balance_entity_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_gl_balance
    ADD CONSTRAINT fact_gl_balance_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: fact_inventory_snapshot fact_inventory_snapshot_date_key_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_inventory_snapshot
    ADD CONSTRAINT fact_inventory_snapshot_date_key_fkey FOREIGN KEY (date_key) REFERENCES core.dim_date(date_key);


--
-- Name: fact_inventory_snapshot fact_inventory_snapshot_entity_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: neondb_owner
--

ALTER TABLE ONLY core.fact_inventory_snapshot
    ADD CONSTRAINT fact_inventory_snapshot_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: kpi_monthly kpi_monthly_entity_id_fkey; Type: FK CONSTRAINT; Schema: mart; Owner: neondb_owner
--

ALTER TABLE ONLY mart.kpi_monthly
    ADD CONSTRAINT kpi_monthly_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: fact_subscription_monthly fact_subscription_monthly_customer_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: neondb_owner
--

ALTER TABLE ONLY ops.fact_subscription_monthly
    ADD CONSTRAINT fact_subscription_monthly_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES ops.dim_customer(customer_id);


--
-- Name: fact_subscription_monthly fact_subscription_monthly_entity_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: neondb_owner
--

ALTER TABLE ONLY ops.fact_subscription_monthly
    ADD CONSTRAINT fact_subscription_monthly_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES core.dim_entity(entity_id);


--
-- Name: action_feedback action_feedback_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.action_feedback
    ADD CONSTRAINT action_feedback_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.alert_action(action_id) ON DELETE CASCADE;


--
-- Name: alert_action alert_action_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alert_action
    ADD CONSTRAINT alert_action_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.alert(alert_id) ON DELETE CASCADE;


--
-- Name: alert alert_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: alert alert_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.alert
    ADD CONSTRAINT alert_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: anomaly_score anomaly_score_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.anomaly_score
    ADD CONSTRAINT anomaly_score_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: anomaly_score anomaly_score_model_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.anomaly_score
    ADD CONSTRAINT anomaly_score_model_run_id_fkey FOREIGN KEY (model_run_id) REFERENCES public.model_run(model_run_id);


--
-- Name: anomaly_score anomaly_score_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.anomaly_score
    ADD CONSTRAINT anomaly_score_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: app_user_old app_user_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.app_user_old
    ADD CONSTRAINT app_user_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: feature_registry feature_registry_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_registry
    ADD CONSTRAINT feature_registry_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: feature_value feature_value_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.feature_value
    ADD CONSTRAINT feature_value_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: audit_log fk_audit_log_actor_user; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_log_actor_user FOREIGN KEY (actor_user_id) REFERENCES public.app_user_old(user_id) ON DELETE SET NULL;


--
-- Name: audit_log fk_audit_log_location; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_log_location FOREIGN KEY (location_id) REFERENCES public.location(location_id) ON DELETE SET NULL;


--
-- Name: audit_log fk_audit_log_tenant; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT fk_audit_log_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: ingestion_run ingestion_run_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ingestion_run
    ADD CONSTRAINT ingestion_run_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: inventory_movement inventory_movement_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.inventory_movement
    ADD CONSTRAINT inventory_movement_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: inventory_movement inventory_movement_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.inventory_movement
    ADD CONSTRAINT inventory_movement_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: inventory_movement inventory_movement_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.inventory_movement
    ADD CONSTRAINT inventory_movement_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: inventory_movement inventory_movement_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.inventory_movement
    ADD CONSTRAINT inventory_movement_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE SET NULL;


--
-- Name: inventory_on_hand inventory_on_hand_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_on_hand
    ADD CONSTRAINT inventory_on_hand_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: inventory_on_hand inventory_on_hand_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_on_hand
    ADD CONSTRAINT inventory_on_hand_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: inventory_on_hand inventory_on_hand_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_on_hand
    ADD CONSTRAINT inventory_on_hand_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: kpi_registry kpi_registry_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_registry
    ADD CONSTRAINT kpi_registry_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: kpi_snapshot kpi_snapshot_kpi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_snapshot
    ADD CONSTRAINT kpi_snapshot_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES public.kpi_registry(kpi_id);


--
-- Name: kpi_snapshot kpi_snapshot_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_snapshot
    ADD CONSTRAINT kpi_snapshot_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: kpi_snapshot kpi_snapshot_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.kpi_snapshot
    ADD CONSTRAINT kpi_snapshot_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: location location_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: menu_category menu_category_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_category
    ADD CONSTRAINT menu_category_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: menu_category menu_category_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_category
    ADD CONSTRAINT menu_category_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: menu_item menu_item_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_category(category_id);


--
-- Name: menu_item menu_item_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: menu_item menu_item_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: model_run model_run_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.model_run
    ADD CONSTRAINT model_run_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: pos_check pos_check_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_check
    ADD CONSTRAINT pos_check_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: pos_check pos_check_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_check
    ADD CONSTRAINT pos_check_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: pos_line_item pos_line_item_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.pos_line_item
    ADD CONSTRAINT pos_line_item_check_id_fkey FOREIGN KEY (check_id) REFERENCES public.pos_check(check_id) ON DELETE CASCADE;


--
-- Name: pos_line_item pos_line_item_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.pos_line_item
    ADD CONSTRAINT pos_line_item_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.menu_item(item_id);


--
-- Name: pos_line_item pos_line_item_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.pos_line_item
    ADD CONSTRAINT pos_line_item_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: pos_line_item pos_line_item_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.pos_line_item
    ADD CONSTRAINT pos_line_item_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: pos_payment pos_payment_check_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_payment
    ADD CONSTRAINT pos_payment_check_id_fkey FOREIGN KEY (check_id) REFERENCES public.pos_check(check_id) ON DELETE CASCADE;


--
-- Name: pos_payment pos_payment_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_payment
    ADD CONSTRAINT pos_payment_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: pos_payment pos_payment_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.pos_payment
    ADD CONSTRAINT pos_payment_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: product product_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: product_vendor product_vendor_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_vendor
    ADD CONSTRAINT product_vendor_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_vendor product_vendor_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_vendor
    ADD CONSTRAINT product_vendor_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: product_vendor product_vendor_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_vendor
    ADD CONSTRAINT product_vendor_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id) ON DELETE CASCADE;


--
-- Name: purchase_order_line purchase_order_line_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_order(po_id) ON DELETE CASCADE;


--
-- Name: purchase_order_line purchase_order_line_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id);


--
-- Name: purchase_order_line purchase_order_line_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: purchase_order purchase_order_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: purchase_order purchase_order_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: purchase_order purchase_order_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id);


--
-- Name: raw_event raw_event_ingestion_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_event
    ADD CONSTRAINT raw_event_ingestion_run_id_fkey FOREIGN KEY (ingestion_run_id) REFERENCES public.ingestion_run(run_id);


--
-- Name: raw_event raw_event_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_event
    ADD CONSTRAINT raw_event_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: raw_event raw_event_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_event
    ADD CONSTRAINT raw_event_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: vendor_invoice_line vendor_invoice_line_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice_line
    ADD CONSTRAINT vendor_invoice_line_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.vendor_invoice(invoice_id) ON DELETE CASCADE;


--
-- Name: vendor_invoice_line vendor_invoice_line_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice_line
    ADD CONSTRAINT vendor_invoice_line_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE SET NULL;


--
-- Name: vendor_invoice_line vendor_invoice_line_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice_line
    ADD CONSTRAINT vendor_invoice_line_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: vendor_invoice vendor_invoice_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice
    ADD CONSTRAINT vendor_invoice_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(location_id);


--
-- Name: vendor_invoice vendor_invoice_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice
    ADD CONSTRAINT vendor_invoice_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: vendor_invoice vendor_invoice_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor_invoice
    ADD CONSTRAINT vendor_invoice_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendor(vendor_id);


--
-- Name: vendor vendor_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(tenant_id);


--
-- Name: fact_ap_snapshot_daily fact_ap_snapshot_daily_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_ap_snapshot_daily
    ADD CONSTRAINT fact_ap_snapshot_daily_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: fact_ar_snapshot_daily fact_ar_snapshot_daily_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_ar_snapshot_daily
    ADD CONSTRAINT fact_ar_snapshot_daily_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: fact_fixed_cost_daily fact_fixed_cost_daily_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_fixed_cost_daily
    ADD CONSTRAINT fact_fixed_cost_daily_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: fact_inventory_on_hand_daily fact_inventory_on_hand_daily_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_inventory_on_hand_daily
    ADD CONSTRAINT fact_inventory_on_hand_daily_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: fact_inventory_purchase fact_inventory_purchase_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_inventory_purchase
    ADD CONSTRAINT fact_inventory_purchase_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: fact_labor_shift fact_labor_shift_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_labor_shift
    ADD CONSTRAINT fact_labor_shift_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: fact_order_item fact_order_item_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_order_item
    ADD CONSTRAINT fact_order_item_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES restaurant.dim_menu_item(menu_item_id);


--
-- Name: fact_order_item fact_order_item_order_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_order_item
    ADD CONSTRAINT fact_order_item_order_id_fkey FOREIGN KEY (order_id) REFERENCES restaurant.fact_order(order_id) ON DELETE CASCADE;


--
-- Name: fact_order fact_order_location_id_fkey; Type: FK CONSTRAINT; Schema: restaurant; Owner: neondb_owner
--

ALTER TABLE ONLY restaurant.fact_order
    ADD CONSTRAINT fact_order_location_id_fkey FOREIGN KEY (location_id) REFERENCES restaurant.dim_location(location_id) ON DELETE CASCADE;


--
-- Name: restaurant_csv_mappings restaurant_csv_mappings_upload_id_fkey; Type: FK CONSTRAINT; Schema: staging; Owner: neondb_owner
--

ALTER TABLE ONLY staging.restaurant_csv_mappings
    ADD CONSTRAINT restaurant_csv_mappings_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES staging.restaurant_csv_uploads(upload_id) ON DELETE CASCADE;


--
-- Name: restaurant_csv_rows restaurant_csv_rows_upload_id_fkey; Type: FK CONSTRAINT; Schema: staging; Owner: neondb_owner
--

ALTER TABLE ONLY staging.restaurant_csv_rows
    ADD CONSTRAINT restaurant_csv_rows_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES staging.restaurant_csv_uploads(upload_id) ON DELETE CASCADE;


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_tenant_insert; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY audit_log_tenant_insert ON public.audit_log FOR INSERT WITH CHECK (((tenant_id)::text = current_setting('app.tenant_id'::text, true)));


--
-- Name: audit_log audit_log_tenant_select; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY audit_log_tenant_select ON public.audit_log FOR SELECT USING (((tenant_id)::text = current_setting('app.tenant_id'::text, true)));


--
-- Name: tenant; Type: ROW SECURITY; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.tenant ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant tenant_self_select; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY tenant_self_select ON public.tenant FOR SELECT USING (((tenant_id)::text = current_setting('app.tenant_id'::text, true)));


--
-- Name: tenant tenant_self_write; Type: POLICY; Schema: public; Owner: neondb_owner
--

CREATE POLICY tenant_self_write ON public.tenant FOR UPDATE USING (((tenant_id)::text = current_setting('app.tenant_id'::text, true))) WITH CHECK (((tenant_id)::text = current_setting('app.tenant_id'::text, true)));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- Name: SCHEMA restaurant; Type: ACL; Schema: -; Owner: neondb_owner
--

GRANT USAGE ON SCHEMA restaurant TO app_user;


--
-- Name: TABLE fact_ap_snapshot_daily; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_ap_snapshot_daily TO app_user;


--
-- Name: TABLE fact_ar_snapshot_daily; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_ar_snapshot_daily TO app_user;


--
-- Name: TABLE fact_fixed_cost_daily; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_fixed_cost_daily TO app_user;


--
-- Name: TABLE fact_inventory_on_hand_daily; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_inventory_on_hand_daily TO app_user;


--
-- Name: TABLE fact_labor_shift; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_labor_shift TO app_user;


--
-- Name: TABLE fact_order; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_order TO app_user;


--
-- Name: TABLE fact_order_item; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_order_item TO app_user;


--
-- Name: TABLE dim_location; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.dim_location TO app_user;


--
-- Name: TABLE dim_labor_rate; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.dim_labor_rate TO app_user;


--
-- Name: TABLE dim_menu_item; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.dim_menu_item TO app_user;


--
-- Name: TABLE fact_inventory_item_on_hand_daily; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_inventory_item_on_hand_daily TO app_user;


--
-- Name: TABLE fact_inventory_purchase; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.fact_inventory_purchase TO app_user;


--
-- Name: TABLE raw_restaurant_daily; Type: ACL; Schema: restaurant; Owner: neondb_owner
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE restaurant.raw_restaurant_daily TO app_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: restaurant; Owner: neondb_owner
--

ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA restaurant GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO app_user;


--
-- PostgreSQL database dump complete
--

\unrestrict imC60VYOxgQuursdezBX2sCcHvHbRgQWQb9spesdkUEQHCWw1WBF2v6XETpc3gA

