-- Migration: Create materialized view for active dealerships
-- Date: 2025-08-05

-- Create materialized view for active dealerships ready for exploration
CREATE MATERIALIZED VIEW IF NOT EXISTS "active_dealerships_for_exploration" AS
SELECT 
  d.id,
  d.name,
  d.slug,
  d.base_url,
  d.used_vehicles_url,
  d.website_url,
  d.exploration_config,
  d.exploration_frequency,
  d.last_explored_at,
  d.official_brand,
  d.dealership_type,
  d.rating,
  p.name as province_name,
  p.region as province_region,
  c.name as city_name,
  -- Calculate priority based on various factors
  CASE 
    WHEN d.exploration_frequency = 'hourly' THEN 4
    WHEN d.exploration_frequency = 'daily' THEN 3
    WHEN d.exploration_frequency = 'weekly' THEN 2
    ELSE 1
  END as priority_score,
  -- Calculate staleness (hours since last exploration)
  CASE 
    WHEN d.last_explored_at IS NULL THEN 9999
    ELSE EXTRACT(EPOCH FROM (NOW() - d.last_explored_at))/3600
  END as hours_since_last_exploration,
  -- Determine if dealership should be explored based on frequency
  CASE
    WHEN d.last_explored_at IS NULL THEN true
    WHEN d.exploration_frequency = 'hourly' AND d.last_explored_at < NOW() - INTERVAL '1 hour' THEN true
    WHEN d.exploration_frequency = 'daily' AND d.last_explored_at < NOW() - INTERVAL '1 day' THEN true
    WHEN d.exploration_frequency = 'weekly' AND d.last_explored_at < NOW() - INTERVAL '1 week' THEN true
    ELSE false
  END as should_explore_now
FROM dealerships d
LEFT JOIN cities c ON d.city_id = c.id
LEFT JOIN provinces p ON d.province_id = p.id
WHERE 
  d.is_active = true 
  AND d.exploration_enabled = true
  AND (d.base_url IS NOT NULL OR d.used_vehicles_url IS NOT NULL OR d.website_url IS NOT NULL);

-- Create indexes on the materialized view for faster queries
CREATE INDEX IF NOT EXISTS "mv_dealerships_should_explore_idx" ON "active_dealerships_for_exploration" ("should_explore_now");
CREATE INDEX IF NOT EXISTS "mv_dealerships_frequency_idx" ON "active_dealerships_for_exploration" ("exploration_frequency");
CREATE INDEX IF NOT EXISTS "mv_dealerships_priority_idx" ON "active_dealerships_for_exploration" ("priority_score" DESC);
CREATE INDEX IF NOT EXISTS "mv_dealerships_staleness_idx" ON "active_dealerships_for_exploration" ("hours_since_last_exploration" DESC);
CREATE INDEX IF NOT EXISTS "mv_dealerships_brand_idx" ON "active_dealerships_for_exploration" ("official_brand");
CREATE INDEX IF NOT EXISTS "mv_dealerships_region_idx" ON "active_dealerships_for_exploration" ("province_region");

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_dealership_exploration_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW active_dealerships_for_exploration;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically refresh the view when dealerships are updated
CREATE OR REPLACE FUNCTION trigger_refresh_dealership_view()
RETURNS trigger AS $$
BEGIN
  -- Refresh the materialized view
  PERFORM refresh_dealership_exploration_view();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on relevant tables
DROP TRIGGER IF EXISTS dealerships_refresh_mv_trigger ON dealerships;
CREATE TRIGGER dealerships_refresh_mv_trigger
  AFTER INSERT OR UPDATE OR DELETE ON dealerships
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_dealership_view();

-- Initial refresh of the materialized view
SELECT refresh_dealership_exploration_view();