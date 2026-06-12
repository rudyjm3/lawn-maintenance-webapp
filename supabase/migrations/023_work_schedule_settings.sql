-- Work schedule settings stored on businesses (per-tenant)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS schedule_start_time         TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS schedule_end_time           TEXT NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS schedule_lunch_start_time   TEXT NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS schedule_lunch_duration_min INTEGER NOT NULL DEFAULT 60;
