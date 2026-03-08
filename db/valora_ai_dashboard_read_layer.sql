-- =========================================================
-- Valora AI Dashboard Read Layer
-- Production-ready MVP SQL pack
-- =========================================================

-- =========================================================
-- 1) Materialized View: Daily Location Summary
-- =========================================================
DROP MATERIALIZED VIEW IF EXISTS ml.mv_dashboard_location_daily;

CREATE MATERIALIZED VIEW ml.mv_dashboard_location_daily AS
WITH risk_agg AS (
    SELECT
        as_of_date,
        tenant_id,
        location_id,
        MAX(severity_score) AS max_severity_score,
        (ARRAY_AGG(severity_band ORDER BY severity_score DESC NULLS LAST))[1] AS max_severity_band
    FROM ml.risk_signal_daily
    GROUP BY as_of_date, tenant_id, location_id
),
action_agg AS (
    SELECT
        as_of_date,
        tenant_id,
        location_id,
        MAX(action_code) FILTER (WHERE priority_rank = 1) AS top_action_code,
        MAX(expected_roi) FILTER (WHERE priority_rank = 1) AS top_expected_roi
    FROM ml.recommended_action_daily
    GROUP BY as_of_date, tenant_id, location_id
)
SELECT
    f.day,
    f.tenant_id,
    f.location_id,
    dl.location_name,
    dl.region,
    dl.country_code,

    f.revenue,
    f.gross_profit,
    f.gross_margin,
    f.food_cost_pct,
    f.labor_cost_pct,
    f.prime_cost_pct,
    f.aov,
    f.orders,
    f.customers,
    f.sales_per_labor_hour,
    f.avg_inventory,
    f.stockout_count,
    f.waste_amount,
    f.waste_pct,

    ib.headline,
    ib.summary_text,

    rs.max_severity_score,
    rs.max_severity_band,

    aa.top_action_code,
    aa.top_expected_roi

FROM restaurant.f_location_daily_features f
LEFT JOIN restaurant.dim_location dl
    ON f.location_id = dl.location_id
LEFT JOIN ml.insight_brief_daily ib
    ON f.day = ib.as_of_date
   AND f.tenant_id = ib.tenant_id
   AND f.location_id = ib.location_id
LEFT JOIN risk_agg rs
    ON f.day = rs.as_of_date
   AND f.tenant_id = rs.tenant_id
   AND f.location_id = rs.location_id
LEFT JOIN action_agg aa
    ON f.day = aa.as_of_date
   AND f.tenant_id = aa.tenant_id
   AND f.location_id = aa.location_id;

CREATE UNIQUE INDEX uq_mv_dashboard_location_daily
ON ml.mv_dashboard_location_daily (day, tenant_id, location_id);

CREATE INDEX idx_mv_dashboard_location_daily_tenant_day
ON ml.mv_dashboard_location_daily (tenant_id, day);

CREATE INDEX idx_mv_dashboard_location_daily_tenant_region_day
ON ml.mv_dashboard_location_daily (tenant_id, region, day);

-- =========================================================
-- 2) Materialized View: Top Risks
-- =========================================================
DROP MATERIALIZED VIEW IF EXISTS ml.mv_dashboard_top_risks;

CREATE MATERIALIZED VIEW ml.mv_dashboard_top_risks AS
SELECT
    r.as_of_date,
    r.tenant_id,
    r.location_id,
    dl.location_name,
    dl.region,
    r.risk_type,
    r.risk_probability,
    r.severity_score,
    r.severity_band,
    r.impact_estimate,
    r.top_drivers_json
FROM ml.risk_signal_daily r
LEFT JOIN restaurant.dim_location dl
    ON r.location_id = dl.location_id;

CREATE INDEX idx_mv_dashboard_top_risks_tenant_day
ON ml.mv_dashboard_top_risks (tenant_id, as_of_date);

CREATE INDEX idx_mv_dashboard_top_risks_severity
ON ml.mv_dashboard_top_risks (tenant_id, as_of_date, severity_score DESC);

