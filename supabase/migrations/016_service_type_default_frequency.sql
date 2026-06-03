ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS default_frequency_type text
    CHECK (default_frequency_type IN ('weekly', 'biweekly', 'monthly', 'custom'));

-- Backfill built-in service types by name pattern
UPDATE service_types SET default_frequency_type = 'weekly'   WHERE name ILIKE '%weekly mow%' AND default_frequency_type IS NULL;
UPDATE service_types SET default_frequency_type = 'biweekly' WHERE name ILIKE '%biweekly mow%' AND default_frequency_type IS NULL;
UPDATE service_types SET default_frequency_type = 'biweekly' WHERE name ILIKE '%biweekly trim%' AND default_frequency_type IS NULL;
UPDATE service_types SET default_frequency_type = 'monthly'  WHERE name ILIKE '%monthly%' AND default_frequency_type IS NULL;
UPDATE service_types SET default_frequency_type = 'custom'   WHERE name ILIKE '%spring cleanup%' AND default_frequency_type IS NULL;
UPDATE service_types SET default_frequency_type = 'custom'   WHERE name ILIKE '%fall cleanup%' AND default_frequency_type IS NULL;

-- Fix the existing broken recurrence rule (Biweekly Mow with weekly frequency_type)
UPDATE recurrence_rules SET frequency_type = 'biweekly' WHERE id = '22c544f6-d17a-4ae3-a5d6-e5cc988d9035';
