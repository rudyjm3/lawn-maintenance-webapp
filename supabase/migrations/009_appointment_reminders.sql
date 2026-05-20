-- Phase 4: appointment reminders and job completion notifications

DO $$ BEGIN
  CREATE TYPE job_reminder_type AS ENUM ('day_before', 'completion');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS job_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reminder_type job_reminder_type NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS job_reminders_business_job_idx
  ON job_reminders (business_id, job_id);

ALTER TABLE job_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_isolation" ON job_reminders;
CREATE POLICY "business_isolation" ON job_reminders
  FOR ALL USING (business_id = auth_business_id());
