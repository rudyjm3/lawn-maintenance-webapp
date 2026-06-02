-- Phase 4: Review request automation

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS review_token         uuid    DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS review_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS review_rating        smallint CHECK (review_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS review_text          text,
  ADD COLUMN IF NOT EXISTS review_submitted_at  timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_review_token_idx ON jobs (review_token);
