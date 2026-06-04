-- Add polygon coordinates to service_zones (stored as ordered [[lat, lng], ...] array)
ALTER TABLE service_zones ADD COLUMN IF NOT EXISTS coordinates jsonb;

-- Link properties to a service zone
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES service_zones(id) ON DELETE SET NULL;