-- =========================================================
-- 3) Materialized View: Top Actions
-- =========================================================
DROP MATERIALIZED VIEW IF EXISTS ml.mv_dashboard_top_actions;

CREATE MATERIALIZED VIEW ml.mv_dashboard_top_actions AS
SELECT
    a.as_of_date,
    a.tenant_id,
    a.location_id,
    dl.location_name,
    dl.region,
    a.action_code,
    a.priority_rank,
    a.expected_roi,
    a.difficulty_score,
    a.time_to_impact_days,
    a.rationale_json
FROM ml.recommended_action_daily a
LEFT JOIN restaurant.dim_location dl
    ON a.location_id = dl.location_id;

CREATE INDEX idx_mv_dashboard_top_actions_tenant_day
ON ml.mv_dashboard_top_actions (tenant_id, as_of_date);

CREATE INDEX idx_mv_dashboard_top_actions_priority
ON ml.mv_dashboard_top_actions (tenant_id, as_of_date, priority_rank);

-- =========================================================
-- 4) Materialized View: Insight Briefs
-- =========================================================
DROP MATERIALIZED VIEW IF EXISTS ml.mv_dashboard_insight_briefs;

CREATE MATERIALIZED VIEW ml.mv_dashboard_insight_briefs AS
SELECT
    i.as_of_date,
    i.tenant_id,
    i.location_id,
    dl.location_name,
    dl.region,
    i.headline,
    i.summary_text,
    i.risk_summary_json,
    i.recommended_actions_json
FROM ml.insight_brief_daily i
LEFT JOIN restaurant.dim_location dl
    ON i.location_id = dl.location_id;

CREATE INDEX idx_mv_dashboard_insight_briefs_tenant_day
ON ml.mv_dashboard_insight_briefs (tenant_id, as_of_date);

-- =========================================================
-- 5) Materialized View: Forecast Trend
-- =========================================================
DROP MATERIALIZED VIEW IF EXISTS ml.mv_dashboard_forecast_trend;

CREATE MATERIALIZED VIEW ml.mv_dashboard_forecast_trend AS
SELECT
    f.as_of_date,
    f.forecast_date,
    f.tenant_id,
    f.location_id,
    dl.location_name,
    dl.region,
    f.forecast_metric,
    f.predicted_value,
    f.lower_bound,
    f.upper_bound,
    f.model_name,
    f.model_version
FROM ml.forecast_daily f
LEFT JOIN restaurant.dim_location dl
    ON f.location_id = dl.location_id;

CREATE INDEX idx_mv_dashboard_forecast_trend_tenant_date
ON ml.mv_dashboard_forecast_trend (tenant_id, forecast_date);

CREATE INDEX idx_mv_dashboard_forecast_trend_metric
ON ml.mv_dashboard_forecast_trend (tenant_id, forecast_metric, forecast_date);

-- =========================================================
-- 6) Refresh Procedure for Materialized Views
-- =========================================================
CREATE OR REPLACE PROCEDURE ml.refresh_dashboard_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW ml.mv_dashboard_location_daily;
    REFRESH MATERIALIZED VIEW ml.mv_dashboard_top_risks;
    REFRESH MATERIALIZED VIEW ml.mv_dashboard_top_actions;
    REFRESH MATERIALIZED VIEW ml.mv_dashboard_insight_briefs;
    REFRESH MATERIALIZED VIEW ml.mv_dashboard_forecast_trend;
END;
$$;

-- =========================================================
-- 7) Optional wrapper: run AI pipeline + refresh dashboard MVs
-- =========================================================
CREATE OR REPLACE PROCEDURE ml.run_daily_valora_ai_and_refresh_dashboard(
    p_as_of_date DATE DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    CALL ml.run_daily_valora_ai_logged(p_as_of_date);
    CALL ml.refresh_dashboard_materialized_views();
END;
$$;

-- =========================================================
-- 8) API Query Templates
-- Parameter convention:
-- $1 = tenant_id
-- $2 = date / metric / location_id depending on query
-- $3 = optional limit
-- =========================================================

