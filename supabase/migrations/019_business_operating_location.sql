-- Store the owner's operating city/area and its geocoded coordinates.
-- Used as the map center fallback before any properties are geocoded.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS operating_location TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS operating_lat      NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS operating_lng      NUMERIC DEFAULT NULL;
