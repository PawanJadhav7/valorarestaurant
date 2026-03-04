CREATE OR REPLACE FUNCTION analytics.get_executive_kpis_by_location(p_asof timestamptz)
RETURNS TABLE(location_id text, location_name text, kpi_code text, kpi_value numeric, unit text)
LANGUAGE sql
AS $function$

with params as (
  select date(p_asof) as as_of_day
),

base as (
  select
    r.location_id,
    coalesce(r.location_name, r.location_id) as location_name,
    r.day::date as day,
    coalesce(r.revenue, 0)::numeric as revenue,
    coalesce(r.cogs, 0)::numeric as cogs,
    coalesce(r.labor, 0)::numeric as labor,
    coalesce(r.fixed_costs, 0)::numeric as fixed_costs,
    coalesce(r.ebit, 0)::numeric as ebit,
    coalesce(r.interest_expense, 0)::numeric as interest_expense,
    coalesce(r.orders, 0)::numeric as orders,
    coalesce(r.customers, 0)::numeric as customers,          -- ✅ ADD
    coalesce(r.avg_inventory, 0)::numeric as avg_inventory,
    coalesce(r.ar_balance, 0)::numeric as ar_balance,
    coalesce(r.ap_balance, 0)::numeric as ap_balance
  from restaurant.raw_restaurant_daily r, params p
  where r.day <= p.as_of_day
),

latest as (
  select distinct on (location_id)
    location_id,
    location_name,
    day,
    revenue,
    cogs,
    labor,
    fixed_costs,
    ebit,
    interest_expense,
    orders,
    customers,                                              -- ✅ ADD
    avg_inventory,
    ar_balance,
    ap_balance
  from base
  order by location_id, day desc
),

win30 as (
  select
    b.location_id,
    b.location_name,
    sum(b.revenue) as revenue_30,
    sum(b.cogs) as cogs_30,
    avg(b.avg_inventory) as avg_inventory_30,
    avg(b.ar_balance) as ar_balance_30,
    avg(b.ap_balance) as ap_balance_30
  from base b, params p
  where b.day > (p.as_of_day - 30)
    and b.day <= p.as_of_day
  group by 1,2
),

calc as (
  select
    l.location_id,
    l.location_name,

    l.revenue as net_sales,
    l.cogs,
    l.labor,
    l.fixed_costs,
    (l.revenue - l.cogs) as gross_profit,
    (l.cogs + l.labor) as prime_cost,

    l.orders,                                               -- ✅ ADD
    l.customers,                                            -- ✅ ADD

    -- Percent KPIs in 0..100
    case when l.revenue = 0 then 0 else round((l.revenue - l.cogs) / l.revenue * 100, 2) end as gross_margin_pct,
    case when l.revenue = 0 then 0 else round(l.cogs / l.revenue * 100, 2) end as food_cost_pct,
    case when l.revenue = 0 then 0 else round(l.labor / l.revenue * 100, 2) end as labor_cost_pct,
    case when l.revenue = 0 then 0 else round((l.cogs + l.labor) / l.revenue * 100, 2) end as prime_cost_pct,

    -- Coverage / break-even
    case
      when l.fixed_costs = 0 then null
      else round((l.revenue - l.cogs) / nullif(l.fixed_costs, 0), 2)
    end as fixed_cost_coverage_ratio,

    case
      when l.revenue = 0 then null
      else round(l.fixed_costs / nullif(((l.revenue - l.cogs) / nullif(l.revenue, 0)), 0), 2)
    end as break_even_revenue,

    case
      when l.revenue = 0 then null
      else round((l.revenue - (l.cogs + l.labor + l.fixed_costs)) / nullif(l.revenue, 0) * 100, 2)
    end as safety_margin_pct,

    -- Leverage
    l.ebit,
    l.interest_expense,
    case when l.interest_expense = 0 then null else round(l.ebit / l.interest_expense, 2) end as interest_coverage_ratio,

    -- 30-day working capital days
    w.revenue_30,
    w.cogs_30,
    w.avg_inventory_30,
    w.ar_balance_30,
    w.ap_balance_30,

    case when w.cogs_30 = 0 then null else round(w.avg_inventory_30 / (w.cogs_30 / 30.0), 2) end as dio_days,
    case when w.revenue_30 = 0 then null else round(w.ar_balance_30 / (w.revenue_30 / 30.0), 2) end as ar_days,
    case when w.cogs_30 = 0 then null else round(w.ap_balance_30 / (w.cogs_30 / 30.0), 2) end as ap_days,
    case
      when w.cogs_30 = 0 or w.revenue_30 = 0 then null
      else round(
        (w.avg_inventory_30 / (w.cogs_30 / 30.0)) +
        (w.ar_balance_30 / (w.revenue_30 / 30.0)) -
        (w.ap_balance_30 / (w.cogs_30 / 30.0)),
      2)
    end as cash_conversion_cycle_days

  from latest l
  left join win30 w using (location_id, location_name)
)

select location_id, location_name, 'NET_SALES', net_sales, 'USD' from calc
union all select location_id, location_name, 'COGS', cogs, 'USD' from calc
union all select location_id, location_name, 'LABOR', labor, 'USD' from calc
union all select location_id, location_name, 'FIXED_COSTS', fixed_costs, 'USD' from calc
union all select location_id, location_name, 'GROSS_PROFIT', gross_profit, 'USD' from calc
union all select location_id, location_name, 'PRIME_COST', prime_cost, 'USD' from calc

union all select location_id, location_name, 'GROSS_MARGIN', gross_margin_pct, '%' from calc
union all select location_id, location_name, 'FOOD_COST_PCT', food_cost_pct, '%' from calc
union all select location_id, location_name, 'LABOR_COST_PCT', labor_cost_pct, '%' from calc
union all select location_id, location_name, 'PRIME_COST_PCT', prime_cost_pct, '%' from calc

union all select location_id, location_name, 'FIXED_COST_COVERAGE_RATIO', fixed_cost_coverage_ratio, 'ratio' from calc
union all select location_id, location_name, 'BREAK_EVEN_REVENUE', break_even_revenue, 'USD' from calc
union all select location_id, location_name, 'SAFETY_MARGIN_PCT', safety_margin_pct, '%' from calc

union all select location_id, location_name, 'EBIT', ebit, 'USD' from calc
union all select location_id, location_name, 'INTEREST_EXPENSE', interest_expense, 'USD' from calc
union all select location_id, location_name, 'INTEREST_COVERAGE_RATIO', interest_coverage_ratio, 'ratio' from calc

union all select location_id, location_name, 'DAYS_INVENTORY_ON_HAND', dio_days, 'days' from calc
union all select location_id, location_name, 'AR_DAYS', ar_days, 'days' from calc
union all select location_id, location_name, 'AP_DAYS', ap_days, 'days' from calc
union all select location_id, location_name, 'CASH_CONVERSION_CYCLE', cash_conversion_cycle_days, 'days' from calc

union all select location_id, location_name, 'ORDERS', orders, 'count' from calc
union all select location_id, location_name, 'CUSTOMERS', customers, 'count' from calc
union all select location_id, location_name, 'ARPU',
  case when customers = 0 then null else round(net_sales / customers, 2) end, 'USD'
from calc;

$function$;