-- 8.1 Dashboard Home
-- GET /api/dashboard/home?tenant_id=...&day=...
/*
SELECT *
FROM ml.mv_dashboard_location_daily
WHERE tenant_id = $1
  AND day = $2
ORDER BY max_severity_score DESC NULLS LAST, revenue DESC;
*/

-- 8.2 Dashboard KPI Summary
-- GET /api/dashboard/kpis?tenant_id=...&day=...
/*
SELECT
    day,
    tenant_id,
    COUNT(*) AS location_count,
    SUM(revenue) AS total_revenue,
    SUM(gross_profit) AS total_gross_profit,
    AVG(gross_margin) AS avg_gross_margin,
    AVG(food_cost_pct) AS avg_food_cost_pct,
    AVG(labor_cost_pct) AS avg_labor_cost_pct,
    AVG(prime_cost_pct) AS avg_prime_cost_pct,
    SUM(waste_amount) AS total_waste_amount,
    SUM(stockout_count) AS total_stockouts
FROM ml.mv_dashboard_location_daily
WHERE tenant_id = $1
  AND day = $2
GROUP BY day, tenant_id;
*/

-- 8.3 Top Risks
-- GET /api/dashboard/risks?tenant_id=...&day=...&limit=...
/*
SELECT
    as_of_date,
    tenant_id,
    location_id,
    location_name,
    region,
    risk_type,
    risk_probability,
    severity_score,
    severity_band,
    impact_estimate,
    top_drivers_json
FROM ml.mv_dashboard_top_risks
WHERE tenant_id = $1
  AND as_of_date = $2
ORDER BY severity_score DESC, impact_estimate DESC NULLS LAST
LIMIT $3;
*/

-- 8.4 Recommended Actions
-- GET /api/dashboard/actions?tenant_id=...&day=...
/*
SELECT
    as_of_date,
    tenant_id,
    location_id,
    location_name,
    region,
    action_code,
    priority_rank,
    expected_roi,
    difficulty_score,
    time_to_impact_days,
    rationale_json
FROM ml.mv_dashboard_top_actions
WHERE tenant_id = $1
  AND as_of_date = $2
ORDER BY priority_rank, expected_roi DESC NULLS LAST;
*/

-- 8.5 Insight Brief Cards
-- GET /api/dashboard/insights?tenant_id=...&day=...
/*
SELECT
    as_of_date,
    tenant_id,
    location_id,
    location_name,
    region,
    headline,
    summary_text,
    risk_summary_json,
    recommended_actions_json
FROM ml.mv_dashboard_insight_briefs
WHERE tenant_id = $1
  AND as_of_date = $2
ORDER BY location_name;
*/

-- 8.6 Forecast Trend
-- GET /api/dashboard/forecast?tenant_id=...&metric=...
/*
SELECT
    forecast_date,
    location_id,
    location_name,
    region,
    predicted_value,
    lower_bound,
    upper_bound
FROM ml.mv_dashboard_forecast_trend
WHERE tenant_id = $1
  AND forecast_metric = $2
ORDER BY forecast_date, location_name;
*/

-- 8.7 Single Location Detail
-- GET /api/location/detail?tenant_id=...&location_id=...&day=...
/*
SELECT *
FROM ml.mv_dashboard_location_daily
WHERE tenant_id = $1
  AND location_id = $2
  AND day = $3;
*/

-- 8.8 Single Location Risks
/*
SELECT *
FROM ml.mv_dashboard_top_risks
WHERE tenant_id = $1
  AND location_id = $2
  AND as_of_date = $3
ORDER BY severity_score DESC;
*/

-- 8.9 Single Location Actions
/*
SELECT *
FROM ml.mv_dashboard_top_actions
WHERE tenant_id = $1
  AND location_id = $2
  AND as_of_date = $3
ORDER BY priority_rank;
*/