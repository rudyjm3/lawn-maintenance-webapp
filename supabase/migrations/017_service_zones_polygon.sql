-- Add polygon storage to service_zones as JSONB (GeoJSON outer ring [[lng,lat],...])
ALTER TABLE service_zones
  ADD COLUMN IF NOT EXISTS polygon_geojson JSONB;

CREATE INDEX IF NOT EXISTS idx_service_zones_business_has_polygon
  ON service_zones (business_id)
  WHERE polygon_geojson IS NOT NULL;
