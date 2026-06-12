-- Weather reschedule request tracking.
-- One row per job per reschedule event. Client responds via token link.

CREATE TABLE reschedule_requests (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id        uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  job_id             uuid NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  token              uuid NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  original_date      date NOT NULL,
  proposed_date      date NOT NULL,
  -- pending | confirmed | alternative_requested
  status             text NOT NULL DEFAULT 'pending',
  client_chosen_date date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  responded_at       timestamptz,
  UNIQUE (job_id, original_date)
);

CREATE INDEX reschedule_requests_business_id_idx ON reschedule_requests (business_id);
CREATE INDEX reschedule_requests_token_idx       ON reschedule_requests (token);

ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Owners can view their own business's requests
CREATE POLICY "business_isolation" ON reschedule_requests
  FOR ALL USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());
