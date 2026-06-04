-- Phase 4: Seasonal campaigns + marketing opt-out

CREATE TABLE IF NOT EXISTS campaigns (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subject         text        NOT NULL,
  body            text        NOT NULL,
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  recipient_count integer     NOT NULL DEFAULT 0,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_business_id_idx ON campaigns (business_id, created_at DESC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_isolation" ON campaigns
  FOR ALL USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS marketing_opt_out boolean NOT NULL DEFAULT false;
